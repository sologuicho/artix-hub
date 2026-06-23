import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FeedItem from '../components/ui/FeedItem';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const getCsrf = () => {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === 'csrf') return v;
  }
  return '';
};

const SkeletonItem = () => (
  <div style={{ padding: '1.75rem 0', borderBottom: '1px solid var(--border)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div className="sk" style={{ width: 28, height: 28, backgroundColor: 'var(--surface)', flexShrink: 0 }} />
      <div className="sk" style={{ width: 110, height: 10, backgroundColor: 'var(--surface)' }} />
    </div>
    <div className="sk" style={{ width: '72%', height: 17, backgroundColor: 'var(--surface)', marginBottom: 8 }} />
    <div className="sk" style={{ width: '90%', height: 11, backgroundColor: 'var(--surface)', marginBottom: 4 }} />
    <div className="sk" style={{ width: '55%', height: 11, backgroundColor: 'var(--surface)' }} />
  </div>
);

const SuggestionCard = ({ user, onFollow }) => {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${user.id}`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrf() },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setFollowing(data.following);
        if (data.following) onFollow?.(user.id);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.875rem 0', borderBottom: '1px solid var(--border)' }}>
      {user.avatar ? (
        <img src={user.avatar} alt="" style={{ width: 30, height: 30, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 30, height: 30, flexShrink: 0, backgroundColor: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: MONO, fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)' }}>
            {(user.name || user.username || '?')[0].toUpperCase()}
          </span>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          to={`/profile/${user.id}`}
          style={{ fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; }}
        >
          {user.name || user.username}
        </Link>
        {user.username && (
          <span style={{ fontFamily: MONO, fontSize: '0.625rem', color: 'var(--muted)' }}>@{user.username}</span>
        )}
      </div>
      <button
        onClick={handleFollow}
        disabled={loading}
        style={{
          background: 'none',
          border: `1px solid ${following ? 'var(--border)' : '#C4451A'}`,
          cursor: loading ? 'not-allowed' : 'pointer',
          padding: '0.2rem 0.6rem',
          color: following ? 'var(--muted)' : '#C4451A',
          fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase',
          flexShrink: 0, transition: 'all 0.15s', opacity: loading ? 0.5 : 1,
        }}
      >
        {following ? 'Siguiendo' : 'Seguir'}
      </button>
    </div>
  );
};

const FILTERS = [
  { id: 'all', label: 'Para ti' },
  { id: 'article', label: 'Artículos' },
  { id: 'research', label: 'Papers' },
  { id: 'post', label: 'Blog' },
];

const FeedPage = () => {
  const { user } = useAuth();
  const suggestionsRef = useRef(null);

  const [items, setItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, hasMore: false });
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchFeed(1, true);
    fetchSuggestions();
  }, []);

  const fetchFeed = async (page = 1, replace = false) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/feed?page=${page}&limit=20`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setItems(prev => replace ? data.items : [...prev, ...data.items]);
        setPagination({ page: data.pagination.page, hasMore: data.pagination.hasMore });
        setIsPersonalized(data.isPersonalized);
      }
    } catch (_) {}
    finally { setLoading(false); setLoadingMore(false); }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/feed/suggestions`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setSuggestions(data.suggestions);
    } catch (_) {}
  };

  const handleFollowUser = (userId) => setSuggestions(prev => prev.filter(u => u.id !== userId));

  const filteredItems = activeFilter === 'all'
    ? items
    : items.filter(item => item.type === activeFilter || (activeFilter === 'article' && item.type === 'featured'));

  const activeLabel = FILTERS.find(f => f.id === activeFilter)?.label || 'Para ti';

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @keyframes sk { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.85; } }
        .sk { animation: sk 1.4s ease-in-out infinite; }
      `}</style>

      <div className="site-container py-10">
        <div style={{ display: 'flex', gap: '3rem', alignItems: 'start' }}>

          {/* ── Left sidebar ── */}
          <aside className="hidden lg:block" style={{ width: 200, flexShrink: 0, position: 'sticky', top: '5.5rem' }}>
            {user && (
              <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.875rem' }}>
                  {user.avatar ? (
                    <img src={user.avatar} alt="" style={{ width: 34, height: 34, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 34, height: 34, flexShrink: 0, backgroundColor: '#C4451A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontFamily: MONO, fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                        {(user.name || user.username || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p style={{ fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
                      {user.name || user.username}
                    </p>
                    {user.username && (
                      <p style={{ fontFamily: MONO, fontSize: '0.5625rem', color: 'var(--muted)', margin: 0 }}>
                        @{user.username}
                      </p>
                    )}
                  </div>
                </div>
                <Link
                  to="/profile"
                  style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#C4451A'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  Ver perfil →
                </Link>
              </div>
            )}

            <div>
              <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.875rem' }}>
                Contenido
              </p>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontFamily: SANS, fontSize: '0.875rem', textAlign: 'left',
                      padding: '0.4375rem 0 0.4375rem 12px',
                      color: activeFilter === f.id ? '#C4451A' : 'var(--muted)',
                      fontWeight: activeFilter === f.id ? 600 : 400,
                      borderLeft: activeFilter === f.id ? '2px solid #C4451A' : '2px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Main feed ── */}
          <main style={{ flex: 1, minWidth: 0, maxWidth: 660 }}>

            {/* Header */}
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  Feed /
                </span>
              </div>
              <h1 style={{ fontFamily: SANS, fontSize: 'clamp(1.625rem, 3.5vw, 2.125rem)', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>
                {activeLabel}
              </h1>
            </div>

            {/* Mobile filter pills */}
            <div className="flex gap-4 mb-6 lg:hidden" style={{ overflowX: 'auto', paddingBottom: 4 }}>
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                    fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: activeFilter === f.id ? '#C4451A' : 'var(--muted)',
                    fontWeight: activeFilter === f.id ? 600 : 400,
                    paddingBottom: 4,
                    borderBottom: activeFilter === f.id ? '1px solid #C4451A' : '1px solid transparent',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Not personalized banner */}
            {!loading && !isPersonalized && (
              <div style={{
                backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                padding: '0.875rem 1rem', marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
                  Sigue a otros investigadores para personalizar tu feed.
                </p>
                <button
                  onClick={() => suggestionsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                    fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4451A',
                  }}
                >
                  Ver sugerencias →
                </button>
              </div>
            )}

            {/* Skeleton */}
            {loading && [1, 2, 3, 4].map(i => <SkeletonItem key={i} />)}

            {/* Empty state */}
            {!loading && filteredItems.length === 0 && (
              <div style={{ padding: '4rem 0', textAlign: 'center' }}>
                <p style={{ fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  Sin contenido
                </p>
                <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--muted)', margin: 0 }}>
                  Sigue a más usuarios o explora la plataforma.
                </p>
              </div>
            )}

            {/* Items */}
            {!loading && filteredItems.map(item => (
              <FeedItem key={`${item.type}-${item.id}`} item={item} />
            ))}

            {/* Load more */}
            {!loading && pagination.hasMore && activeFilter === 'all' && (
              <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                <button
                  onClick={() => fetchFeed(pagination.page + 1, false)}
                  disabled={loadingMore}
                  style={{
                    fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                    background: 'none', border: '1px solid var(--border)', cursor: loadingMore ? 'not-allowed' : 'pointer',
                    color: 'var(--muted)', padding: '0.625rem 1.75rem', opacity: loadingMore ? 0.5 : 1, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!loadingMore) { e.currentTarget.style.borderColor = '#C4451A'; e.currentTarget.style.color = '#C4451A'; } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  {loadingMore ? 'Cargando…' : 'Cargar más'}
                </button>
              </div>
            )}
          </main>

          {/* ── Right sidebar ── */}
          <aside ref={suggestionsRef} className="hidden xl:block" style={{ width: 260, flexShrink: 0, position: 'sticky', top: '5.5rem' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
                Sugerencias para seguir
              </p>
            </div>

            {suggestions.length === 0 ? (
              <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--muted)' }}>
                No hay sugerencias por ahora.
              </p>
            ) : (
              suggestions.map(u => (
                <SuggestionCard key={u.id} user={u} onFollow={handleFollowUser} />
              ))
            )}

            {suggestions.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <Link
                  to="/research"
                  style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#C4451A'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  Explorar investigaciones →
                </Link>
              </div>
            )}
          </aside>

        </div>

        {/* Mobile suggestions (below feed on small screens) */}
        <div className="xl:hidden mt-10">
          {suggestions.length > 0 && (
            <section>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', margin: 0 }}>
                  Sugerencias para seguir
                </p>
              </div>
              {suggestions.map(u => (
                <SuggestionCard key={u.id} user={u} onFollow={handleFollowUser} />
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
