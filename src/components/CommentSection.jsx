import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const getCsrf = () => {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === 'csrf') return v;
  }
  return '';
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const Avatar = ({ author, size = 28 }) => (
  author?.avatar ? (
    <img
      src={author.avatar}
      alt=""
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: Math.round(size * 0.4) + 'px', color: 'var(--muted)', fontWeight: 600 }}>
        {(author?.name || author?.username || '?')[0].toUpperCase()}
      </span>
    </div>
  )
);

const ActionBtn = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="font-sans text-xs transition-colors duration-150"
    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
  >
    {children}
  </button>
);

const CommentSection = ({ postId, articleId, researchId, discussionId, eventId }) => {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { fetchComments(); }, [postId, articleId, researchId, discussionId, eventId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (postId)      p.append('postId',      postId);
      if (articleId)   p.append('articleId',   articleId);
      if (researchId)  p.append('researchId',  researchId);
      if (discussionId) p.append('discussionId', discussionId);
      if (eventId)     p.append('eventId',     eventId);
      const res  = await fetch(`${BACKEND_URL}/api/comments?${p}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setComments(data.comments || []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const postComment = async (extra) => {
    const res = await fetch(`${BACKEND_URL}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
      credentials: 'include',
      body: JSON.stringify({
        postId: postId || null,
        articleId: articleId || null,
        researchId: researchId || null,
        discussionId: discussionId || null,
        eventId: eventId || null,
        ...extra,
      }),
    });
    return res.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || !isAuthenticated()) return;
    const data = await postComment({ content: text });
    if (data.ok) { setComments(prev => [data.comment, ...prev]); setNewComment(''); }
  };

  const handleReply = async (parentId) => {
    const text = replyText.trim();
    if (!text || !isAuthenticated()) return;
    const data = await postComment({ parentId, content: text });
    if (data.ok) {
      setComments(prev => prev.map(c =>
        c.id === parentId ? { ...c, replies: [...(c.replies || []), data.comment] } : c
      ));
      setReplyText('');
      setReplyingTo(null);
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    const res  = await fetch(`${BACKEND_URL}/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': getCsrf() },
      credentials: 'include',
    });
    const data = await res.json();
    if (data.ok) setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const canModify = (comment) =>
    user?.id === comment.authorId || user?.id === comment.author?.id || user?.role === 'ADMIN';

  const CommentItem = ({ comment, depth = 0 }) => (
    <div
      style={{
        marginLeft: depth > 0 ? '2rem' : 0,
        paddingLeft: depth > 0 ? '1rem' : 0,
        borderLeft: depth > 0 ? '1px solid var(--border)' : 'none',
        marginTop: depth > 0 ? '0.75rem' : 0,
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar author={comment.author} size={28} />
        <div className="flex-1 min-w-0">
          {/* Author + time */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-sans font-medium text-sm" style={{ color: 'var(--text)' }}>
              {comment.author?.name || comment.author?.username || 'Usuario'}
            </span>
            <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
              {timeAgo(comment.createdAt)}
            </span>
          </div>

          {/* Text */}
          <p className="font-sans text-sm mb-2" style={{ color: 'var(--text)', lineHeight: 1.6 }}>
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated() && depth < 2 && (
              <ActionBtn onClick={() => { setReplyingTo(comment.id); setReplyText(''); }}>
                Responder
              </ActionBtn>
            )}
            {isAuthenticated() && canModify(comment) && (
              <ActionBtn onClick={() => handleDelete(comment.id)}>
                Eliminar
              </ActionBtn>
            )}
          </div>
        </div>
      </div>

      {/* Reply form */}
      {replyingTo === comment.id && (
        <div style={{ marginLeft: '2.5rem', marginTop: '0.75rem' }}>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="input-field w-full"
            rows={2}
            style={{ marginBottom: '0.5rem' }}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleReply(comment.id)}
              className="btn btn-primary"
              style={{ fontSize: '0.6875rem', padding: '0.375rem 1rem' }}
            >
              Responder
            </button>
            <ActionBtn onClick={() => { setReplyingTo(null); setReplyText(''); }}>
              Cancelar
            </ActionBtn>
          </div>
        </div>
      )}

      {/* Nested replies */}
      {comment.replies?.map(reply => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: 22, height: 22, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Count */}
      <p className="font-sans text-xs uppercase tracking-wider mb-6" style={{ color: 'var(--muted)' }}>
        {comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}
      </p>

      {/* Form */}
      {isAuthenticated() ? (
        <form onSubmit={handleSubmit} className="flex items-start gap-3 mb-8">
          <Avatar author={user} size={32} />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="input-field w-full"
              rows={3}
              style={{ marginBottom: '0.5rem' }}
            />
            <button type="submit" className="btn btn-primary" style={{ fontSize: '0.6875rem', padding: '0.5rem 1.25rem' }}>
              Comentar
            </button>
          </div>
        </form>
      ) : (
        <div style={{ padding: '1rem', backgroundColor: 'var(--surface)', marginBottom: '1.5rem' }}>
          <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
            <a href="/auth" style={{ color: 'var(--accent)' }}>Inicia sesión</a> para comentar.
          </p>
        </div>
      )}

      {/* List */}
      {comments.length === 0 ? (
        <p className="font-sans text-sm" style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>
          Sé el primero en comentar.
        </p>
      ) : (
        <div className="flex flex-col" style={{ gap: '1.5rem' }}>
          {(showAll ? comments : comments.slice(0, 4)).map(c => (
            <div key={c.id} style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <CommentItem comment={c} />
            </div>
          ))}
          {comments.length > 4 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', alignSelf: 'flex-start' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
            >
              {showAll ? 'Ver menos' : `Ver todos (${comments.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
