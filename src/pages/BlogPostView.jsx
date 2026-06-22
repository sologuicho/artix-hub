import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, Clock, User, Repeat2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import ContentActions from '../components/ContentActions';
import ReactionButtons from '../components/ReactionButtons';
import ShareModal from '../components/ShareModal';
import ScrollToTop from '../components/ScrollToTop';
import { BACKEND_URL } from '../config/client';

const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    const [name, value] = c.trim().split('=');
    if (name === 'csrf') return value;
  }
  return null;
};

const SideAction = ({ onClick, icon: Icon, label, active }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider w-full text-left"
    style={{
      background: 'none',
      border: 'none',
      borderBottom: '1px solid var(--border)',
      padding: '0.875rem 0',
      cursor: 'pointer',
      color: active ? 'var(--text)' : 'var(--muted)',
      transition: 'color 0.15s',
    }}
  >
    <Icon size={13} style={{ flexShrink: 0 }} />
    {label}
  </button>
);

const BlogPostView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reactions, setReactions] = useState({ like: { count: 0, active: false }, heart: { count: 0, active: false }, clap: { count: 0, active: false }, laugh: { count: 0, active: false } });
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [following, setFollowing] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);

  useEffect(() => { fetchPost(); }, [id]);
  useEffect(() => {
    if (post) { fetchReactionCounts(); fetchRepostCount(); }
    if (user && post) {
      checkFollowStatus();
      checkReactionStatus();
      checkSavedStatus();
      checkRepostStatus();
    }
  }, [user, post]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/blog/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setPost(data.post);
        setReactions(prev => ({ ...prev, like: { ...prev.like, count: data.post.likesCount || 0 } }));
      } else {
        setError('Post no encontrado');
      }
    } catch {
      setError('Error al cargar el post');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!post?.author?.id || user?.id === post.author.id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${post.author.id}/check`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setFollowing(data.following);
    } catch (_) {}
  };

  const fetchReactionCounts = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions/counts?postId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setReactions(prev => Object.fromEntries(
          Object.keys(prev).map(t => [t, { ...prev[t], count: data.counts[t] || 0 }])
        ));
      }
    } catch (_) {}
  };

  const checkReactionStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions/user?postId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        const active = new Set(data.reactions.map(r => r.type));
        setReactions(prev => Object.fromEntries(
          Object.keys(prev).map(t => [t, { ...prev[t], active: active.has(t) }])
        ));
      }
    } catch (_) {}
  };

  const checkSavedStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/saved/check?postId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setSaved(data.saved);
    } catch (_) {}
  };

  const handleReaction = async (type) => {
    if (!user) return navigate('/auth');
    const snap = reactions[type];
    setReactions(r => ({ ...r, [type]: { count: snap.active ? snap.count - 1 : snap.count + 1, active: !snap.active } }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ postId: id, type }),
      });
      const data = await res.json();
      if (!data.ok) setReactions(r => ({ ...r, [type]: snap }));
    } catch (_) {
      setReactions(r => ({ ...r, [type]: snap }));
    }
  };

  const handleSave = async () => {
    if (!user) return navigate('/auth');
    try {
      const res = await fetch(`${BACKEND_URL}/api/saved`, {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ postId: id }),
      });
      const data = await res.json();
      if (data.ok) setSaved(prev => !prev);
    } catch (_) {}
  };

  const handleFollow = async () => {
    if (!user) return navigate('/auth');
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${post.author.id}`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) setFollowing(data.following);
    } catch (_) {}
  };

  const fetchRepostCount = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/repost/counts?postId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setRepostCount(data.count);
    } catch (_) {}
  };

  const checkRepostStatus = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/repost/check?postId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setReposted(data.reposted);
    } catch (_) {}
  };

  const handleRepost = async () => {
    if (!user) return navigate('/auth');
    const prev = reposted;
    setReposted(!prev);
    setRepostCount(c => prev ? c - 1 : c + 1);
    try {
      const res = await fetch(`${BACKEND_URL}/api/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ postId: id }),
      });
      const data = await res.json();
      if (data.ok) { setReposted(data.reposted); setRepostCount(data.count); }
      else { setReposted(prev); setRepostCount(c => prev ? c + 1 : c - 1); }
    } catch (_) { setReposted(prev); }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  const readTime = (content) => Math.max(1, Math.ceil((content?.length || 0) / 1200));

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 28, height: 28,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="site-container py-16 text-center">
          <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            {error || 'Post no encontrado'}
          </p>
          <button onClick={() => navigate('/blog')} className="btn btn-outline">
            Volver al Blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-12">
        {/* Back */}
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider mb-10"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
        >
          <ArrowLeft size={13} /> Volver al Blog
        </button>

        {/* Single-column centered layout */}
        <article style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Cover image — full-bleed, no rounding */}
          {post.coverUrl && (
            <div style={{
              borderRadius: 0,
              aspectRatio: '16/9',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}>
              <img
                src={post.coverUrl}
                alt={post.title || 'Blog cover'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Category pill */}
          {post.category && (
            <span style={{
              display: 'inline-block',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-sans)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.25rem 0.875rem',
              marginTop: '1.5rem',
              marginBottom: '0.75rem',
            }}>
              {post.category}
            </span>
          )}

          {/* Title */}
          {post.title && (
            <h1
              className="font-display"
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                lineHeight: 1.1,
                color: 'var(--text)',
                marginBottom: '2rem',
              }}
            >
              {post.title}
            </h1>
          )}

          {/* Author card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            marginBottom: '2.5rem',
          }}>
            {/* Left: avatar + meta */}
            <Link to={`/profile/${post.author?.id}`} className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {post.author?.avatar ? (
                  <img src={post.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} style={{ color: 'var(--muted)' }} />
                )}
              </div>
              <div>
                <p className="font-sans font-medium text-sm" style={{ color: 'var(--text)', marginBottom: '0.125rem' }}>
                  {post.author?.name || 'Anónimo'}
                </p>
                <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                  {formatDate(post.createdAt)}
                  {' · '}
                  <Clock size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.2rem' }} />
                  {readTime(post.content)} min de lectura
                </p>
              </div>
            </Link>

            {/* Right: Follow + ContentActions */}
            <div className="flex items-center gap-3">
              {user && post.author?.id && user.id !== post.author.id && (
                <button
                  onClick={handleFollow}
                  className="btn btn-ghost"
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.375rem 0',
                    borderBottom: `1px solid ${following ? 'var(--border)' : 'var(--text)'}`,
                    color: following ? 'var(--muted)' : 'var(--text)',
                  }}
                >
                  {following ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
              {user && (
                <ContentActions
                  type="blog"
                  itemId={post.id}
                  authorId={post.authorId || post.author?.id}
                  author={post.author}
                  onDelete={() => navigate('/blog')}
                />
              )}
            </div>
          </div>

          {/* Body content */}
          <div
            className="font-sans prose-editorial"
            style={{
              fontSize: '1.0625rem',
              lineHeight: 1.85,
              color: 'var(--text)',
              fontFamily: 'var(--font-sans)',
            }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Embedded video */}
          {post.videoUrl && (
            <div style={{ marginTop: '2rem', aspectRatio: '16/9', overflow: 'hidden' }}>
              <iframe src={post.videoUrl} className="w-full h-full" allowFullScreen title="Video" />
            </div>
          )}

          {/* Tags — colorful pills with "Temas" label */}
          {post.tags?.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <p
                className="font-sans text-xs uppercase tracking-widest"
                style={{ color: 'var(--muted)', marginBottom: '0.75rem' }}
              >
                Temas
              </p>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--muted)',
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.875rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reactions bar with inline save / share / comment actions */}
          <div style={{
            marginTop: '2.5rem',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            padding: '1.25rem 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <ReactionButtons reactions={reactions} onReaction={handleReaction} disabled={!user} />

            <div className="flex items-center gap-1">
              {/* Comment */}
              <button
                onClick={() => {
                  setShowComments(!showComments);
                  if (!showComments) setTimeout(() => document.getElementById('blog-comments')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: showComments ? 'var(--accent)' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Comentarios"
              >
                <MessageCircle size={18} />
              </button>

              {/* Save */}
              <button
                onClick={handleSave}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: saved ? 'var(--accent)' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={saved ? 'Guardado' : 'Guardar'}
              >
                <Bookmark size={18} />
              </button>

              {/* Repost */}
              <button
                onClick={handleRepost}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: reposted ? 'var(--accent)' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                aria-label="Repostear"
              >
                <Repeat2 size={18} />
                {repostCount > 0 && (
                  <span className="font-mono" style={{ fontSize: '0.75rem' }}>{repostCount}</span>
                )}
              </button>

              {/* Share */}
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Compartir"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>

          {/* Comments section */}
          <div id="blog-comments" style={{ marginTop: '3rem' }}>
            <h3
              className="font-display"
              style={{ fontSize: '1.25rem', color: 'var(--text)', marginBottom: '1.5rem' }}
            >
              Comentarios
            </h3>
            <CommentSection postId={post.id} />
          </div>
        </article>
      </div>

      {showShareModal && (
        <ShareModal url={window.location.href} title={post.title || 'Blog Post'} onClose={() => setShowShareModal(false)} />
      )}

      <ScrollToTop showAfter={300} />
    </div>
  );
};

export default BlogPostView;
