import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

// ─── helpers ──────────────────────────────────────────────────────────────────

const getCsrfToken = () => {
  for (const cookie of document.cookie.split(';')) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf') return value;
  }
  return null;
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const fmtCount = (n) => {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};

const statusBadgeStyle = (status) => {
  if (!status) return {};
  const s = status.toLowerCase();
  if (s === 'published' || s === 'peer-reviewed' || s === 'publicado') {
    return {
      border: '1px solid rgba(196,69,26,0.45)',
      color: '#e0815e',
      background: 'rgba(196,69,26,0.09)',
    };
  }
  if (s === 'under_review' || s === 'en revisión') {
    return {
      border: '1px solid rgba(255,255,255,0.14)',
      color: '#9a9a95',
      background: 'transparent',
    };
  }
  return {
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#b6b4af',
    background: 'transparent',
  };
};

const statusLabel = (status) => {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s === 'published') return 'Publicado';
  if (s === 'peer-reviewed') return 'Peer-reviewed';
  if (s === 'under_review') return 'En revisión';
  if (s === 'draft') return 'Preprint';
  return status;
};

const getInitials = (name) => {
  if (!name) return '??';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
};

// Extract h2 headings from HTML content to build a TOC
const extractToc = (html) => {
  if (!html) return [];
  const matches = [...html.matchAll(/<h2[^>]*id="([^"]*)"[^>]*>(.*?)<\/h2>/gi)];
  if (matches.length > 0) {
    return matches.map((m) => ({
      id: m[1],
      label: m[2].replace(/<[^>]+>/g, '').trim(),
    }));
  }
  // fallback: extract h2 text without ids and generate ids
  const fallback = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
  return fallback.map((m, i) => ({
    id: `section-${i}`,
    label: m[1].replace(/<[^>]+>/g, '').trim(),
  }));
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div
    style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <style>{`@keyframes artixSpin { to { transform: rotate(360deg); } }`}</style>
    <div
      style={{
        width: 28,
        height: 28,
        border: '2px solid rgba(255,255,255,0.08)',
        borderTopColor: '#C4451A',
        borderRadius: '50%',
        animation: 'artixSpin 0.8s linear infinite',
      }}
    />
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const ResearchView = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [research, setResearch]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saved, setSaved]           = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [following, setFollowing]   = useState(false);
  const [toast, setToast]           = useState(null); // { msg, type }
  const [progress, setProgress]     = useState(0);
  const [activeToc, setActiveToc]   = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const scrollRef = useRef(null);

  // ── Fetch research ──────────────────────────────────────────────────────────
  const fetchResearch = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/research/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.research) {
        setResearch(data.research);
      }
    } catch (err) {
      console.error('Error fetching research:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Check saved ─────────────────────────────────────────────────────────────
  const checkSaved = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const res  = await fetch(
        `${BACKEND_URL}/api/saved/check?type=research&itemId=${id}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.ok) setSaved(data.saved);
    } catch (_) {}
  }, [id, isAuthenticated]);

  // ── Check follow ────────────────────────────────────────────────────────────
  const checkFollow = useCallback(async (authorId) => {
    if (!isAuthenticated() || !authorId || user?.id === authorId) return;
    try {
      const res  = await fetch(`${BACKEND_URL}/api/follow/${authorId}/check`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) setFollowing(data.following);
    } catch (_) {}
  }, [isAuthenticated, user?.id]);

  // ── Mount effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchResearch();
  }, [fetchResearch]);

  useEffect(() => {
    if (!research) return;
    checkSaved();
    checkFollow(research.author?.id);
  }, [research, checkSaved, checkFollow]);

  // ── Reading progress bar ─────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p   = max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
      setProgress(p);

      // TOC highlight
      if (research?.content) {
        const toc = extractToc(research.content);
        let found = null;
        for (const entry of toc) {
          const el = document.getElementById(entry.id);
          if (el && el.getBoundingClientRect().top < 140) found = entry.id;
        }
        if (found !== null) setActiveToc(found);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [research]);

  // ── Save / unsave ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    setSaveLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/saved`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || '',
        },
        credentials: 'include',
        body: JSON.stringify({ type: 'research', itemId: id }),
      });
      const data = await res.json();
      if (data.ok) {
        const nowSaved = !saved;
        setSaved(nowSaved);
        setSavedCount((c) => (nowSaved ? c + 1 : Math.max(0, c - 1)));
        showToast(nowSaved ? 'Guardado en tu colección' : 'Eliminado de tu colección', 'ok');
      }
    } catch (_) {
      showToast('Error al guardar', 'err');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Follow ───────────────────────────────────────────────────────────────────
  const handleFollow = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    const authorId = research?.author?.id;
    if (!authorId) return;
    try {
      const res  = await fetch(`${BACKEND_URL}/api/follow/${authorId}`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setFollowing(data.following);
        showToast(data.following ? 'Siguiendo al autor' : 'Dejaste de seguir', 'ok');
      }
    } catch (_) {}
  };

  // ── EPUB download ─────────────────────────────────────────────────────────────
  const handleDownload = () => {
    if (!research) return;
    window.open(`${BACKEND_URL}/api/research/${research.id}/epub`, '_blank');
  };

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Share ─────────────────────────────────────────────────────────────────────
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: research?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('Enlace copiado', 'ok'));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) return <Spinner />;

  if (!research) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            color: '#6f6f6a',
            letterSpacing: '0.08em',
          }}
        >
          PAPER NO ENCONTRADO
        </p>
        <button
          onClick={() => navigate('/research')}
          style={{
            appearance: 'none',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#9a9a95',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            padding: '9px 18px',
            cursor: 'pointer',
          }}
        >
          ← Investigaciones
        </button>
      </div>
    );
  }

  const tags = Array.isArray(research.tags)
    ? research.tags
    : typeof research.tags === 'string'
    ? research.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const toc = extractToc(research.content || '');
  const authorInitials = getInitials(research.author?.name);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#e9e7e3',
        fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
      ref={scrollRef}
    >
      {/* Global styles */}
      <style>{`
        ::selection { background: #C4451A; color: #fff; }
        @keyframes artixSpin { to { transform: rotate(360deg); } }
        .research-body h1 { font-family: 'IBM Plex Sans', sans-serif; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; color: #f2f0ec; margin: 40px 0 16px; scroll-margin-top: 84px; }
        .research-body h2 { font-family: 'IBM Plex Sans', sans-serif; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: #f2f0ec; margin: 40px 0 16px; scroll-margin-top: 84px; }
        .research-body h3 { font-family: 'IBM Plex Sans', sans-serif; font-size: 16px; font-weight: 600; color: #d8d6d1; margin: 28px 0 12px; }
        .research-body p { font-family: 'IBM Plex Serif', Georgia, serif; font-size: 16px; line-height: 1.74; color: #cfcdc8; margin: 0 0 22px; }
        .research-body em { color: #d8d6d1; }
        .research-body strong { color: #e9e7e3; font-weight: 600; }
        .research-body a { color: #e0815e; text-decoration: underline; }
        .research-body a:hover { color: #f2a07d; }
        .research-body ul, .research-body ol { font-family: 'IBM Plex Serif', Georgia, serif; font-size: 16px; line-height: 1.74; color: #cfcdc8; padding-left: 24px; margin: 0 0 22px; }
        .research-body li { margin-bottom: 6px; }
        .research-body blockquote { border-left: 2px solid #C4451A; margin: 28px 0; padding: 12px 20px; background: rgba(196,69,26,0.06); font-family: 'IBM Plex Serif', Georgia, serif; font-size: 16px; color: #cfcdc8; font-style: italic; }
        .research-body pre { background: #0d0d0c; border: 1px solid rgba(255,255,255,0.1); padding: 16px 20px; overflow-x: auto; margin: 24px 0; font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #b6b4af; line-height: 1.6; }
        .research-body code { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #e0815e; background: rgba(196,69,26,0.1); padding: 1px 5px; }
        .research-body pre code { color: #b6b4af; background: none; padding: 0; }
        .research-body figure { margin: 30px 0; border: 1px solid rgba(255,255,255,0.1); background: #0d0d0c; }
        .research-body figcaption { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #6f6f6a; padding: 12px 22px; border-top: 1px solid rgba(255,255,255,0.08); background: #0a0a0a; }
        .research-body table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 13px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.1); }
        .research-body th { padding: 9px 14px; color: #9a9a95; background: #0d0d0c; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; }
        .research-body td { padding: 9px 14px; color: #d4d2cd; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .research-body hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 36px 0; }
      `}</style>

      {/* ── Reading progress bar ── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 60,
          background: 'rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.round(progress * 100)}%`,
            background: '#C4451A',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* ── Sub-header (inside layout, below progress bar) ── */}
      <div
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#0c0c0b',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '0 28px',
            height: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <Link
            to="/research"
            style={{
              textDecoration: 'none',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: '#76746f',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#e9e7e3')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#76746f')}
          >
            <span>←</span>
            <span>Investigaciones</span>
          </Link>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleDownload}
            style={{
              appearance: 'none',
              cursor: 'pointer',
              border: 'none',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: '#0a0a0a',
              background: '#C4451A',
              padding: '7px 15px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#d4582a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#C4451A')}
          >
            ↓ Descargar EPUB
          </button>
          <button
            onClick={handleSave}
            disabled={saveLoading}
            style={{
              appearance: 'none',
              cursor: saveLoading ? 'wait' : 'pointer',
              height: 34,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5,
              letterSpacing: '0.03em',
              padding: '0 13px',
              border: `1px solid ${saved ? 'rgba(196,69,26,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: saved ? 'rgba(196,69,26,0.12)' : '#0f0f0e',
              color: saved ? '#e0815e' : '#9a9a95',
              opacity: saveLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              if (!saveLoading) {
                e.currentTarget.style.borderColor = saved
                  ? 'rgba(196,69,26,0.8)'
                  : 'rgba(255,255,255,0.26)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = saved
                ? 'rgba(196,69,26,0.5)'
                : 'rgba(255,255,255,0.1)';
            }}
          >
            {saved ? '★ Guardado' : '☆ Guardar'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 296px',
            gap: 52,
            padding: '44px 0 96px',
            alignItems: 'start',
          }}
        >
          {/* ── Main content ── */}
          <main style={{ maxWidth: 720 }}>

            {/* Meta line */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                marginBottom: 18,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  padding: '2px 7px',
                  textTransform: 'uppercase',
                  display: 'inline-block',
                  ...statusBadgeStyle(research.status),
                }}
              >
                {statusLabel(research.status)}
              </span>
              {research.category && (
                <>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11.5,
                      color: '#6f6f6a',
                    }}
                  >
                    {research.category}
                  </span>
                  <span style={{ color: '#3a3a36' }}>·</span>
                </>
              )}
              {research.createdAt && (
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11.5,
                    color: '#6f6f6a',
                  }}
                >
                  {fmtDate(research.createdAt)}
                </span>
              )}
            </div>

            {/* Title */}
            <h1
              style={{
                margin: 0,
                fontSize: 31,
                lineHeight: 1.18,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#f4f2ee',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {research.title}
            </h1>

            {/* Author row */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 18,
                marginTop: 20,
                alignItems: 'center',
              }}
            >
              {research.author && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: '#161614',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      color: '#b6b4af',
                      overflow: 'hidden',
                    }}
                  >
                    {research.author.avatar ? (
                      <img
                        src={research.author.avatar}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      authorInitials
                    )}
                  </div>
                  <div>
                    <Link
                      to={`/profile/${research.author.id || research.author.username}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: '#d8d6d1',
                          fontWeight: 500,
                          fontFamily: "'IBM Plex Sans', sans-serif",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#e0815e')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#d8d6d1')}
                      >
                        {research.author.name}
                      </div>
                    </Link>
                    {research.author.username && (
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 11,
                          color: '#5a5a56',
                        }}
                      >
                        @{research.author.username}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Follow button */}
              {isAuthenticated() && research.author?.id && user?.id !== research.author.id && (
                <button
                  onClick={handleFollow}
                  style={{
                    appearance: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    padding: '3px 10px',
                    border: following
                      ? '1px solid rgba(255,255,255,0.14)'
                      : '1px solid rgba(196,69,26,0.5)',
                    color: following ? '#76746f' : '#e0815e',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = following
                      ? 'rgba(255,255,255,0.28)'
                      : 'rgba(196,69,26,0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = following
                      ? 'rgba(255,255,255,0.14)'
                      : 'rgba(196,69,26,0.5)';
                  }}
                >
                  {following ? 'Siguiendo' : '+ Seguir'}
                </button>
              )}
            </div>

            {/* Abstract */}
            {research.abstract && (
              <section
                style={{
                  marginTop: 30,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#0d0d0c',
                  padding: '22px 24px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                    marginBottom: 12,
                  }}
                >
                  RESUMEN
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'IBM Plex Serif', Georgia, serif",
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: '#cfcdc8',
                  }}
                >
                  {research.abstract}
                </p>
              </section>
            )}

            {/* Cover image */}
            {research.coverUrl && (
              <figure
                style={{
                  margin: '30px 0',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#0d0d0c',
                }}
              >
                <img
                  src={research.coverUrl}
                  alt={research.title}
                  style={{ width: '100%', display: 'block', objectFit: 'cover' }}
                />
                <figcaption
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: '#6f6f6a',
                    padding: '12px 22px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    background: '#0a0a0a',
                  }}
                >
                  FIG — {research.title}
                </figcaption>
              </figure>
            )}

            {/* Body */}
            {research.content && (
              <div
                className="research-body"
                style={{ marginTop: 36 }}
                dangerouslySetInnerHTML={{ __html: research.content }}
              />
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div
                style={{
                  marginTop: 36,
                  paddingTop: 24,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: '#86847f',
                      border: '1px solid rgba(255,255,255,0.09)',
                      padding: '3px 10px',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(196,69,26,0.5)';
                      e.currentTarget.style.color = '#e0815e';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                      e.currentTarget.style.color = '#86847f';
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Citation box */}
            <div
              style={{
                marginTop: 44,
                paddingTop: 24,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10.5,
                  letterSpacing: '0.14em',
                  color: '#76746f',
                  marginBottom: 14,
                }}
              >
                CITAR COMO
              </div>
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#0c0c0b',
                  padding: '13px 16px',
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: '#9a9a95',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {`${research.author?.name || 'Autor'} (${new Date(research.createdAt).getFullYear()}). ${research.title}. Artix Hub${research.category ? ` — ${research.category}` : ''}.`}
                </pre>
              </div>
            </div>

            {/* Share row */}
            <div
              style={{
                marginTop: 32,
                display: 'flex',
                gap: 9,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={handleSave}
                disabled={saveLoading}
                style={{
                  appearance: 'none',
                  cursor: saveLoading ? 'wait' : 'pointer',
                  background: saved ? 'rgba(196,69,26,0.1)' : 'none',
                  border: `1px solid ${saved ? 'rgba(196,69,26,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: saved ? '#e0815e' : '#9a9a95',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11.5,
                  padding: '9px 16px',
                  display: 'flex',
                  gap: 9,
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  if (!saveLoading) e.currentTarget.style.borderColor = saved ? 'rgba(196,69,26,0.7)' : 'rgba(255,255,255,0.26)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = saved ? 'rgba(196,69,26,0.4)' : 'rgba(255,255,255,0.1)';
                }}
              >
                <span style={{ color: '#e0815e' }}>{saved ? '★' : '☆'}</span>
                <span>{saved ? 'Guardado' : 'Guardar paper'}</span>
              </button>
              <button
                onClick={handleShare}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#9a9a95',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11.5,
                  padding: '9px 16px',
                  display: 'flex',
                  gap: 9,
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.26)';
                  e.currentTarget.style.color = '#e9e7e3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#9a9a95';
                }}
              >
                <span style={{ color: '#76746f' }}>↗</span>
                <span>Compartir</span>
              </button>
            </div>
          </main>

          {/* ── Right rail ── */}
          <aside
            style={{
              position: 'sticky',
              top: 84,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {/* Metrics 2x2 */}
            <section style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div
                  style={{
                    padding: 16,
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 22,
                      color: '#e0815e',
                    }}
                  >
                    {fmtCount(research.viewCount || 0)}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      color: '#6f6f6a',
                      marginTop: 4,
                    }}
                  >
                    LECTURAS
                  </div>
                </div>
                <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 22,
                      color: '#e9e7e3',
                    }}
                  >
                    {savedCount}
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      color: '#6f6f6a',
                      marginTop: 4,
                    }}
                  >
                    GUARDADOS
                  </div>
                </div>
                <div
                  style={{
                    padding: 16,
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 22,
                      color: '#e9e7e3',
                    }}
                  >
                    —
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      color: '#6f6f6a',
                      marginTop: 4,
                    }}
                  >
                    CITAS
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 22,
                      color: '#e9e7e3',
                    }}
                  >
                    —
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      color: '#6f6f6a',
                      marginTop: 4,
                    }}
                  >
                    ALTMETRIC
                  </div>
                </div>
              </div>
            </section>

            {/* Save CTA (full width) */}
            <button
              onClick={handleSave}
              disabled={saveLoading}
              style={{
                appearance: 'none',
                cursor: saveLoading ? 'wait' : 'pointer',
                width: '100%',
                padding: '13px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                letterSpacing: '0.06em',
                border: `1px solid ${saved ? 'rgba(196,69,26,0.6)' : 'rgba(255,255,255,0.14)'}`,
                background: saved ? 'rgba(196,69,26,0.14)' : '#0f0f0e',
                color: saved ? '#e0815e' : '#b6b4af',
                opacity: saveLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!saveLoading) {
                  e.currentTarget.style.borderColor = saved
                    ? 'rgba(196,69,26,0.9)'
                    : 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.color = saved ? '#f2a07d' : '#e9e7e3';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = saved
                  ? 'rgba(196,69,26,0.6)'
                  : 'rgba(255,255,255,0.14)';
                e.currentTarget.style.color = saved ? '#e0815e' : '#b6b4af';
              }}
            >
              {saved ? '★ GUARDADO' : '☆ GUARDAR PAPER'}
            </button>

            {/* TOC */}
            {toc.length > 0 && (
              <section style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                  }}
                >
                  CONTENIDO
                </div>
                <nav style={{ display: 'flex', flexDirection: 'column' }}>
                  {toc.map((entry) => {
                    const on = activeToc === entry.id;
                    return (
                      <a
                        key={entry.id}
                        href={`#${entry.id}`}
                        style={{
                          textDecoration: 'none',
                          fontSize: 12.5,
                          padding: '9px 16px',
                          borderLeft: `2px solid ${on ? '#C4451A' : 'transparent'}`,
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          color: on ? '#e9e7e3' : '#7a7a75',
                          background: on ? 'rgba(196,69,26,0.06)' : 'transparent',
                          fontFamily: "'IBM Plex Sans', sans-serif",
                          lineHeight: 1.4,
                        }}
                        onMouseEnter={(e) => {
                          if (!on) e.currentTarget.style.color = '#b6b4af';
                        }}
                        onMouseLeave={(e) => {
                          if (!on) e.currentTarget.style.color = '#7a7a75';
                        }}
                      >
                        {entry.label}
                      </a>
                    );
                  })}
                </nav>
              </section>
            )}

            {/* Author card */}
            {research.author && (
              <section
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                    marginBottom: 12,
                  }}
                >
                  AUTOR
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: '#161614',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      color: '#b6b4af',
                      overflow: 'hidden',
                    }}
                  >
                    {research.author.avatar ? (
                      <img
                        src={research.author.avatar}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      authorInitials
                    )}
                  </div>
                  <div>
                    <Link
                      to={`/profile/${research.author.id || research.author.username}`}
                      style={{
                        textDecoration: 'none',
                        fontSize: 13,
                        color: '#d8d6d1',
                        fontWeight: 500,
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        display: 'block',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#e0815e')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#d8d6d1')}
                    >
                      {research.author.name}
                    </Link>
                    {research.author.username && (
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 11,
                          color: '#5a5a56',
                        }}
                      >
                        @{research.author.username}
                      </div>
                    )}
                  </div>
                </div>
                {isAuthenticated() && research.author.id && user?.id !== research.author.id && (
                  <button
                    onClick={handleFollow}
                    style={{
                      appearance: 'none',
                      cursor: 'pointer',
                      marginTop: 12,
                      width: '100%',
                      padding: '7px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      border: following
                        ? '1px solid rgba(255,255,255,0.14)'
                        : '1px solid rgba(196,69,26,0.5)',
                      background: 'none',
                      color: following ? '#76746f' : '#e0815e',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = following
                        ? 'rgba(255,255,255,0.28)'
                        : 'rgba(196,69,26,0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = following
                        ? 'rgba(255,255,255,0.14)'
                        : 'rgba(196,69,26,0.5)';
                    }}
                  >
                    {following ? 'SIGUIENDO' : '+ SEGUIR'}
                  </button>
                )}
              </section>
            )}

            {/* Published date */}
            {research.createdAt && (
              <section
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.14em',
                    color: '#76746f',
                    marginBottom: 10,
                  }}
                >
                  PUBLICADO
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 13,
                    color: '#b6b4af',
                  }}
                >
                  {fmtDate(research.createdAt)}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            zIndex: 999,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            letterSpacing: '0.04em',
            color: '#0a0a0a',
            background: toast.type === 'err' ? '#b83a1a' : '#C4451A',
            padding: '10px 18px',
            pointerEvents: 'none',
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default ResearchView;
