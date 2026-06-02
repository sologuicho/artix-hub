import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MessageCircle } from 'lucide-react';
import ReactionButtons from '../components/ReactionButtons';
import CommentSection from '../components/CommentSection';
import ShareModal from '../components/ShareModal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const getCsrfToken = () => {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === 'csrf') return v;
  }
  return null;
};

const EMPTY_REACTIONS = {
  like:  { count: 0, active: false },
  heart: { count: 0, active: false },
  clap:  { count: 0, active: false },
  laugh: { count: 0, active: false },
};

const PostRow = ({ post, onReaction, reactions, onToggleComments, showComments }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const plainContent = post.content
    ? post.content.replace(/<[^>]*>/g, '').slice(0, 200)
    : '';

  return (
    <article style={{ paddingTop: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
      {/* Author row */}
      <div className="flex items-center gap-3 mb-3">
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              alt={post.author.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span className="font-sans" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              {(post.author?.name || 'A').charAt(0)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm font-medium" style={{ color: 'var(--text)' }}>
            {post.author?.name || 'Anónimo'}
          </span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
            {formatDate(post.createdAt)}
          </span>
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <h3 className="font-display mb-2" style={{ fontSize: '1.375rem', lineHeight: 1.25, color: 'var(--text)' }}>
          {post.title}
        </h3>
      )}

      {/* Content preview */}
      {plainContent && (
        <p className="font-sans text-sm mb-4" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
          {plainContent}{post.content?.replace(/<[^>]*>/g, '').length > 200 ? '…' : ''}
        </p>
      )}

      {/* Media */}
      {(post.imageUrl || post.coverUrl) && (
        <div style={{ marginBottom: '1rem', overflow: 'hidden', maxHeight: '320px' }}>
          <img
            src={post.imageUrl || post.coverUrl}
            alt="Post media"
            style={{ width: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {post.tags.map((tag, idx) => (
            <span key={idx} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 mt-3">
        <ReactionButtons
          reactions={reactions || EMPTY_REACTIONS}
          onReaction={onReaction}
        />
        <button
          onClick={() => onToggleComments(post.id)}
          className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider"
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}
        >
          <MessageCircle size={12} />
          {post._count?.comments || 0}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <CommentSection postId={post.id} />
        </div>
      )}
    </article>
  );
};

const Blog = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [reactions, setReactions] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [shareModal, setShareModal] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, [query]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.append('search', query);

      const response = await fetch(`${BACKEND_URL}/api/blog?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && data.posts) {
        setPosts(data.posts);
        const init = {};
        data.posts.forEach(p => { init[p.id] = { ...EMPTY_REACTIONS }; });
        setReactions(init);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (postId, type) => {
    if (!isAuthenticated()) return;
    const snap = (reactions[postId] || EMPTY_REACTIONS)[type] || { count: 0, active: false };
    setReactions(prev => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || EMPTY_REACTIONS),
        [type]: { count: snap.active ? snap.count - 1 : snap.count + 1, active: !snap.active },
      },
    }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ postId, type }),
      });
      const data = await res.json();
      if (!data.ok) {
        setReactions(prev => ({ ...prev, [postId]: { ...(prev[postId] || EMPTY_REACTIONS), [type]: snap } }));
      }
    } catch (_) {
      setReactions(prev => ({ ...prev, [postId]: { ...(prev[postId] || EMPTY_REACTIONS), [type]: snap } }));
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-16">
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 flex-wrap"
          style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}
        >
          <div>
            <span className="category-tag">Comunidad</span>
            <h1
              className="font-display mt-2"
              style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text)', lineHeight: 1.1 }}
            >
              Blog
            </h1>
            <p className="font-sans mt-3" style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '520px' }}>
              Reflexiones, ideas y experiencias de nuestra comunidad.
            </p>
          </div>
          {isAuthenticated() && (
            <button
              onClick={() => navigate('/blog/create')}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end' }}
            >
              <Plus size={14} />
              Crear Post
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-8" style={{ maxWidth: '480px' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
          />
          <input
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Buscar posts..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Posts */}
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div style={{
              width: 28, height: 28,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              {query ? `Sin resultados para "${query}"` : 'No hay posts todavía'}
            </p>
            {isAuthenticated() && !query && (
              <button onClick={() => navigate('/blog/create')} className="btn btn-outline mt-4">
                Crear el primer post
              </button>
            )}
          </div>
        ) : (
          <div>
            {posts.map(post => (
              <PostRow
                key={post.id}
                post={post}
                reactions={reactions[post.id]}
                onReaction={(type) => handleReaction(post.id, type)}
                onToggleComments={toggleComments}
                showComments={expandedComments[post.id]}
              />
            ))}
          </div>
        )}
      </div>

      {shareModal && (
        <ShareModal post={shareModal} onClose={() => setShareModal(null)} />
      )}
    </div>
  );
};

export default Blog;
