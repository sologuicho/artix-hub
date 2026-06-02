import { useState, useEffect } from 'react';
import { MessageCircle, Send, MoreVertical, Reply, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { BACKEND_URL } from '../config/client';

const CommentSection = ({ postId, articleId, researchId, discussionId, eventId }) => {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId, articleId, researchId, discussionId, eventId]);

  const fetchComments = async () => {
    try {
      const params = new URLSearchParams();
      if (postId) params.append('postId', postId);
      if (articleId) params.append('articleId', articleId);
      if (researchId) params.append('researchId', researchId);
      if (discussionId) params.append('discussionId', discussionId);
      if (eventId) params.append('eventId', eventId);

      const response = await fetch(`${BACKEND_URL}/api/comments?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated()) return;

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const response = await fetch(`${BACKEND_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          postId: postId || null,
          articleId: articleId || null,
          researchId: researchId || null,
          discussionId: discussionId || null,
          eventId: eventId || null,
          content: newComment.trim()
        })
      });

      const data = await response.json();
      if (data.ok) {
        setComments(prev => [data.comment, ...prev]);
        setNewComment('');
        // If showing only first 3 and we add a new comment, keep showing first 3
        if (!showAllComments && comments.length >= 3) {
          setShowAllComments(false);
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim() || !isAuthenticated()) return;

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const response = await fetch(`${BACKEND_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          postId: postId || null,
          articleId: articleId || null,
          researchId: researchId || null,
          discussionId: discussionId || null,
          eventId: eventId || null,
          parentId,
          content: replyText.trim()
        })
      });

      const data = await response.json();
      if (data.ok) {
        // Update parent comment with new reply
        setComments(prev => prev.map(comment => 
          comment.id === parentId
            ? { ...comment, replies: [...(comment.replies || []), data.comment] }
            : comment
        ));
        setReplyText('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) return;

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const response = await fetch(`${BACKEND_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  };

  const CommentItem = ({ comment, depth = 0 }) => (
    <div className={`${depth > 0 ? 'ml-8 mt-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
      <div className="flex items-start gap-3">
        {comment.author?.avatar ? (
          <img
            src={comment.author.avatar}
            alt={comment.author.name}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {comment.author?.name?.charAt(0) || 'U'}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {comment.author?.name || comment.author?.username || 'Usuario'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(comment.createdAt)}
            </span>
            {comment.parent && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                · Respondiendo a {comment.parent.author?.name || comment.parent.author?.username}
              </span>
            )}
          </div>
          {editingId === comment.id ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full glass-input text-gray-900 dark:text-gray-100 text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    // TODO: Implement update
                    setEditingId(null);
                    setEditText('');
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditText('');
                  }}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                {comment.content}
              </p>
              <div className="flex items-center gap-3">
                {isAuthenticated() && depth < 2 && (
                  <button
                    onClick={() => {
                      setReplyingTo(comment.id);
                      setReplyText('');
                    }}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <Reply className="w-3 h-3" />
                    Responder
                  </button>
                )}
                {isAuthenticated() && (user?.id === comment.authorId || user?.role === 'admin') && (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditText(comment.content);
                      }}
                      className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reply Form */}
      {replyingTo === comment.id && (
        <div className="mt-3 ml-11">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="w-full glass-input text-gray-900 dark:text-gray-100 text-sm mb-2"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmitReply(comment.id)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              Responder
            </button>
            <button
              onClick={() => {
                setReplyingTo(null);
                setReplyText('');
              }}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        Comentarios ({comments.length})
      </h3>

      {/* Comment Form */}
      {isAuthenticated() ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="w-full glass-input text-gray-900 dark:text-gray-100 text-sm"
                rows={3}
              />
              <button
                type="submit"
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Comentar
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <a href="/auth" className="text-blue-600 dark:text-blue-400 hover:underline">
              Inicia sesión
            </a> para comentar
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No hay comentarios aún. ¡Sé el primero en comentar!
          </p>
        ) : (
          <>
            {/* Show first 3 comments by default, or all if showAllComments is true */}
            {(showAllComments ? comments : comments.slice(0, 3)).map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
            
            {/* Show "View more" button if there are more than 3 comments */}
            {comments.length > 3 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setShowAllComments(!showAllComments)}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  {showAllComments ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Ver menos comentarios
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Ver todos los comentarios ({comments.length})
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommentSection;



