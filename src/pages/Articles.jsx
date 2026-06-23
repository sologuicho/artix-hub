import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

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

const fmtCount = n => {
  if (!n) return null;
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
};

/* ─── Featured card ────────────────────────────────────────────────────────── */
const FeaturedCard = ({ article }) => {
  const navigate = useNavigate();
  const rt = readTime(article.content);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => navigate(`/articles/${article.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        marginTop: 28,
        border: `1px solid ${hovered ? 'rgba(196,69,26,0.4)' : 'rgba(255,255,255,0.10)'}`,
        background: 'var(--surface)',
        display: 'flex',
        cursor: 'pointer',
        transition: 'border-color 0.18s',
      }}
    >
      {/* Left: hatched placeholder */}
      <div
        style={{
          position: 'relative',
          width: '44%',
          flexShrink: 0,
          minHeight: 262,
          backgroundImage:
            'repeating-linear-gradient(135deg,rgba(255,255,255,0.035) 0 1px,transparent 1px 9px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.12em',
            color: '#e0815e',
            border: '1px solid rgba(196,69,26,0.5)',
            background: 'rgba(10,10,10,0.6)',
            padding: '4px 8px',
          }}
        >
          DESTACADO
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.12em',
            color: '#46463f',
          }}
        >
          [ PORTADA ]
        </span>
      </div>

      {/* Right: meta */}
      <div
        style={{
          flex: 1,
          padding: '30px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5,
            letterSpacing: '0.12em',
            color: '#76746f',
          }}
        >
          {article.category ? article.category.toUpperCase() : 'ARTÍCULO'} · {rt} MIN
        </div>
        <h2
          style={{
            margin: '13px 0 0',
            fontSize: 28,
            lineHeight: 1.18,
            fontWeight: 600,
            letterSpacing: '-0.015em',
            color: '#f4f2ee',
          }}
        >
          {article.title}
        </h2>
        {article.summary && (
          <p
            style={{
              margin: '13px 0 0',
              fontFamily: "'IBM Plex Serif', Georgia, serif",
              fontSize: 15,
              lineHeight: 1.6,
              color: '#9a9a95',
              fontStyle: 'italic',
              maxWidth: 460,
            }}
          >
            {article.summary.length > 180 ? article.summary.slice(0, 180) + '…' : article.summary}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
          <div
            style={{
              width: 26,
              height: 26,
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
            {initials(article.author?.name || 'A')}
          </div>
          <span style={{ fontSize: 13, color: '#c8c6c1', fontWeight: 500 }}>
            {article.author?.name || 'Anónimo'}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: '#6f6f6a' }}>
            ·{' '}
            {new Date(article.createdAt).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
            })}
            {article.viewCount ? ` · ${fmtCount(article.viewCount)} lecturas` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── Article grid cell ────────────────────────────────────────────────────── */
const ArticleCell = ({ article, isRight }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const rt = readTime(article.content);

  return (
    <div
      onClick={() => navigate(`/articles/${article.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textDecoration: 'none',
        display: 'block',
        padding: isRight ? '24px 0 24px 28px' : '24px 28px 24px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        borderLeft: isRight ? '1px solid rgba(255,255,255,0.07)' : 'none',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.1em',
            color: '#e0815e',
            border: '1px solid rgba(196,69,26,0.4)',
            padding: '2px 7px',
          }}
        >
          {(article.category || 'ARTÍCULO').toUpperCase()}
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: '#6f6f6a',
          }}
        >
          {rt} min
        </span>
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: 19,
          lineHeight: 1.3,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: hovered ? '#e0815e' : '#eceae6',
          transition: 'color 0.15s',
        }}
      >
        {article.title}
      </h3>
      {article.summary && (
        <p
          style={{
            margin: '9px 0 0',
            fontFamily: "'IBM Plex Serif', Georgia, serif",
            fontSize: 14,
            lineHeight: 1.6,
            color: '#8a8a85',
          }}
        >
          {article.summary.length > 120 ? article.summary.slice(0, 120) + '…' : article.summary}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16 }}>
        <div
          style={{
            width: 23,
            height: 23,
            flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.14)',
            background: '#161614',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            color: '#b6b4af',
          }}
        >
          {initials(article.author?.name || 'A')}
        </div>
        <span style={{ fontSize: 12.5, color: '#c8c6c1' }}>{article.author?.name || 'Anónimo'}</span>
        <span style={{ flex: 1 }} />
        {article.viewCount != null && (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: '#6f6f6a',
            }}
          >
            {fmtCount(article.viewCount)}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Main page ────────────────────────────────────────────────────────────── */
