import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';
import PricingModal from '../components/PricingModal';
import CommentSection from '../components/CommentSection';
import ContentActions from '../components/ContentActions';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const readTime = (content = '') =>
  Math.max(1, Math.round(content.replace(/<[^>]+>/g, '').split(/\s+/).length / 200));

const initials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase();

const getCsrfToken = () => {
  for (const c of document.cookie.split(';')) {
    const [n, v] = c.trim().split('=');
    if (n === 'csrf') return decodeURIComponent(v || '');
  }
  return '';
};

const fmtDate = d =>
  new Date(d).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

/* ─── Font size steps ── */
const FONT_STEPS = [15, 17, 19, 21];
const DEFAULT_STEP = 1; // 17px

/* ─── Extract H2 sections from HTML content ─────────────────────────────── */
const extractToc = (html = '') => {
  const matches = [...html.matchAll(/<h2[^>]*id="([^"]*)"[^>]*>(.*?)<\/h2>/gi)];
  if (matches.length > 0) {
    return matches.map(m => ({
      id: m[1],
      label: m[2].replace(/<[^>]+>/g, ''),
    }));
  }
  // Try without ids
  const noId = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)];
  return noId.map((m, i) => ({
    id: `section-${i}`,
    label: m[1].replace(/<[^>]+>/g, ''),
  }));
};

