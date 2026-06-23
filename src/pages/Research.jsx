import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtCount = (n) => {
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
  if (s === 'under_review' || s === 'en revisión' || s === 'en revision') {
    return {
      border: '1px solid rgba(255,255,255,0.14)',
      color: '#9a9a95',
      background: 'transparent',
    };
  }
  // preprint / draft
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
  if (s === 'under_review') return 'En revisión';
  if (s === 'draft') return 'Preprint';
  return status;
};

// ─── sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => (
  <span
    style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.1em',
      padding: '2px 7px',
      textTransform: 'uppercase',
      display: 'inline-block',
      ...statusBadgeStyle(status),
    }}
  >
    {statusLabel(status)}
  </span>
);

const PaperRow = ({ item }) => {
  const citeCount = item.viewCount || 0;
  const citeColor = citeCount >= 150 ? '#e0815e' : '#b6b4af';
  const tags = Array.isArray(item.tags)
    ? item.tags
    : typeof item.tags === 'string'
    ? item.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <article
      style={{
        padding: '24px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'grid',
        gridTemplateColumns: '64px minmax(0,1fr)',
        gap: 20,
      }}
    >
      {/* Citation / views column */}
      <div
        style={{
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.09)',
          padding: '11px 6px',
          alignSelf: 'start',
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 18,
            color: citeColor,
            lineHeight: 1,
          }}
        >
          {fmtCount(citeCount)}
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            letterSpacing: '0.08em',
            color: '#6f6f6a',
            marginTop: 5,
          }}
        >
          CITAS
        </div>
      </div>

      {/* Main content */}
      <div style={{ minWidth: 0 }}>
        {/* Meta row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            marginBottom: 9,
            flexWrap: 'wrap',
          }}
        >
          <StatusBadge status={item.status} />
          {item.category && (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: '#6f6f6a',
              }}
            >
              {item.category}
            </span>
          )}
          {item.category && item.createdAt && (
            <span style={{ color: '#3a3a36' }}>·</span>
          )}
          {item.createdAt && (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: '#6f6f6a',
              }}
            >
              {fmtDate(item.createdAt)}
            </span>
          )}
        </div>

        {/* Title */}
        <Link
          to={`/research/${item.id}`}
          style={{ textDecoration: 'none' }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              lineHeight: 1.34,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: '#eceae6',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#e0815e')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#eceae6')}
          >
            {item.title}
          </h3>
        </Link>

        {/* Author */}
        {item.author?.name && (
          <div
            style={{
              fontSize: 12.5,
              color: '#86847f',
              marginTop: 7,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {item.author.name}
            {item.author.username && (
              <span style={{ color: '#5a5a56' }}> · @{item.author.username}</span>
            )}
          </div>
        )}

        {/* Abstract */}
        {item.abstract && (
          <p
            style={{
              margin: '10px 0 0',
              fontFamily: "'IBM Plex Serif', Georgia, serif",
              fontSize: 13.5,
              lineHeight: 1.62,
              color: '#8a8a85',
              maxWidth: 660,
            }}
          >
            {item.abstract.length > 200
              ? item.abstract.slice(0, 200) + '…'
              : item.abstract}
          </p>
        )}

        {/* Tags + reads */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginTop: 15,
            flexWrap: 'wrap',
          }}
        >
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: '#86847f',
                    border: '1px solid rgba(255,255,255,0.09)',
                    padding: '2px 8px',
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
          <div style={{ flex: 1 }} />
          {citeCount > 0 && (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: '#6f6f6a',
                flexShrink: 0,
              }}
            >
              {fmtCount(citeCount)} lecturas
            </span>
          )}
          <a
            href={`${BACKEND_URL}/api/research/${item.id}/epub`}
            target="_blank"
            rel="noreferrer"
            style={{
              textDecoration: 'none',
              flexShrink: 0,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: '#9a9a95',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '4px 10px',
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
            EPUB
          </a>
        </div>
      </div>
    </article>
  );
};

// ─── main component ───────────────────────────────────────────────────────────

const SORTS = ['Citas', 'Recientes', 'Tendencia'];
const STATUS_OPTIONS = [
  { key: 'published',   label: 'Publicado' },
  { key: 'under_review', label: 'En revisión' },
  { key: 'draft',       label: 'Preprint' },
];
const PAGE_SIZE = 10;