const Articles = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [sort, setSort] = useState('Recientes'); // 'Recientes' | 'Popular'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 12;

  /* fetch categories once */
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/articles/categories`)
      .then(r => r.json())
      .then(d => {
        if (d.ok && Array.isArray(d.categories)) {
          setCategories(['Todos', ...d.categories]);
        }
      })
      .catch(() => {});
  }, []);

  /* fetch articles whenever category/sort changes */
  const fetchArticles = useCallback(
    async (reset = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ status: 'published', limit: String(LIMIT) });
        if (activeCategory !== 'Todos') params.set('category', activeCategory);
        const res = await fetch(`${BACKEND_URL}/api/articles?${params}`);
        const data = await res.json();
        if (data.ok) {
          const list = data.articles || [];
          setArticles(reset ? list : prev => [...prev, ...list]);
          setHasMore(list.length === LIMIT);
        }
      } catch (_) {}
      finally { setLoading(false); }
    },
    [activeCategory]
  );

  useEffect(() => {
    setPage(1);
    fetchArticles(true);
  }, [activeCategory]);

  /* client-side filter + sort */
  const filtered = articles.filter(a => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      a.title?.toLowerCase().includes(q) ||
      a.author?.name?.toLowerCase().includes(q)
    );
  });

  const sorted =
    sort === 'Popular'
      ? [...filtered].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      : filtered;

  const featured = sorted[0];
  const grid = sorted.slice(1);

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Serif:ital,wght@0,400;1,400&display=swap');
        .articles-search::placeholder { color: #5a5a56; }
      `}</style>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>

        {/* ── Page title ── */}
        <div
          style={{
            padding: '32px 0 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10.5,
              letterSpacing: '0.16em',
              color: '#76746f',
              marginBottom: 9,
            }}
          >
            ENSAYOS · ANÁLISIS · TUTORIALES EXTENSOS
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
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
              Artículos
            </h1>
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'var(--surface)',
                height: 34,
                padding: '0 11px',
                gap: 9,
                width: 210,
              }}
            >
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13,
                  color: '#5a5a56',
                }}
              >
                ⌕
              </span>
              <input
                className="articles-search"
                type="text"
                placeholder="Buscar artículos…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  width: '100%',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Featured ── */}
        {!loading && featured && <FeaturedCard article={featured} />}

        {/* ── Category tabs + sort ── */}
        <div
          style={{
            marginTop: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
            {(categories.length > 0 ? categories : ['Todos']).map(cat => {
              const on = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    appearance: 'none',
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${on ? '#C4451A' : 'transparent'}`,
                    marginBottom: -1,
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    letterSpacing: '0.03em',
                    padding: '14px 1px',
                    color: on ? '#eceae6' : '#6f6f6a',
                    transition: 'color 0.15s',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSort(s => (s === 'Recientes' ? 'Popular' : 'Recientes'))}
            style={{
              appearance: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5,
              color: '#86847f',
              padding: '0 0 14px',
              display: 'flex',
              gap: 7,
            }}
          >
            <span style={{ color: '#5a5a56' }}>orden:</span>
            <span style={{ color: '#e0815e' }}>{sort}</span>
          </button>
        </div>

        {/* ── Article grid ── */}
        {loading && articles.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 0',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                border: '2px solid rgba(255,255,255,0.1)',
                borderTopColor: '#C4451A',
                borderRadius: '50%',
                animation: 'articles-spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes articles-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : sorted.length === 0 ? (
          <div
            style={{
              padding: '80px 0',
              textAlign: 'center',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              color: '#6f6f6a',
            }}
          >
            {query
              ? `Sin resultados para "${query}"`
              : 'Aún no hay artículos publicados en esta categoría'}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0,
              paddingBottom: 64,
            }}
          >
            {grid.map((article, i) => (
              <ArticleCell key={article.id} article={article} isRight={i % 2 === 1} />
            ))}
          </div>
        )}

        {/* ── Load more ── */}
        {hasMore && !loading && sorted.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 64 }}>
            <button
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetchArticles(false);
              }}
              style={{
                appearance: 'none',
                background: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                letterSpacing: '0.06em',
                color: '#86847f',
                padding: '10px 28px',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(196,69,26,0.5)';
                e.currentTarget.style.color = '#e0815e';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = '#86847f';
              }}
            >
              CARGAR MÁS
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Articles;