/* ─── ArticleView ────────────────────────────────────────────────────────── */
const ArticleView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  /* article data */
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  /* reading UX */
  const [fontStep, setFontStep] = useState(DEFAULT_STEP);
  const [focusMode, setFocusMode] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [progress, setProgress] = useState(0);

  /* author follow */
  const [following, setFollowing] = useState(false);

  /* TOC scroll-spy */
  const [toc, setToc] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const articleRef = useRef(null);

  /* comment count */
  const [commentCount, setCommentCount] = useState(0);

  /* ── Fetch article ── */
  const fetchArticle = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/articles/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (res.status === 403 && data.error === 'limit_reached') {
        setLimitReached(true);
        return;
      }
      if (data.ok && data.article) {
        setArticle(data.article);
        const sections = extractToc(data.article.content || '');
        setToc(sections);
        if (sections.length > 0) setActiveSection(sections[0].id);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchArticle(); }, [fetchArticle]);

  /* ── Check bookmark ── */
  useEffect(() => {
    if (!isAuthenticated()) return;
    fetch(`${BACKEND_URL}/api/saved/check?type=article&itemId=${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.ok) setBookmarked(d.saved); })
      .catch(() => {});
  }, [id, isAuthenticated]);

  /* ── Check follow ── */
  useEffect(() => {
    if (!article?.author?.id || !isAuthenticated()) return;
    if (user?.id === article.author.id) return;
    fetch(`${BACKEND_URL}/api/follow/${article.author.id}/check`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.ok) setFollowing(d.following); })
      .catch(() => {});
  }, [article, isAuthenticated, user]);

  /* ── Scroll progress + scroll-spy ── */
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, doc.scrollTop / max) : 0);

      if (toc.length === 0) return;
      let current = toc[0]?.id || '';
      for (const sec of toc) {
        const el = document.getElementById(sec.id);
        if (el && el.getBoundingClientRect().top < 140) current = sec.id;
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [toc]);

  /* ── Bookmark toggle ── */
  const handleBookmark = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await fetch(`${BACKEND_URL}/api/saved`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ type: 'article', itemId: id }),
      });
    } catch (_) { setBookmarked(!next); }
  };

  /* ── Follow toggle ── */
  const handleFollow = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    const next = !following;
    setFollowing(next);
    try {
      await fetch(`${BACKEND_URL}/api/follow/${article.author.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
    } catch (_) { setFollowing(!next); }
  };

  /* ── Typography ── */
  const bodyPx = FONT_STEPS[fontStep];
  const titlePx = 35 + (fontStep - DEFAULT_STEP) * 2;
  const deckPx = 18 + (fontStep - DEFAULT_STEP);
  const h2Px = 21 + (fontStep - DEFAULT_STEP);

  /* ── Loading ── */
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg)',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: '#C4451A',
            borderRadius: '50%',
            animation: 'av-spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes av-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Limit reached ── */
  if (limitReached) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
          backgroundColor: 'var(--bg)',
        }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.14em',
            color: '#e0815e',
            border: '1px solid rgba(196,69,26,0.4)',
            padding: '3px 8px',
            marginBottom: 20,
          }}
        >
          LÍMITE DIARIO
        </span>
        <h2
          style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 24,
            fontWeight: 600,
            color: '#f4f2ee',
            maxWidth: 460,
            marginBottom: 14,
          }}
        >
          Has alcanzado tu límite de lecturas diarias
        </h2>
        <p
          style={{
            fontFamily: "'IBM Plex Serif', Georgia, serif",
            fontSize: 15,
            color: '#8a8a85',
            maxWidth: 380,
            lineHeight: 1.7,
            marginBottom: 32,
            fontStyle: 'italic',
          }}
        >
          El plan Lector tiene un límite diario. Actualiza tu membresía para acceso ilimitado.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowPricing(true)}
            style={{
              appearance: 'none',
              background: 'rgba(196,69,26,0.12)',
              border: '1px solid rgba(196,69,26,0.5)',
              color: '#e0815e',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              letterSpacing: '0.04em',
              padding: '10px 22px',
              cursor: 'pointer',
            }}
          >
            VER PLANES
          </button>
          <button
            onClick={() => navigate('/articles')}
            style={{
              appearance: 'none',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#86847f',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              letterSpacing: '0.04em',
              padding: '10px 22px',
              cursor: 'pointer',
            }}
          >
            VOLVER
          </button>
        </div>
        <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
      </div>
    );
  }

  /* ── Not found ── */
  if (!article) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg)',
        }}
      >
        <p
          style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 18,
            color: '#6f6f6a',
            marginBottom: 20,
          }}
        >
          Artículo no encontrado
        </p>
        <button
          onClick={() => navigate('/articles')}
          style={{
            appearance: 'none',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#86847f',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            letterSpacing: '0.04em',
            padding: '10px 22px',
            cursor: 'pointer',
          }}
        >
          VOLVER A ARTÍCULOS
        </button>
      </div>
    );
  }

  const rt = readTime(article.content);
  const authorInitials = initials(article.author?.name || 'A');

  /* ─── Render ─── */
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Serif:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        @keyframes av-spin { to { transform: rotate(360deg); } }
        .av-body-content h2 {
          font-family: 'IBM Plex Sans', sans-serif;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: #f2f0ec;
          margin: 44px 0 16px;
          scroll-margin-top: 84px;
          font-size: ${h2Px}px;
        }
        .av-body-content h3 {
          font-family: 'IBM Plex Sans', sans-serif;
          font-weight: 600;
          color: #e9e7e3;
          margin: 32px 0 12px;
          font-size: ${h2Px - 2}px;
        }
        .av-body-content p {
          margin: 0 0 22px;
        }
        .av-body-content ul, .av-body-content ol {
          margin: 0 0 22px;
          padding-left: 22px;
        }
        .av-body-content li {
          margin-bottom: 10px;
        }
        .av-body-content blockquote {
          margin: 34px 0;
          padding: 6px 0 6px 24px;
          border-left: 2px solid #C4451A;
          font-style: italic;
          font-size: ${bodyPx + 2}px;
          line-height: 1.5;
          color: #ece9e4;
        }
        .av-body-content pre {
          margin: 30px 0;
          border: 1px solid rgba(255,255,255,0.1);
          background: #0c0c0b;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          line-height: 1.7;
          color: #b6b4af;
          padding: 16px 18px;
          overflow-x: auto;
        }
        .av-body-content code {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.88em;
          color: #e0815e;
          background: rgba(196,69,26,0.09);
          padding: 1px 4px;
        }
        .av-body-content pre code {
          background: none;
          padding: 0;
          font-size: inherit;
          color: inherit;
        }
        .av-body-content a {
          color: #e0815e;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .av-body-content strong {
          color: #e9e7e3;
          font-weight: 600;
        }
        .av-toc-link:hover {
          color: #e9e7e3 !important;
        }
      `}</style>

      {/* ── Fixed reading progress bar ── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 200,
          background: 'transparent',
          pointerEvents: 'none',
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

      {/* ── Reading controls bar ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(10,10,10,0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            maxWidth: focusMode ? 760 : 1180,
            margin: '0 auto',
            padding: '0 28px',
            height: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            transition: 'max-width 0.25s ease',
          }}
        >
          {/* Back */}
          <Link
            to="/articles"
            style={{
              textDecoration: 'none',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: '#76746f',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            ← Artículos
          </Link>

          <span style={{ color: '#3a3a36', fontSize: 13 }}>/</span>

          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: '#4a4a45',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {article.title}
          </span>

          {/* Font size controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--surface)',
              height: 34,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setFontStep(s => Math.max(0, s - 1))}
              style={{
                appearance: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9a9a95',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                padding: '0 11px',
                height: '100%',
              }}
            >
              A−
            </button>
            <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)' }} />
            <button
              onClick={() => setFontStep(s => Math.min(FONT_STEPS.length - 1, s + 1))}
              style={{
                appearance: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9a9a95',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 15,
                padding: '0 11px',
                height: '100%',
              }}
            >
              A+
            </button>
          </div>

          {/* Focus mode */}
          <button
            onClick={() => setFocusMode(f => !f)}
            style={{
              appearance: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              height: 34,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5,
              letterSpacing: '0.03em',
              padding: '0 13px',
              border: focusMode
                ? '1px solid rgba(196,69,26,0.5)'
                : '1px solid rgba(255,255,255,0.1)',
              background: focusMode ? 'rgba(196,69,26,0.12)' : 'var(--surface)',
              color: focusMode ? '#e0815e' : '#9a9a95',
            }}
          >
            ◧ {focusMode ? 'Salir' : 'Enfoque'}
          </button>

          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            style={{
              appearance: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              height: 34,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5,
              letterSpacing: '0.03em',
              padding: '0 13px',
              border: bookmarked
                ? '1px solid rgba(196,69,26,0.5)'
                : '1px solid rgba(255,255,255,0.1)',
              background: bookmarked ? 'rgba(196,69,26,0.12)' : 'var(--surface)',
              color: bookmarked ? '#e0815e' : '#9a9a95',
            }}
          >
            {bookmarked ? '★ Guardado' : '☆ Guardar'}
          </button>

          {/* Content actions (edit/delete for author) */}
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

      {/* ── Main shell: TOC + article ── */}
      <div
        style={{
          maxWidth: focusMode ? 760 : 1180,
          margin: '0 auto',
          padding: '0 28px',
          display: 'grid',
          gridTemplateColumns: focusMode ? '1fr' : '210px minmax(0,1fr)',
          gap: focusMode ? 0 : 56,
          alignItems: 'start',
          paddingTop: 48,
          paddingBottom: 96,
          transition: 'max-width 0.25s ease',
        }}
      >
        {/* ── TOC sidebar ── */}
        {!focusMode && (
          <aside>
            <div style={{ position: 'sticky', top: 88 }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10.5,
                  letterSpacing: '0.14em',
                  color: '#76746f',
                  marginBottom: 14,
                }}
              >
                CONTENIDO
              </div>
              {toc.length > 0 ? (
                <nav
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {toc.map(sec => {
                    const on = sec.id === activeSection;
                    return (
                      <a
                        key={sec.id}
                        href={`#${sec.id}`}
                        className="av-toc-link"
                        style={{
                          textDecoration: 'none',
                          fontSize: 12.5,
                          lineHeight: 1.4,
                          padding: '5px 0 5px 14px',
                          marginLeft: -1,
                          borderLeft: `2px solid ${on ? '#C4451A' : 'transparent'}`,
                          color: on ? '#e9e7e3' : '#7a7a75',
                          transition: 'color 0.15s, border-color 0.15s',
                          display: 'block',
                        }}
                      >
                        {sec.label}
                      </a>
                    );
                  })}
                </nav>
              ) : (
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: '#46463f',
                    paddingLeft: 14,
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  —
                </div>
              )}

              {/* Sidebar actions */}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 11,
                }}
              >
                <button
                  onClick={() => {
                    const el = document.getElementById('comments-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    appearance: 'none',
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    color: '#9a9a95',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11.5,
                    padding: '7px 10px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ color: '#76746f' }}>❝</span>
                  <span>Discusión</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href).catch(() => {});
                  }}
                  style={{
                    appearance: 'none',
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    color: '#9a9a95',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11.5,
                    padding: '7px 10px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ color: '#76746f' }}>↗</span>
                  <span>Compartir</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* ── Article column ── */}
        <main
          ref={articleRef}
          style={{ maxWidth: focusMode ? '100%' : 720 }}
        >
          {/* Article header */}
          <div style={{ marginBottom: 30 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 18,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10.5,
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  padding: '3px 7px',
                  border: '1px solid rgba(196,69,26,0.45)',
                  color: '#e0815e',
                  background: 'rgba(196,69,26,0.09)',
                }}
              >
                {(article.category || 'ARTÍCULO').toUpperCase()}
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11.5,
                  color: '#6f6f6a',
                }}
              >
                {fmtDate(article.createdAt)}
              </span>
              <span style={{ color: '#3a3a36' }}>·</span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11.5,
                  color: '#6f6f6a',
                }}
              >
                {rt} min lectura
              </span>
              {article.viewCount != null && (
                <>
                  <span style={{ color: '#3a3a36' }}>·</span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11.5,
                      color: '#6f6f6a',
                    }}
                  >
                    {article.viewCount.toLocaleString('es-MX')} lecturas
                  </span>
                </>
              )}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: titlePx,
                lineHeight: 1.15,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#f4f2ee',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {article.title}
            </h1>

            {(article.summary || article.description) && (
              <p
                style={{
                  margin: '18px 0 0',
                  fontFamily: "'IBM Plex Serif', Georgia, serif",
                  fontSize: deckPx,
                  lineHeight: 1.5,
                  color: '#a6a49f',
                  fontStyle: 'italic',
                }}
              >
                {article.summary || article.description}
              </p>
            )}
          </div>

          {/* Author byline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              padding: '18px 0',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 38,
              flexWrap: 'wrap',
            }}
          >
            {/* Avatar */}
            {article.author?.avatar ? (
              <img
                src={article.author.avatar}
                alt=""
                style={{
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  objectFit: 'cover',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: '#161614',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13,
                  color: '#c4c2bd',
                }}
              >
                {authorInitials}
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <Link
                  to={`/profile/${article.author?.id}`}
                  style={{
                    textDecoration: 'none',
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: '#e9e7e3',
                  }}
                >
                  {article.author?.name || 'Anónimo'}
                </Link>
                {article.author?.username && (
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10.5,
                      color: '#76746f',
                      border: '1px solid rgba(255,255,255,0.12)',
                      padding: '1px 6px',
                    }}
                  >
                    @{article.author.username}
                  </span>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Follow button — only for other users */}
            {isAuthenticated() && user?.id !== article.author?.id && article.author?.id && (
              <button
                onClick={handleFollow}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  letterSpacing: '0.02em',
                  padding: '8px 16px',
                  border: following
                    ? '1px solid rgba(255,255,255,0.16)'
                    : '1px solid rgba(196,69,26,0.5)',
                  background: following ? 'transparent' : 'rgba(196,69,26,0.12)',
                  color: following ? '#8a8a85' : '#e0815e',
                }}
              >
                {following ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
          </div>

          {/* Article body */}
          <div
            className="av-body-content"
            style={{
              fontFamily: "'IBM Plex Serif', Georgia, serif",
              fontSize: bodyPx,
              lineHeight: 1.72,
              color: '#cfcdc8',
            }}
            dangerouslySetInnerHTML={{ __html: article.content || '' }}
          />

          {/* Tags */}
          {article.tags?.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 30,
                paddingTop: 24,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {article.tags.map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11.5,
                    color: '#86847f',
                    border: '1px solid rgba(255,255,255,0.09)',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(196,69,26,0.5)';
                    e.currentTarget.style.color = '#e0815e';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                    e.currentTarget.style.color = '#86847f';
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Author card */}
          <div
            style={{
              marginTop: 42,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--surface)',
              padding: 24,
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            {article.author?.avatar ? (
              <img
                src={article.author.avatar}
                alt=""
                style={{
                  width: 54,
                  height: 54,
                  flexShrink: 0,
                  objectFit: 'cover',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 54,
                  height: 54,
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: '#161614',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 16,
                  color: '#c4c2bd',
                }}
              >
                {authorInitials}
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <Link
                to={`/profile/${article.author?.id}`}
                style={{
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#e9e7e3',
                  display: 'block',
                  marginBottom: 7,
                }}
              >
                {article.author?.name || 'Anónimo'}
              </Link>
              {article.author?.bio && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: '#8a8a85',
                  }}
                >
                  {article.author.bio}
                </p>
              )}
            </div>

            {isAuthenticated() && user?.id !== article.author?.id && article.author?.id && (
              <button
                onClick={handleFollow}
                style={{
                  appearance: 'none',
                  alignSelf: 'flex-start',
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  letterSpacing: '0.02em',
                  padding: '8px 16px',
                  border: following
                    ? '1px solid rgba(255,255,255,0.16)'
                    : '1px solid rgba(196,69,26,0.5)',
                  background: following ? 'transparent' : 'rgba(196,69,26,0.12)',
                  color: following ? '#8a8a85' : '#e0815e',
                }}
              >
                {following ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
          </div>

          {/* Comments */}
          <div
            id="comments-section"
            style={{ marginTop: 42 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#eceae6',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                Discusión
              </h3>
            </div>

            {/* Comment composer */}
            {isAuthenticated() ? (
              <div style={{ display: 'flex', gap: 11, marginBottom: 24 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: '#161614',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: '#b6b4af',
                  }}
                >
                  {initials(user?.name || user?.username || 'U')}
                </div>
                {/* CommentSection handles the actual composer */}
              </div>
            ) : null}

            <CommentSection articleId={article.id} />
          </div>
        </main>
      </div>

      {/* Pricing modal */}
      {showPricing && (
        <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
      )}
    </div>
  );
};

export default ArticleView;