const Research = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [allResearch, setAllResearch] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeField, setActiveField] = useState('Todos');
  const [activeSort, setActiveSort]   = useState('Citas');
  const [activeStatus, setActiveStatus] = useState({
    published: true,
    under_review: true,
    draft: true,
  });
  const [page, setPage]               = useState(1);
  const [totalCount, setTotalCount]   = useState(0);
  const [weekCount, setWeekCount]     = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Derive unique categories from fetched data
  const fields = ['Todos', ...Array.from(
    new Set(allResearch.map((r) => r.category).filter(Boolean))
  )];

  const fetchResearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100'); // fetch all then filter client-side for sort/field
      const res = await fetch(`${BACKEND_URL}/api/research?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        const list = data.research || [];
        setAllResearch(list);
        setTotalCount(list.length);
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setWeekCount(list.filter((r) => new Date(r.createdAt).getTime() > oneWeekAgo).length);
        setReviewCount(
          list.filter((r) => {
            const s = (r.status || '').toLowerCase();
            return s === 'under_review' || s === 'en revisión';
          }).length
        );
      }
    } catch (err) {
      console.error('Error fetching research:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResearch();
  }, [fetchResearch]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeField, activeSort, activeStatus]);

  // Filtered + sorted list
  const filtered = allResearch
    .filter((r) => {
      if (activeField !== 'Todos' && r.category !== activeField) return false;
      const s = (r.status || 'published').toLowerCase();
      if (s === 'published' || s === 'peer-reviewed' || s === 'publicado') return activeStatus.published;
      if (s === 'under_review' || s === 'en revisión' || s === 'en revision') return activeStatus.under_review;
      if (s === 'draft' || s === 'preprint') return activeStatus.draft;
      return activeStatus.published;
    })
    .sort((a, b) => {
      if (activeSort === 'Citas') return (b.viewCount || 0) - (a.viewCount || 0);
      if (activeSort === 'Recientes') return new Date(b.createdAt) - new Date(a.createdAt);
      // Tendencia: recent + views combo
      const score = (r) =>
        (r.viewCount || 0) / Math.max(1, (Date.now() - new Date(r.createdAt)) / 86400000);
      return score(b) - score(a);
    });

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = paginated.length < filtered.length;

  const resultLabel =
    filtered.length +
    ' resultado' + (filtered.length !== 1 ? 's' : '') +
    (activeField !== 'Todos' ? ' · ' + activeField : '');

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#e9e7e3',
        fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <style>{`
        ::selection { background: #C4451A; color: #fff; }
        @keyframes artixSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Title strip ── */}
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
            padding: '30px 28px 26px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10.5,
                letterSpacing: '0.16em',
                color: '#76746f',
                marginBottom: 9,
              }}
            >
              PREPRINTS &amp; PEER-REVIEWED
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 27,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#f4f2ee',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              Investigaciones
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 30 }}>
            {/* Aggregate stats */}
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", display: 'flex', gap: 30 }}>
              <div>
                <div style={{ fontSize: 19, color: '#e9e7e3' }}>{totalCount.toLocaleString('es-MX')}</div>
                <div style={{ fontSize: 10.5, letterSpacing: '0.1em', color: '#6f6f6a', marginTop: 2 }}>PAPERS</div>
              </div>
              <div>
                <div style={{ fontSize: 19, color: '#e9e7e3' }}>{weekCount}</div>
                <div style={{ fontSize: 10.5, letterSpacing: '0.1em', color: '#6f6f6a', marginTop: 2 }}>ESTA SEMANA</div>
              </div>
              <div>
                <div style={{ fontSize: 19, color: '#e0815e' }}>{reviewCount}</div>
                <div style={{ fontSize: 10.5, letterSpacing: '0.1em', color: '#6f6f6a', marginTop: 2 }}>EN REVISIÓN</div>
              </div>
            </div>

            {/* CTA */}
            {isAuthenticated() && (
              <Link
                to="/research/create"
                style={{
                  textDecoration: 'none',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  letterSpacing: '0.03em',
                  color: '#e0815e',
                  border: '1px solid rgba(196,69,26,0.5)',
                  padding: '7px 14px',
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(196,69,26,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Subir paper
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '228px minmax(0,1fr)',
            gap: 48,
            padding: '28px 0 72px',
            alignItems: 'start',
          }}
        >
          {/* ── Left filter panel ── */}
          <aside
            style={{
              position: 'sticky',
              top: 84,
              display: 'flex',
              flexDirection: 'column',
              gap: 26,
            }}
          >
            {/* Campo */}
            <div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10.5,
                  letterSpacing: '0.14em',
                  color: '#76746f',
                  marginBottom: 12,
                }}
              >
                CAMPO
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {fields.map((f) => {
                  const on = f === activeField;
                  return (
                    <button
                      key={f}
                      onClick={() => setActiveField(f)}
                      style={{
                        appearance: 'none',
                        border: 'none',
                        borderLeft: `2px solid ${on ? '#C4451A' : 'transparent'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        margin: '0 -10px',
                        textAlign: 'left',
                        fontSize: 13,
                        background: on ? 'rgba(196,69,26,0.1)' : 'transparent',
                        color: on ? '#eceae6' : '#86847f',
                        fontFamily: "'IBM Plex Sans', sans-serif",
                      }}
                    >
                      <span>{f}</span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 11,
                          color: '#5a5a56',
                        }}
                      >
                        {f === 'Todos'
                          ? allResearch.length
                          : allResearch.filter((r) => r.category === f).length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estado */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: 20,
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
                ESTADO
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {STATUS_OPTIONS.map(({ key, label }) => {
                  const on = !!activeStatus[key];
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setActiveStatus((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      style={{
                        appearance: 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        padding: 0,
                        textAlign: 'left',
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          flexShrink: 0,
                          border: `1px solid ${on ? '#C4451A' : 'rgba(255,255,255,0.18)'}`,
                          background: on ? '#C4451A' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: '#0a0a0a',
                        }}
                      >
                        {on ? '✓' : ''}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: on ? '#d4d2cd' : '#605f5a',
                          fontFamily: "'IBM Plex Sans', sans-serif",
                        }}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ── Results ── */}
          <main>
            {/* Sort bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: 14,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: '#86847f',
                }}
              >
                {loading ? 'Cargando…' : resultLabel}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {SORTS.map((s) => {
                  const on = s === activeSort;
                  return (
                    <button
                      key={s}
                      onClick={() => setActiveSort(s)}
                      style={{
                        appearance: 'none',
                        background: 'none',
                        border: 'none',
                        borderBottom: `1px solid ${on ? '#C4451A' : 'transparent'}`,
                        cursor: 'pointer',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11.5,
                        letterSpacing: '0.03em',
                        padding: '0 0 3px',
                        color: on ? '#e0815e' : '#76746f',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paper list */}
            {loading ? (
              <div
                style={{
                  padding: '80px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#C4451A',
                    borderRadius: '50%',
                    animation: 'artixSpin 0.8s linear infinite',
                  }}
                />
              </div>
            ) : paginated.length === 0 ? (
              <div
                style={{
                  padding: '80px 0',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: '#5a5a56',
                    letterSpacing: '0.1em',
                    marginBottom: 12,
                  }}
                >
                  SIN RESULTADOS
                </div>
                <p
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 14,
                    color: '#76746f',
                    margin: 0,
                  }}
                >
                  Ajusta los filtros o{' '}
                  {isAuthenticated() && (
                    <Link
                      to="/research/create"
                      style={{ color: '#e0815e', textDecoration: 'none' }}
                    >
                      sube el primer paper
                    </Link>
                  )}
                  {!isAuthenticated() && 'sé el primero en publicar.'}
                </p>
              </div>
            ) : (
              <>
                {paginated.map((item) => (
                  <PaperRow key={item.id} item={item} />
                ))}

                {/* Load more */}
                {hasMore && (
                  <div style={{ padding: '28px 0', textAlign: 'center' }}>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      style={{
                        appearance: 'none',
                        cursor: 'pointer',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12,
                        letterSpacing: '0.04em',
                        color: '#9a9a95',
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '11px 26px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)';
                        e.currentTarget.style.color = '#e9e7e3';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                        e.currentTarget.style.color = '#9a9a95';
                      }}
                    >
                      Cargar más resultados
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Research;
