import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Copy, Check, BookOpen, Download, User, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import CollaborationInvitation from '../components/CollaborationInvitation';
import CommentSection from '../components/CommentSection';
import ContentActions from '../components/ContentActions';
import ReactionButtons from '../components/ReactionButtons';
import ReadingMode from '../components/ReadingMode';
import ScrollToTop from '../components/ScrollToTop';
import { generatePDF } from '../utils/pdfGenerator';
import PaginatedReader from '../components/reader/PaginatedReader';
import { BACKEND_URL } from '../config/client';

const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf') return value;
  }
  return null;
};

const SideAction = ({ onClick, icon: Icon, label, active, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider w-full text-left"
    style={{
      background: 'none', border: 'none',
      borderBottom: '1px solid var(--border)',
      padding: '0.875rem 0',
      cursor: disabled ? 'wait' : 'pointer',
      color: active ? 'var(--text)' : 'var(--muted)',
      transition: 'color 0.15s',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <Icon size={13} style={{ flexShrink: 0 }} />
    {label}
  </button>
);

const ResearchView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState({ like: { count: 0, active: false }, heart: { count: 0, active: false }, clap: { count: 0, active: false }, laugh: { count: 0, active: false } });
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [readingProgress, setReadingProgress] = useState(null);

  useEffect(() => { fetchResearch(); }, [id]);
  useEffect(() => {
    if (research) { fetchReactionCounts(); }
    if (user && research?.author?.id) {
      checkFollowStatus();
      fetchReadingProgress();
      checkReactionStatus();
    }
  }, [user, research?.author?.id]);

  const fetchReadingProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${BACKEND_URL}/api/reading-progress?researchId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data) setReadingProgress(data);
    } catch (_) {}
  };

  const checkFollowStatus = async () => {
    if (!user || !research?.author?.id || user.id === research.author.id) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/follow/${research.author.id}/check`, { credentials: 'include' });
      const data = await response.json();
      if (data.ok) setFollowing(data.following);
    } catch (_) {}
  };

  const handleFollow = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
      const response = await fetch(`${BACKEND_URL}/api/follow/${research.author.id}`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) setFollowing(data.following);
    } catch (_) {}
  };

  const fetchResearch = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/research/${id}`, { credentials: 'include' });
      const data = await response.json();
      if (data.ok) {
        setResearch(data.research);
        setReactions(prev => ({ ...prev, like: { ...prev.like, count: data.research.likesCount || 0 } }));
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const fetchReactionCounts = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions/counts?researchId=${id}`, { credentials: 'include' });
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
      const res = await fetch(`${BACKEND_URL}/api/reactions/user?researchId=${id}`, { credentials: 'include' });
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
        body: JSON.stringify({ researchId: id, type }),
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
        title: research.title,
        content: research.content,
        author: research.author?.name || 'Investigador',
        date: research.createdAt,
        description: research.abstract || research.description,
        tags: research.tags || [],
      }, 'research');
    } catch {
      alert('Error al generar el PDF. Por favor, intenta de nuevo.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

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

  if (!research) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="site-container py-16 text-center">
          <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            Investigación no encontrada
          </p>
          <button onClick={() => navigate('/research')} className="btn btn-outline">
            Volver a Investigaciones
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
          onClick={() => navigate('/research')}
          className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider mb-10"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
        >
          <ArrowLeft size={13} /> Volver a Investigaciones
        </button>

        <CollaborationInvitation type="research" itemId={id} onUpdate={fetchResearch} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-12 items-start">
          {/* Article */}
          <article style={{ maxWidth: '720px' }}>
            {/* Tags + status */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {research.category && <span className="category-tag">{research.category}</span>}
              {research.status && (
                <span className="font-sans text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  {research.status}
                </span>
              )}
              {research.tags?.map((tag, i) => (
                <span key={i} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>#{tag}</span>
              ))}
            </div>

            {/* Title */}
            <h1
              className="font-display"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', lineHeight: 1.15, color: 'var(--text)', marginBottom: '1.5rem' }}
            >
              {research.title}
            </h1>

            {/* Byline */}
            <div
              className="flex items-center justify-between gap-4 flex-wrap py-5 mb-6"
              style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
            >
              <Link to={`/profile/${research.author?.id}`} className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                  overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {research.author?.avatar ? (
                    <img src={research.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={16} style={{ color: 'var(--muted)' }} />
                  )}
                </div>
                <div>
                  <p className="font-sans text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {research.author?.name || 'Investigador'}
                  </p>
                  <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                    {formatDate(research.createdAt)} · {Math.ceil((research.content?.length || 0) / 1000)} min de lectura
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                {user && research.author?.id && user.id !== research.author.id && (
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
                    type="research"
                    itemId={research.id}
                    authorId={research.authorId || research.author?.id}
                    author={research.author}
                    onDelete={() => navigate('/research')}
                  />
                )}
              </div>
            </div>

            {/* Abstract */}
            {research.abstract && (
              <div style={{ padding: '1.25rem 1.5rem', borderLeft: '3px solid var(--accent)', backgroundColor: 'var(--surface)', marginBottom: '2rem' }}>
                <p className="font-sans text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Abstract</p>
                <p className="font-sans text-sm" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                  {research.abstract}
                </p>
              </div>
            )}

            {/* Cover image */}
            {research.coverUrl && (
              <div style={{ marginBottom: '2rem', aspectRatio: '16/9', overflow: 'hidden' }}>
                <img src={research.coverUrl} alt={research.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            {/* Paginated reader */}
            <div className="my-8">
              <PaginatedReader
                content={research.content}
                title={research.title}
                contentId={research.id}
                contentType="research"
                initialProgress={readingProgress}
              />
            </div>

            {/* Reactions */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <ReactionButtons reactions={reactions} onReaction={handleReaction} disabled={!user} />
            </div>

            {/* Comments */}
            <div id="comments-section" style={{ paddingTop: '2rem', borderTop: '1px solid var(--border)', marginTop: '2rem' }}>
              <h3 className="font-display mb-6" style={{ fontSize: '1.25rem', color: 'var(--text)' }}>
                Discusión Académica
              </h3>
              <CommentSection researchId={research.id} />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block" style={{ paddingTop: '0.5rem' }}>
            <div style={{ position: 'sticky', top: '6rem' }}>
              <p className="font-sans text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Acciones
              </p>
              <SideAction
                onClick={() => handleReaction('like')}
                icon={Heart}
                label={`Recomendar${reactions.like.count > 0 ? ` · ${reactions.like.count}` : ''}`}
                active={reactions.like.active}
              />
              <SideAction
                onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                icon={MessageCircle}
                label="Debatir"
                active={false}
              />
              <SideAction onClick={() => setShowShareModal(true)} icon={Share2} label="Compartir" active={false} />
              <SideAction
                onClick={handleCopyLink}
                icon={copied ? Check : Copy}
                label={copied ? 'Copiado' : 'Copiar link'}
                active={copied}
              />
              <p className="font-sans text-xs uppercase tracking-widest mb-2 mt-6" style={{ color: 'var(--muted)' }}>
                Herramientas
              </p>
              <SideAction onClick={() => setReadingMode(true)} icon={BookOpen} label="Modo lectura" active={false} />
              <SideAction
                onClick={handleDownloadPDF}
                icon={Download}
                label={downloadingPDF ? 'Generando…' : 'Descargar PDF'}
                active={false}
                disabled={downloadingPDF}
              />
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
          <button onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--muted)' }}>
            <MessageCircle size={18} />
          </button>
          <button onClick={() => setReadingMode(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--muted)' }}>
            <BookOpen size={18} />
          </button>
          <button onClick={() => setShowShareModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--muted)' }}>
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {showShareModal && (
        <ShareModal url={window.location.href} title={research.title} onClose={() => setShowShareModal(false)} />
      )}

      <ReadingMode
        isOpen={readingMode}
        onClose={() => setReadingMode(false)}
        title={research.title}
        author={research.author?.name}
        date={research.createdAt}
      >
        <div className="prose prose-xl max-w-3xl mx-auto">
          <div dangerouslySetInnerHTML={{ __html: research.content }} />
        </div>
      </ReadingMode>

      <div className="lg:hidden">
        <ScrollToTop showAfter={300} />
      </div>
    </div>
  );
};

export default ResearchView;
