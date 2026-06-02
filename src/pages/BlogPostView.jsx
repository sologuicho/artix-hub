import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Bookmark, Clock, User } from 'lucide-react';
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

  useEffect(() => { fetchPost(); }, [id]);
  useEffect(() => {
    if (post) { fetchReactionCounts(); }
    if (user && post) {
      checkFollowStatus();
      checkReactionStatus();
      checkSavedStatus();
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-12 items-start">
          {/* Article */}
          <article style={{ maxWidth: '720px' }}>
            {/* Cover */}
            {post.coverUrl && (
              <div style={{ marginBottom: '2rem', aspectRatio: '16/9', overflow: 'hidden' }}>
                <img src={post.coverUrl} alt={post.title || 'Blog cover'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            {/* Category */}
            {post.category && <span className="category-tag">{post.category}</span>}

            {/* Title */}
            {post.title && (
              <h1
                className="font-display"
                style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', lineHeight: 1.15, color: 'var(--text)', margin: '1rem 0 1.5rem' }}
              >
                {post.title}
              </h1>
            )}

            {/* Byline */}
            <div
              className="flex items-center justify-between gap-4 flex-wrap py-5"
              style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}
            >
              <Link to={`/profile/${post.author?.id}`} className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {post.author?.avatar ? (
                    <img src={post.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={16} style={{ color: 'var(--muted)' }} />
                  )}
                </div>
                <div>
                  <p className="font-sans text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {post.author?.name || 'Anónimo'}
                  </p>
                  <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                    {formatDate(post.createdAt)} · {readTime(post.content)} min de lectura
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                {user && post.author?.id && user.id !== post.author.id && (
                  <button
                    onClick={handleFollow}
                    className="btn btn-ghost"
                    style={{
                      fontSize: '0.6875rem', padding: '0.375rem 0',
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

            {/* Content */}
            <div
              className="font-sans prose-editorial"
              style={{ color: 'var(--text)', lineHeight: 1.75, fontSize: '1.0625rem' }}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Video */}
            {post.videoUrl && (
              <div style={{ marginTop: '2rem', aspectRatio: '16/9', overflow: 'hidden' }}>
                <iframe src={post.videoUrl} className="w-full h-full" allowFullScreen title="Video" />
              </div>
            )}

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                {post.tags.map((tag, i) => (
                  <span key={i} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>#{tag}</span>
                ))}
              </div>
            )}

            {/* Reactions */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <ReactionButtons reactions={reactions} onReaction={handleReaction} disabled={!user} />
            </div>

            {/* Comments */}
            <div id="blog-comments" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
              <h3 className="font-display mb-6" style={{ fontSize: '1.25rem', color: 'var(--text)' }}>Comentarios</h3>
              <CommentSection postId={post.id} />
            </div>
          </article>

          {/* Sidebar actions */}
          <aside className="hidden lg:block" style={{ paddingTop: '0.5rem' }}>
            <div style={{ position: 'sticky', top: '6rem' }}>
              <p className="font-sans text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Acciones
              </p>
              <SideAction
                onClick={() => handleReaction('like')}
                icon={Heart}
                label={`Me gusta${reactions.like.count > 0 ? ` · ${reactions.like.count}` : ''}`}
                active={reactions.like.active}
              />
              <SideAction
                onClick={() => {
                  setShowComments(!showComments);
                  if (!showComments) setTimeout(() => document.getElementById('blog-comments')?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                icon={MessageCircle}
                label="Comentar"
                active={showComments}
              />
              <SideAction onClick={handleSave} icon={Bookmark} label={saved ? 'Guardado' : 'Guardar'} active={saved} />
              <SideAction onClick={() => setShowShareModal(true)} icon={Share2} label="Compartir" active={false} />
            </div>
          </aside>
        </div>

        {/* Mobile floating bar */}
        <div
          className="fixed lg:hidden z-40 flex items-center gap-1"
          style={{
            bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            padding: '0.5rem 1rem',
          }}
        >
          <button onClick={() => handleReaction('like')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: reactions.like.active ? 'var(--accent)' : 'var(--muted)' }}>
            <Heart size={18} />
          </button>
          <button onClick={() => setShowComments(!showComments)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--muted)' }}>
            <MessageCircle size={18} />
          </button>
          <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: saved ? 'var(--accent)' : 'var(--muted)' }}>
            <Bookmark size={18} />
          </button>
          <button onClick={() => setShowShareModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--muted)' }}>
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {showShareModal && (
        <ShareModal url={window.location.href} title={post.title || 'Blog Post'} onClose={() => setShowShareModal(false)} />
      )}

      <ScrollToTop showAfter={300} />
    </div>
  );
};

export default BlogPostView;
