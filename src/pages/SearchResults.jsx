import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const SECTIONS = [
  { key: 'articles',  label: 'Artículos' },
  { key: 'research',  label: 'Investigaciones' },
  { key: 'posts',     label: 'Blog' },
  { key: 'events',    label: 'Eventos' },
  { key: 'users',     label: 'Usuarios' },
];

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

const getPath = (key, item) => {
  if (key === 'articles')  return `/articles/${item.id}`;
  if (key === 'research')  return `/research/${item.id}`;
  if (key === 'posts')     return `/blog/${item.id}`;
  if (key === 'events')    return `/events/${item.id}`;
  if (key === 'users')     return `/profile/${item.id}`;
  return '/';
};

const ResultRow = ({ item, sectionKey, onNavigate }) => {
  const title    = item.title || item.name || `@${item.username}`;
  const subtitle = item.author?.name || item.creator?.name || (item.username ? `@${item.username}` : '');
  const date     = item.createdAt || item.date;

  return (
    <button
      onClick={() => onNavigate(getPath(sectionKey, item))}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        width: '100%',
        padding: '0.875rem 0',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--text)',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#C4451A'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; }}
    >
      <span style={{ fontFamily: SANS, fontSize: '0.9375rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      {subtitle && (
        <span
          className="hidden sm:block"
          style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', flexShrink: 0, minWidth: 100, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}
        >
          {subtitle}
        </span>
      )}
      {date && (
        <span
          className="hidden md:block"
          style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', flexShrink: 0, width: 90, textAlign: 'right' }}
        >
          {formatDate(date)}
        </span>
      )}
    </button>
  );
};

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    const controller = new AbortController();
    setLoading(true);
    setResults(null);
    fetch(`${BACKEND_URL}/api/search/global?q=${encodeURIComponent(q)}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setResults(d.results); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [q]);

  const total = results
    ? SECTIONS.reduce((acc, { key }) => acc + (results[key]?.length || 0), 0)
    : 0;

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-12">

        {/* Header */}
        <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
          Búsqueda
        </p>
        <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--text)', lineHeight: 1.1, marginBottom: '2.5rem' }}>
          {q ? `"${q}"` : 'Sin término'}
        </h1>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: '#C4451A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Buscando…
            </span>
          </div>
        )}

        {!loading && results && total === 0 && (
          <div style={{ paddingTop: '4rem', textAlign: 'center' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Sin resultados
            </p>
            <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--muted)' }}>
              No se encontró nada para "{q}"
            </p>
          </div>
        )}

        {!loading && results && total > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {SECTIONS.map(({ key, label }) => {
              const items = results[key];
              if (!items?.length) return null;
              return (
                <section key={key}>
                  <p style={{ fontFamily: MONO, fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                    {label}{' '}
                    <span style={{ fontFamily: MONO, color: 'var(--muted)' }}>({items.length})</span>
                  </p>
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {items.map(item => (
                      <ResultRow key={item.id} item={item} sectionKey={key} onNavigate={navigate} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default SearchResults;
