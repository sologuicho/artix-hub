import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const RichTextEditorWithMentions = ({
  value = '',
  onChange,
  placeholder = 'Escribe aquí...',
  className = '',
  onMentionsChange
}) => {
  const quillRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const dropdownRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering Quill
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUsers = useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setUsers([]);
      setShowDropdown(false);
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok && data.users) {
        setUsers(data.users);
        setShowDropdown(data.users.length > 0);
        setSelectedUserIndex(0);
      } else {
        setUsers([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setShowDropdown(false);
    }
  }, []);

  const insertMention = useCallback((user) => {
    if (!quillRef.current) return;

    const quill = quillRef.current.getEditor();
    if (!quill) return;

    const selection = quill.getSelection(true);
    if (!selection) return;

    const text = quill.getText();
    const textBeforeCursor = text.substring(0, selection.index);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) return;

    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    const spaceIndex = textAfterAt.indexOf(' ');
    const newlineIndex = textAfterAt.indexOf('\n');
    const endIndex = spaceIndex !== -1 && newlineIndex !== -1
      ? Math.min(spaceIndex, newlineIndex)
      : spaceIndex !== -1
        ? spaceIndex
        : newlineIndex !== -1
          ? newlineIndex
          : textAfterAt.length;

    const mentionText = `@${user.username || user.name}`;
    const startPos = lastAtIndex;
    const endPos = lastAtIndex + 1 + endIndex;

    quill.deleteText(startPos, endPos - startPos);
    quill.insertText(startPos, mentionText);
    quill.insertText(startPos + mentionText.length, ' ');
    quill.setSelection(startPos + mentionText.length + 1);

    // Update parent state
    const newContent = quill.root.innerHTML;
    if (onChange) {
      onChange(newContent);
    }

    // Extract mentions
    if (onMentionsChange) {
      const allText = quill.getText();
      const mentionRegex = /@(\w+)/g;
      const matches = allText.match(mentionRegex);
      const mentions = matches ? matches.map(m => m.substring(1)) : [];
      onMentionsChange(mentions);
    }

    setShowDropdown(false);
  }, [onChange, onMentionsChange]);

  // Set up mention detection
  useEffect(() => {
    if (!mounted || !quillRef.current) return;

    const quill = quillRef.current.getEditor();
    if (!quill) return;

    const handleTextChange = () => {
      const selection = quill.getSelection(true);
      if (!selection) {
        setShowDropdown(false);
        return;
      }

      const text = quill.getText();
      const textBeforeCursor = text.substring(0, selection.index);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex === -1) {
        setShowDropdown(false);
        return;
      }

      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      const newlineIndex = textAfterAt.indexOf('\n');
      const endIndex = spaceIndex !== -1 && newlineIndex !== -1
        ? Math.min(spaceIndex, newlineIndex)
        : spaceIndex !== -1
          ? spaceIndex
          : newlineIndex !== -1
            ? newlineIndex
            : textAfterAt.length;

      const query = textAfterAt.substring(0, endIndex);

      if (query.length >= 0 && !query.includes(' ') && !query.includes('\n')) {
        fetchUsers(query);
      } else {
        setShowDropdown(false);
      }
    };

    quill.on('text-change', handleTextChange);
    quill.on('selection-change', handleTextChange);

    return () => {
      quill.off('text-change', handleTextChange);
      quill.off('selection-change', handleTextChange);
    };
  }, [mounted, fetchUsers]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        quillRef.current &&
        !quillRef.current.getEditor().root.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Handle keyboard navigation - only when editor has focus
  const handleKeyDown = useCallback((e) => {
    // Only handle keys if dropdown is open and editor has focus
    if (!showDropdown || users.length === 0) return;

    // Check if the event is coming from the editor
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    if (!quill || !quill.hasFocus()) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedUserIndex(prev => (prev + 1) % users.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedUserIndex(prev => (prev - 1 + users.length) % users.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (users[selectedUserIndex]) {
        insertMention(users[selectedUserIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
    }
  }, [showDropdown, users, selectedUserIndex, insertMention]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ],
    },
    clipboard: {
      matchVisual: false,
    }
  }), []);

  const formats = useMemo(() => [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ], []);

  const handleChange = useCallback((content) => {
    if (onChange) {
      onChange(content);
    }
  }, [onChange]);

  // Set up keyboard handler on the editor container
  useEffect(() => {
    if (!mounted || !quillRef.current) return;

    const quill = quillRef.current.getEditor();
    if (!quill) return;

    const editorElement = quill.root;

    const handleEditorKeyDown = (e) => {
      if (!showDropdown || users.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedUserIndex(prev => (prev + 1) % users.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedUserIndex(prev => (prev - 1 + users.length) % users.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (users[selectedUserIndex]) {
          insertMention(users[selectedUserIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowDropdown(false);
      }
    };

    editorElement.addEventListener('keydown', handleEditorKeyDown);

    return () => {
      editorElement.removeEventListener('keydown', handleEditorKeyDown);
    };
  }, [mounted, showDropdown, users, selectedUserIndex, insertMention]);

  // Render loading state if not mounted
  if (!mounted) {
    return (
      <div className={`rich-text-editor-loading ${className}`} style={{ minHeight: '300px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500 dark:text-gray-400">Cargando editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rich-text-editor-wrapper relative ${className}`}>
      <div className="rich-text-editor">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value || ''}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          bounds="self"
          preserveWhitespace={true}
        />
      </div>

      {showDropdown && users.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full glass-card shadow-xl max-h-60 overflow-y-auto"
          style={{ top: '100%', left: 0 }}
        >
          {users.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className={`w-full p-3 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 text-left transition-colors ${index === selectedUserIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {user.name || 'Usuario'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{user.username || 'usuario'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .rich-text-editor-wrapper {
          width: 100%;
        }
        .rich-text-editor {
          width: 100%;
        }
        .rich-text-editor .ql-container {
          min-height: 300px;
          font-size: 16px;
          border-radius: 0 0 8px 8px;
        }
        .rich-text-editor .ql-editor {
          min-height: 300px;
          padding: 16px;
          color: #111827;
        }
        .rich-text-editor .ql-toolbar {
          border-radius: 8px 8px 0 0;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          padding: 12px;
        }
        .rich-text-editor .ql-container {
          border: 1px solid #e5e7eb;
          border-top: none;
          background: #ffffff;
        }
        .rich-text-editor .ql-stroke {
          stroke: #374151;
        }
        .rich-text-editor .ql-fill {
          fill: #374151;
        }
        .rich-text-editor .ql-picker-label {
          color: #374151;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        .rich-text-editor .ql-toolbar button:hover,
        .rich-text-editor .ql-toolbar button.ql-active {
          color: #3b82f6;
        }
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #3b82f6;
        }
        .dark .rich-text-editor .ql-toolbar {
          background: transparent;
          border-color: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .dark .rich-text-editor .ql-container {
          background: transparent;
          border: none;
        }
        .dark .rich-text-editor .ql-editor {
          color: #f9fafb;
        }
        .dark .rich-text-editor .ql-stroke {
          stroke: #9ca3af;
        }
        .dark .rich-text-editor .ql-fill {
          fill: #9ca3af;
        }
        .dark .rich-text-editor .ql-picker-label {
          color: #e5e7eb;
        }
        .dark .rich-text-editor .ql-editor.ql-blank::before {
          color: #6b7280;
          font-style: italic;
        }
        .dark .rich-text-editor .ql-toolbar button:hover,
        .dark .rich-text-editor .ql-toolbar button.ql-active {
          color: #60a5fa;
        }
        .dark .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .dark .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #60a5fa;
        }
        /* Scrollbar styles */
        .dark .rich-text-editor .ql-editor::-webkit-scrollbar {
          width: 8px;
        }
        .dark .rich-text-editor .ql-editor::-webkit-scrollbar-track {
          background: transparent;
        }
        .dark .rich-text-editor .ql-editor::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .dark .rich-text-editor .ql-editor::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default RichTextEditorWithMentions;
