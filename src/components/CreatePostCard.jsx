import { useState, useRef, useEffect } from 'react';
import { Video, Image as ImageIcon, FileText, X, Send, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// import RichTextEditorWithMentions from './RichTextEditorWithMentions';
// import TagSelector from './TagSelector';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const CreatePostCard = ({ onPostCreated }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [documents, setDocuments] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const documentInputRef = useRef(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isExpanded]);

  const handleCoverSelect = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // Simplified: Direct FileReader to avoid dynamic import issues for now
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUrl(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type === 'application/pdf' || file.type.includes('document') || file.type.includes('msword') || file.type.includes('wordprocessingml')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setDocuments(prev => [...prev, { name: file.name, url: reader.result, type: file.type }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !coverUrl && !imageUrl && !videoUrl && documents.length === 0) {
      setValidationMessage('Debes agregar contenido o al menos un archivo');
      return;
    }

    setValidationMessage('');
    setIsSubmitting(true);

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const extractedMentions = extractMentions(content);
      const documentUrls = documents.map(doc => doc.url);

      const response = await fetch(`${BACKEND_URL}/api/blog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          title: title || null,
          content: content.trim(),
          category: category || 'General',
          tags: tags || [],
          coverUrl: coverUrl || null,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          documents: documentUrls,
          mentions: extractedMentions
        })
      });

      const data = await response.json();
      if (data.ok) {
        setContent('');
        setTitle('');
        setCategory('');
        setTags([]);
        setCoverUrl('');
        setImageUrl('');
        setVideoUrl('');
        setDocuments([]);
        setMentions([]);
        setIsExpanded(false);
        setValidationMessage('');
        if (onPostCreated) onPostCreated();
      } else {
        setValidationMessage(data.message || 'Error al crear el post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setValidationMessage('Error al crear el post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-[#0A0A0B]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm border border-white/10">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}

          <button
            onClick={() => setIsExpanded(true)}
            className="flex-1 text-left px-4 py-2.5 rounded-full bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10 hover:text-gray-200 transition-all text-sm font-medium"
          >
            Start a post...
          </button>
        </div>
      </div>

      {/* Modal Overlay */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="bg-[#0A0A0B] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/10">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white leading-none mb-1">
                    {user?.name || 'Usuario'}
                  </h3>
                  <p className="text-xs text-blue-400 font-medium">Author</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {/* Title Input */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titulo (opcional)"
                  className="w-full bg-transparent border-none text-xl font-bold text-white placeholder-gray-600 focus:ring-0 p-0"
                />

                {/* Editor Replacement (Textarea) */}
                <div className="min-h-[150px]">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="¿Qué quieres compartir? (Editor simple activo)"
                    className="w-full h-40 bg-transparent text-white border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-blue-500/50 resize-none glass-input"
                  />
                </div>

                {/* Tags Placeholder */}
                <div>
                  {/* TagSelector disabled for stability */}
                </div>

                {/* Previews */}
                {(coverUrl || imageUrl || videoUrl || documents.length > 0) && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    {/* Cover Preview */}
                    {coverUrl && (
                      <div className="relative group rounded-xl overflow-hidden border border-white/10">
                        <img src={coverUrl} alt="Cover" className="w-full max-h-40 object-cover" />
                        <button type="button" onClick={() => setCoverUrl('')} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"><X size={16} /></button>
                      </div>
                    )}
                    {/* Image Preview */}
                    {imageUrl && (
                      <div className="relative group rounded-xl overflow-hidden border border-white/10">
                        <img src={imageUrl} alt="Image" className="w-full max-h-40 object-cover" />
                        <button type="button" onClick={() => setImageUrl('')} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"><X size={16} /></button>
                      </div>
                    )}
                  </div>
                )}

                {validationMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-sm text-red-400 text-center">{validationMessage}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer / Actions */}
              <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white"><Upload size={20} /></button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-white"><ImageIcon size={20} /></button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>

              {/* Hidden Inputs */}
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
              <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={handleDocumentSelect} multiple className="hidden" />
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatePostCard;
