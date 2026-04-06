import { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, Bookmark, BookmarkCheck, MoreVertical, Archive, ArchiveRestore } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const ContentActions = ({ type, itemId, authorId, author, onDelete, onEdit }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [archived, setArchived] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const menuRef = useRef(null);
  
  // Check if user can manage this content (including Artix Research content for luisflores01)
  useEffect(() => {
    if (!user || !authorId) {
      setIsAuthor(false);
      return;
    }
    
    // If user is the author, allow
    if (user.id === authorId) {
      setIsAuthor(true);
      return;
    }
    
    // If user is luisflores01 and content was published by Artix Research, allow
    if (user.username === 'luisflores01') {
      const authorUsername = author?.username || author?.name;
      if (authorUsername === 'artixresearch' || authorUsername === 'artix-research' || authorUsername === 'Artix Research') {
        setIsAuthor(true);
        return;
      }
    }
    
    setIsAuthor(false);
  }, [user, authorId, author]);

  useEffect(() => {
    if (user && itemId) {
      checkSavedStatus();
      if (isAuthor) {
        checkArchivedStatus();
      }
    }
  }, [user, itemId, isAuthor]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const checkSavedStatus = async () => {
    try {
      const params = new URLSearchParams();
      if (type === 'article') params.append('articleId', itemId);
      if (type === 'research') params.append('researchId', itemId);
      if (type === 'post') params.append('postId', itemId);
      if (type === 'event') params.append('eventId', itemId);

      const response = await fetch(`${BACKEND_URL}/api/saved/check?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setSaved(data.saved);
      }
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const checkArchivedStatus = async () => {
    try {
      const endpoint = type === 'article' ? 'articles' : type === 'post' ? 'blog' : type === 'research' ? 'research' : 'events';
      const response = await fetch(`${BACKEND_URL}/api/${endpoint}/${itemId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        const item = data[type === 'article' ? 'article' : type === 'post' ? 'post' : type === 'research' ? 'research' : 'event'];
        if (type === 'article' || type === 'research') {
          setArchived(item.status === 'archived');
        } else {
          setArchived(item.archived || false);
        }
      }
    } catch (error) {
      console.error('Error checking archived status:', error);
    }
  };

  const handleArchive = async () => {
    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const endpoint = type === 'article' ? 'articles' : type === 'post' ? 'blog' : type === 'research' ? 'research' : 'events';
      const response = await fetch(`${BACKEND_URL}/api/${endpoint}/${itemId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify({ archived: !archived })
      });

      const data = await response.json();
      if (data.ok) {
        setArchived(!archived);
        if (onDelete) onDelete(); // Refresh list
      }
    } catch (error) {
      console.error('Error archiving item:', error);
    }
  };

  const handleSave = async () => {
    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const body = {};
      if (type === 'article') body.articleId = itemId;
      if (type === 'research') body.researchId = itemId;
      if (type === 'post') body.postId = itemId;
      if (type === 'event') body.eventId = itemId;

      const response = await fetch(`${BACKEND_URL}/api/saved`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.ok) {
        setSaved(data.saved);
      }
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleDelete = async () => {
    const typeNames = {
      article: 'artículo',
      research: 'investigación',
      post: 'post',
      event: 'evento'
    };
    if (!confirm(`¿Estás seguro de eliminar este ${typeNames[type] || 'elemento'}?`)) {
      return;
    }

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const endpoint = type === 'article' ? 'articles' : type === 'post' ? 'blog' : type === 'research' ? 'research' : 'events';
      const response = await fetch(`${BACKEND_URL}/api/${endpoint}/${itemId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.ok && onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 glass-card shadow-xl z-50">
          <div className="py-1">
            <button
              onClick={() => {
                handleSave();
                setShowMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              {saved ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  Guardado
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
            {isAuthor && (
              <>
                <button
                  onClick={() => {
                    if (onEdit) onEdit();
                    else {
                      const editPath = type === 'article' ? `/articles/${itemId}/edit` :
                                      type === 'post' ? `/blog/${itemId}/edit` :
                                      type === 'research' ? `/research/${itemId}/edit` :
                                      `/events/${itemId}/edit`;
                      navigate(editPath);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    handleArchive();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  {archived ? (
                    <>
                      <ArchiveRestore className="w-4 h-4" />
                      Desarchivar
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Archivar
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentActions;

