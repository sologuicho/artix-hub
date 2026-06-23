import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Copy, Check, BookOpen, Download, User, Clock, Repeat2, Tablet } from 'lucide-react';
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
    className="flex items-center gap-2 font-sans w-full text-left"
    style={{
      background: 'none', border: 'none',
      borderBottom: '1px solid var(--border)',
      padding: '0.75rem 0',
      cursor: disabled ? 'wait' : 'pointer',
      color: active ? 'var(--text)' : 'var(--muted)',
      fontSize: '0.6875rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
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
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);

  useEffect(() => { fetchResearch(); }, [id]);
  useEffect(() => {
    if (research) { fetchReactionCounts(); fetchRepostCount(); }
    if (user && research?.author?.id) {
      checkFollowStatus();
      fetchReadingProgress();
      checkReactionStatus();
      checkRepostStatus();
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

  const fetchRepostCount = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/repost/counts?researchId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setRepostCount(data.count);
    } catch (_) {}
  };

  const checkRepostStatus = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/repost/check?researchId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setReposted(data.reposted);
    } catch (_) {}
  };

  const handleRepost = async () => {
    if (!user) { navigate('/auth'); return; }
    const prev = reposted;
    setReposted(!prev);
    setRepostCount(c => prev ? c - 1 : c + 1);
    try {
      const res = await fetch(`${BACKEND_URL}/api/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ researchId: id }),
      });
      const data = await res.json();
      if (data.ok) { setReposted(data.reposted); setRepostCount(data.count); }
      else { setReposted(prev); setRepostCount(c => prev ? c + 1 : c - 1); }
    } catch (_) { setReposted(prev); }
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
          <article>

            {/* ── Paper header ── */}
            <header
              style={{
                borderTop: '4px solid var(--accent)',
                borderBottom: '1px solid var(--border)',
                padding: '2rem 0',
                marginBottom: '2.5rem',
              }}
            >
              {/* Journal label */}
              <p
                className="font-sans text-xs uppercase tracking-widest"
                style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}
              >
                Investigación{research.category ? ` · ${research.category}` : ''}
              </p>

              {/* Title */}
              <h1
                className="font-display"
                style={{
                  fontSize: 'clamp(1.6rem, 4vw, 2.75rem)',
                  lineHeight: 1.15,
                  color: 'var(--text)',
                  marginBottom: '1.75rem',
                }}
              >
                {research.title}
              </h1>

              {/* Meta row: author left, key-value grid right */}
              <div
                className="flex items-start justify-between gap-6 flex-wrap"
              >
                {/* Author + date */}
                <div className="flex items-center gap-3">
                  <Link to={`/profile/${research.author?.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
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
                      <p className="font-sans text-sm font-medium" style={{ color: 'var(--text)', marginBottom: '0.2rem' }}>
                        {research.author?.name || 'Investigador'}
                      </p>
                      <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                        {formatDate(research.createdAt)}
                      </p>
                      <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                        <Clock size={10} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                        Tiempo de lectura: {Math.ceil((research.content?.length || 0) / 1000)} min
                      </p>
                    </div>
                  </Link>

                  {user && research.author?.id && user.id !== research.author.id && (
                    <button
                      onClick={handleFollow}
                      className="btn btn-ghost"
                      style={{
                        fontSize: '0.6875rem', padding: '0.375rem 0', marginLeft: '0.5rem',
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

                {/* Mini metadata grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: '0.75rem', rowGap: '0.35rem', alignItems: 'baseline' }}>
                  {research.status && (
                    <>
                      <span className="font-mono text-xs" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>Status</span>
                      <span className="font-sans text-sm" style={{ color: 'var(--text)' }}>{research.status}</span>
                    </>
                  )}
                  {research.category && (
                    <>
                      <span className="font-mono text-xs" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>Campo</span>
                      <span className="font-sans text-sm" style={{ color: 'var(--text)' }}>{research.category}</span>
                    </>
                  )}
                  {research.tags?.length > 0 && (
                    <>
                      <span className="font-mono text-xs" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>Tags</span>
                      <span className="font-sans text-sm" style={{ color: 'var(--text)' }}>
                        {research.tags.map(tag => `#${tag}`).join(' ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* ── Abstract ── */}
            {research.abstract && (
              <div
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  padding: '1.5rem 2rem',
                  marginBottom: '2.5rem',
                  position: 'relative',
                }}
              >
                <p
                  className="font-sans text-xs uppercase tracking-widest"
                  style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}
                >
                  Abstract
                </p>
                <p
                  className="font-sans text-sm"
                  style={{ color: 'var(--text)', lineHeight: 1.8 }}
                >
                  {research.abstract}
                </p>
              </div>
            )}

            {/* ── Cover image ── */}
            {research.coverUrl && (
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <img
                    src={research.coverUrl}
                    alt={research.title}
                    style={{ width: '100%', display: 'block', objectFit: 'cover' }}
                  />
                </div>
                <p
                  className="font-sans text-xs"
                  style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '0.5rem' }}
                >
                  Fig. 1 — {research.title}
                </p>
              </div>
            )}

            {/* ── Content ── */}
            <div
              style={{
                fontSize: '1rem',
                lineHeight: 1.85,
                maxWidth: '65ch',
                color: 'var(--text)',
              }}
            >
              <div className="my-8">
                <PaginatedReader
                  content={research.content}
                  title={research.title}
                  contentId={research.id}
                  contentType="research"
                  initialProgress={readingProgress}
                />
              </div>
            </div>

            {/* ── Reactions ── */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <ReactionButtons reactions={reactions} onReaction={handleReaction} disabled={!user} />
            </div>

            {/* ── Citation box ── */}
            <div
              style={{
                border: '1px solid var(--border)',
                padding: '1rem 1.5rem',
                backgroundColor: 'var(--surface)',
                marginTop: '2rem',
              }}
            >
              <p
                className="font-sans text-xs uppercase tracking-widest"
                style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}
              >
                Citar como
              </p>
              <p
                className="font-mono text-xs"
                style={{ color: 'var(--text)', lineHeight: 1.6 }}
              >
                {research.author?.name || 'Autor'} ({new Date(research.createdAt).getFullYear()}). {research.title}. <em>Artix Hub</em>.
              </p>
            </div>

            {/* ── Comments ── */}
            <div id="comments-section" style={{ paddingTop: '2rem', borderTop: '1px solid var(--border)', marginTop: '2rem' }}>
              <p
                className="font-sans text-xs uppercase tracking-widest"
                style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}
              >
                Foro de debate
              </p>
              <h3 className="font-display mb-6" style={{ fontSize: '1.25rem', color: 'var(--text)' }}>
                Discusión Académica
              </h3>
              <CommentSection researchId={research.id} />
            </div>
          </article>

          {/* ── Sidebar ── */}
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
              <SideAction onClick={handleRepost} icon={Repeat2} label={`Repostear${repostCount > 0 ? ` · ${repostCount}` : ''}`} active={reposted} />
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
              <SideAction
                onClick={() => window.open(`${BACKEND_URL}/api/research/${research.id}/epub`, '_blank')}
                icon={Tablet}
                label="E-reader (EPUB)"
                active={false}
              />
            </div>
          </aside>
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
        content={research.content}
      />

      <div className="lg:hidden">
        <ScrollToTop showAfter={300} />
      </div>
    </div>
  );
};

export default ResearchView;
