import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, BookOpen, ArrowLeft, Copy, Check, Download, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import CollaborationInvitation from '../components/CollaborationInvitation';
import CommentSection from '../components/CommentSection';
import ReactionButtons from '../components/ReactionButtons';
import ContentActions from '../components/ContentActions';
import ReadingMode from '../components/ReadingMode';
import ScrollToTop from '../components/ScrollToTop';
import { generatePDF } from '../utils/pdfGenerator';
import PaginatedReader from '../components/reader/PaginatedReader';
import PricingModal from '../components/PricingModal';
import { BACKEND_URL } from '../config/client';

// ── Sidebar action button ────────────────────────────────────────────────────
const SideAction = ({ onClick, icon: Icon, label, active, count, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-center gap-3 font-sans text-xs uppercase tracking-wider transition-colors duration-150"
    style={{
      padding: '0.625rem 0',
      background: 'none',
      border: 'none',
      borderBottom: '1px solid var(--border)',
      color: active ? 'var(--accent)' : 'var(--muted)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}
    onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.color = 'var(--text)'; }}
    onMouseLeave={e => { if (!disabled && !active) e.currentTarget.style.color = 'var(--muted)'; }}
  >
    <Icon size={14} />
    <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
    {count !== undefined && (
      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{count}</span>
    )}
  </button>
);

// ── ArticleView ──────────────────────────────────────────────────────────────
const ArticleView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState({ like: { count: 0, active: false }, heart: { count: 0, active: false }, clap: { count: 0, active: false }, laugh: { count: 0, active: false } });
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [readingProgress, setReadingProgress] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => { fetchArticle(); }, [id]);
  useEffect(() => {
    if (article) { fetchReactionCounts(); }
    if (user && article) { checkFollowStatus(); fetchReadingProgress(); checkReactionStatus(); }
  }, [user, article]);

  const getCsrfToken = () => {
    for (const c of document.cookie.split(';')) {
      const [n, v] = c.trim().split('=');
      if (n === 'csrf') return v;
    }
    return null;
  };

  const fetchReadingProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/reading-progress?articleId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data) setReadingProgress(data);
    } catch (_) {}
  };

  const checkFollowStatus = async () => {
    if (!user || !article?.author?.id || user.id === article.author.id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${article.author.id}/check`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setFollowing(data.following);
    } catch (_) {}
  };

  const handleFollow = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
      await fetch(`${BACKEND_URL}/api/follow/${article.author.id}`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      setFollowing(f => !f);
    } catch (_) {}
  };

  const fetchArticle = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/articles/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (res.status === 403 && data.error === 'limit_reached') { setLimitReached(true); return; }
      if (data.ok) {
        setArticle(data.article);
        setReactions(prev => ({ ...prev, like: { ...prev.like, count: data.article.likesCount || 0 } }));
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const fetchReactionCounts = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions/counts?articleId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setReactions(prev => Object.fromEntries(
          Object.keys(prev).map(t => [t, { ...prev[t], count: data.counts[t] || 0 }])
        ));
      }
    } catch (_) {}
  };

  const checkReactionStatus = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions/user?articleId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        const active = new Set(data.reactions.map(r => r.type));
        setReactions(prev => Object.fromEntries(
          Object.keys(prev).map(t => [t, { ...prev[t], active: active.has(t) }])
        ));
      }
    } catch (_) {}
  };

  const handleReaction = async (type) => {
    if (!user) { navigate('/auth'); return; }
    const snap = reactions[type];
    setReactions(r => ({ ...r, [type]: { count: snap.active ? snap.count - 1 : snap.count + 1, active: !snap.active } }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ articleId: id, type }),
      });
      const data = await res.json();
      if (!data.ok) setReactions(r => ({ ...r, [type]: snap }));
    } catch (_) {
      setReactions(r => ({ ...r, [type]: snap }));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await generatePDF({
        title: article.title, content: article.content,
        author: article.author?.name || 'Autor desconocido',
        date: article.createdAt, description: article.description, tags: article.tags || [],
      }, 'article');
    } catch {
      alert('Error al generar el PDF.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div style={{
          width: 24, height: 24, border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Limit reached
  if (limitReached) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center text-center px-6"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <span className="category-tag mb-4">Límite diario</span>
        <h2
          className="font-display mb-4"
          style={{ fontSize: '2rem', color: 'var(--text)', maxWidth: '480px' }}
        >
          Has alcanzado tu límite de lecturas diarias
        </h2>
        <p className="font-sans text-sm mb-8" style={{ color: 'var(--muted)', maxWidth: '400px', lineHeight: 1.7 }}>
          El plan Lector tiene un límite diario. Actualiza tu membresía para acceso ilimitado.
        </p>
        <div className="flex gap-4">
          <button onClick={() => setShowPricing(true)} className="btn btn-primary">
            Ver planes
          </button>
          <button onClick={() => navigate('/articles')} className="btn btn-ghost">
            Volver a artículos
          </button>
        </div>
        <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
      </div>
    );
  }

  // Not found
  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <p className="font-display mb-4" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
          Artículo no encontrado
        </p>
        <button onClick={() => navigate('/articles')} className="btn btn-outline">
          Volver a artículos
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-12">

        {/* Back nav */}
        <button
          onClick={() => navigate('/articles')}
          className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider mb-10 transition-colors duration-150"
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          <ArrowLeft size={12} /> Artículos
        </button>

        <CollaborationInvitation type="article" itemId={id} onUpdate={fetchArticle} />

        {/* Main layout: article + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-16">

          {/* Article */}
          <article>
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {article.category && (
                <span className="category-tag">{article.category}</span>
              )}
              {article.tags?.map((tag, i) => (
                <span
                  key={i}
                  className="font-sans text-xs"
                  style={{ color: 'var(--muted)' }}
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1
              className="font-display mb-6"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: 'var(--text)', lineHeight: 1.15, maxWidth: '720px' }}
            >
              {article.title}
            </h1>

            {/* Byline */}
            <div
              className="flex items-center justify-between py-5 mb-8"
              style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
            >
              <Link to={`/profile/${article.author?.id}`} className="flex items-center gap-3 group">
                {article.author?.avatar ? (
                  <img
                    src={article.author.avatar}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                      {(article.author?.name || 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p
                    className="font-sans text-sm font-medium transition-colors duration-150"
                    style={{ color: 'var(--text)' }}
                  >
                    {article.author?.name || 'Anónimo'}
                  </p>
                  <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                    {formatDate(article.createdAt)}
                    {' · '}
                    <Clock size={10} style={{ display: 'inline', marginBottom: 1 }} />
                    {' '}{Math.ceil((article.content?.length || 0) / 1000)} min
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                {user && article.author?.id && user.id !== article.author.id && (
                  <button
                    onClick={handleFollow}
                    className={`btn ${following ? 'btn-ghost' : 'btn-outline'}`}
                    style={{ padding: '0.375rem 1rem', fontSize: '0.625rem' }}
                  >
                    {following ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
                {user && (
                  <ContentActions
                    type="article"
                    itemId={article.id}
                    authorId={article.authorId || article.author?.id}
                    author={article.author}
                    onDelete={() => navigate('/articles')}
                  />
                )}
              </div>
            </div>

            {/* Cover image */}
            {article.coverUrl && (
              <div
                className="mb-10 overflow-hidden"
                style={{ aspectRatio: '16/9', maxWidth: '720px' }}
              >
                <img
                  src={article.coverUrl}
                  alt={article.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Body */}
            <div
              className="font-sans"
              style={{ maxWidth: '720px', fontSize: '1.0625rem', lineHeight: 1.8, color: 'var(--text)' }}
            >
              <PaginatedReader
                content={article.content}
                title={article.title}
                contentId={article.id}
                contentType="article"
                initialProgress={readingProgress}
              />
            </div>

            {/* Tags footer */}
            {article.tags?.length > 0 && (
              <div
                className="mt-12 pt-8"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <p
                  className="font-sans text-xs uppercase tracking-wider mb-4"
                  style={{ color: 'var(--muted)' }}
                >
                  Temas relacionados
                </p>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="badge badge-observer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reactions */}
            <div
              className="mt-10 pt-8"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <ReactionButtons
                reactions={reactions}
                onReaction={handleReaction}
                disabled={!user}
              />
            </div>

            {/* Comments — always visible; sidebar button scrolls here */}
            <div
              id="comments-section"
              className="mt-12 pt-10"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <h3
                className="font-display mb-8"
                style={{ fontSize: '1.5rem', color: 'var(--text)' }}
              >
                Discusión
              </h3>
              <CommentSection articleId={article.id} />
            </div>
          </article>

          {/* Sticky sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <p
                className="font-sans text-xs uppercase tracking-wider mb-4"
                style={{ color: 'var(--muted)' }}
              >
                Acciones
              </p>
              <div>
                <SideAction onClick={() => handleReaction('like')} icon={Heart} label="Me gusta" active={reactions.like.active} count={reactions.like.count} />
                <SideAction
                  onClick={() => {
                    setShowComments(v => !v);
                    if (!showComments) setTimeout(() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }}
                  icon={MessageCircle}
                  label="Comentar"
                  count={article.comments?.length || 0}
                />
                <SideAction onClick={() => setShowShareModal(true)} icon={Share2} label="Compartir" />
                <SideAction onClick={handleCopyLink} icon={copied ? Check : Copy} label={copied ? 'Copiado' : 'Copiar link'} active={copied} />
                <SideAction onClick={() => setReadingMode(true)} icon={BookOpen} label="Modo lectura" />
                <SideAction
                  onClick={handleDownloadPDF}
                  icon={Download}
                  label={downloadingPDF ? 'Generando…' : 'Descargar PDF'}
                  disabled={downloadingPDF}
                />
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile floating actions */}
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:hidden z-40 flex items-center gap-1"
          style={{
            backgroundColor: 'var(--darkBg, #111110)',
            border: '1px solid var(--darkBorder, #2E2C2A)',
            padding: '0.5rem 0.75rem',
          }}
        >
          {[
            { icon: Heart, action: () => handleReaction('like'), active: reactions.like.active },
            { icon: MessageCircle, action: () => setShowComments(v => !v) },
            { icon: BookOpen, action: () => setReadingMode(true) },
            { icon: Share2, action: () => setShowShareModal(true) },
          ].map(({ icon: Icon, action, active }, i) => (
            <button
              key={i}
              onClick={action}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: active ? 'var(--accent)' : '#8C8A86' }}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        <div className="lg:hidden"><ScrollToTop showAfter={300} /></div>
      </div>

      {/* Modals */}
      {showShareModal && (
        <ShareModal url={window.location.href} title={article.title} onClose={() => setShowShareModal(false)} />
      )}
      <ReadingMode isOpen={readingMode} onClose={() => setReadingMode(false)} title={article.title} author={article.author?.name} date={article.createdAt}>
        <div className="prose prose-xl max-w-3xl mx-auto" style={{ color: 'var(--text)' }}>
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>
      </ReadingMode>
    </div>
  );
};

export default ArticleView;
