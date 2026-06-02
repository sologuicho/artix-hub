import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config/client';

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
      className="flex items-center gap-4 w-full font-sans text-sm transition-colors duration-150"
      style={{
        padding: '0.875rem 0',
        borderBottom: '1px solid var(--border)',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--text)',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; }}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      {subtitle && (
        <span
          className="hidden sm:block text-xs"
          style={{ color: 'var(--muted)', flexShrink: 0, minWidth: 100, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}
        >
          {subtitle}
        </span>
      )}
      {date && (
        <span
          className="hidden md:block font-mono text-xs"
          style={{ color: 'var(--muted)', flexShrink: 0, width: 90, textAlign: 'right' }}
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
        <p className="font-sans text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
          Búsqueda
        </p>
        <h1
          className="font-display mb-10"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--text)', lineHeight: 1.1 }}
        >
          {q ? `"${q}"` : 'Sin término'}
        </h1>

        {loading && (
          <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>Buscando...</p>
        )}

        {!loading && results && total === 0 && (
          <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
            Sin resultados para '{q}'
          </p>
        )}

        {!loading && results && total > 0 && (
          <div className="flex flex-col" style={{ gap: '3rem' }}>
            {SECTIONS.map(({ key, label }) => {
              const items = results[key];
              if (!items?.length) return null;
              return (
                <section key={key}>
                  <p className="font-sans text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
                    {label} <span className="font-mono" style={{ marginLeft: '0.25rem' }}>({items.length})</span>
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
