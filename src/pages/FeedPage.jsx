import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FeedItem from '../components/ui/FeedItem';
import { BACKEND_URL } from '../config/client';

// ── Skeleton loader ──────────────────────────────────────────────────────────
const SkeletonItem = () => (
  <div style={{ paddingTop: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
    <div className="flex items-center gap-2 mb-3">
      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--surface)', flexShrink: 0 }} className="skeleton-pulse" />
      <div style={{ width: 120, height: 12, backgroundColor: 'var(--surface)' }} className="skeleton-pulse" />
    </div>
    <div style={{ width: 80, height: 10, backgroundColor: 'var(--surface)', marginBottom: 10 }} className="skeleton-pulse" />
    <div style={{ width: '70%', height: 20, backgroundColor: 'var(--surface)', marginBottom: 8 }} className="skeleton-pulse" />
    <div style={{ width: '90%', height: 12, backgroundColor: 'var(--surface)', marginBottom: 4 }} className="skeleton-pulse" />
    <div style={{ width: '60%', height: 12, backgroundColor: 'var(--surface)' }} className="skeleton-pulse" />
  </div>
);

// ── Tier badge ───────────────────────────────────────────────────────────────
const TIER_COLORS = {
  OBSERVER: 'var(--muted)',
  STUDENT: '#2563eb',
  RESEARCHER: 'var(--accent)',
  TEAM: '#7c3aed',
  VISIONARY: '#d97706',
};

const TierBadge = ({ tier }) => (
  <span
    className="font-sans text-xs uppercase tracking-wider"
    style={{ color: TIER_COLORS[tier] || 'var(--muted)', fontWeight: 600 }}
  >
    {tier}
  </span>
);

// ── Suggestion card ──────────────────────────────────────────────────────────
const SuggestionCard = ({ user, onFollow }) => {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const getCsrf = () => {
    for (const c of document.cookie.split(';')) {
      const [k, v] = c.trim().split('=');
      if (k === 'csrf') return v;
    }
    return '';
  };

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
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      {user.avatar ? (
        <img
          src={user.avatar}
          alt=""
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0, backgroundColor: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>
            {(user.name || '?')[0].toUpperCase()}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Link
          to={`/profile/${user.id}`}
          className="font-sans text-sm font-medium block truncate transition-colors duration-150"
          style={{ color: 'var(--text)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text)'; }}
        >
          {user.name}
        </Link>
        <TierBadge tier={user.tier} />
      </div>
      <button
        onClick={handleFollow}
        disabled={loading}
        className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
        style={{
          background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
          padding: '0.3rem 0.75rem', color: following ? 'var(--muted)' : 'var(--accent)',
          borderColor: following ? 'var(--border)' : 'var(--accent)', flexShrink: 0,
        }}
      >
        {following ? 'Siguiendo' : 'Seguir'}
      </button>
    </div>
  );
};

// ── FeedPage ─────────────────────────────────────────────────────────────────
const FeedPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/feed?page=${page}&limit=20`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setItems(prev => replace ? data.items : [...prev, ...data.items]);
        setPagination({ page: data.pagination.page, hasMore: data.pagination.hasMore });
        setIsPersonalized(data.isPersonalized);
      }
    } catch (_) {}
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/feed/suggestions`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setSuggestions(data.suggestions);
    } catch (_) {}
  };

  const handleLoadMore = () => {
    fetchFeed(pagination.page + 1, false);
  };

  const handleFollowUser = (userId) => {
    setSuggestions(prev => prev.filter(u => u.id !== userId));
  };

  const FILTERS = [
    { id: 'all', label: 'Para ti' },
    { id: 'article', label: 'Artículos' },
    { id: 'research', label: 'Investigaciones' },
    { id: 'post', label: 'Blog' },
  ];

  const filteredItems = activeFilter === 'all'
    ? items
    : items.filter(item => item.type === activeFilter || (activeFilter === 'article' && item.type === 'featured'));

  const userStats = user
    ? { name: user.name || user.username || 'Usuario', avatar: user.avatar, username: user.username }
    : null;

  return (
    <div className="site-container py-12" style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes skeleton-shimmer {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .skeleton-pulse { animation: skeleton-shimmer 1.4s ease-in-out infinite; }
      `}</style>

      <div className="flex gap-8 items-start">

        {/* ── Left sidebar ───────────────────────────────────────────────────── */}
        <aside
          className="hidden lg:block flex-shrink-0"
          style={{ width: 240, position: 'sticky', top: 90 }}
        >
          {userStats && (
            <div style={{ marginBottom: '2rem' }}>
              <div className="flex items-center gap-3 mb-4">
                {userStats.avatar ? (
                  <img
                    src={userStats.avatar}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '1.1rem', color: 'var(--muted)', fontWeight: 700 }}>
                      {(userStats.name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-sans font-medium text-sm" style={{ color: 'var(--text)' }}>
                    {userStats.name}
                  </p>
                  {userStats.username && (
                    <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                      @{userStats.username}
                    </p>
                  )}
                </div>
              </div>
              <Link
                to="/profile"
                className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
              >
                Ver perfil →
              </Link>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <p className="font-sans text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Explorar
            </p>
            <nav className="flex flex-col gap-1">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className="font-sans text-sm text-left py-2 transition-colors duration-150"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: activeFilter === f.id ? 'var(--accent)' : 'var(--muted)',
                    fontWeight: activeFilter === f.id ? 600 : 400,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Main feed ──────────────────────────────────────────────────────── */}
        <main className="flex-1" style={{ maxWidth: 680, minWidth: 0 }}>
          <div className="mb-8" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h1 className="font-display" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--text)' }}>
              Tu Feed
            </h1>
          </div>

          {/* Mobile filters */}
          <div className="flex gap-4 mb-6 lg:hidden" style={{ overflowX: 'auto', paddingBottom: 4 }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className="font-sans text-xs uppercase tracking-wider flex-shrink-0"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: activeFilter === f.id ? 'var(--accent)' : 'var(--muted)',
                  fontWeight: activeFilter === f.id ? 600 : 400,
                  paddingBottom: 4,
                  borderBottom: activeFilter === f.id ? '1px solid var(--accent)' : '1px solid transparent',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Empty state — not following anyone */}
          {!loading && !isPersonalized && (
            <div
              className="mb-6 flex items-center justify-between"
              style={{ backgroundColor: 'var(--surface)', padding: '1rem 1.25rem' }}
            >
              <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                Sigue a otros investigadores para personalizar tu feed.
              </p>
              <button
                onClick={() => suggestionsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="font-sans text-xs uppercase tracking-wider flex-shrink-0 ml-4 transition-colors duration-150"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
              >
                Ver sugerencias →
              </button>
            </div>
          )}

          {/* Skeleton */}
          {loading && [1, 2, 3, 4].map(i => <SkeletonItem key={i} />)}

          {/* Feed items */}
          {!loading && filteredItems.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-display mb-2" style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>
                Sin contenido aún
              </p>
              <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                Sigue a más usuarios o explora la plataforma.
              </p>
            </div>
          )}

          {!loading && filteredItems.map(item => (
            <FeedItem key={`${item.type}-${item.id}`} item={item} />
          ))}

          {/* Load more */}
          {!loading && pagination.hasMore && activeFilter === 'all' && (
            <div className="py-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn btn-outline"
                style={{ opacity: loadingMore ? 0.6 : 1 }}
              >
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </main>

        {/* ── Right sidebar ──────────────────────────────────────────────────── */}
        <aside
          className="hidden xl:block flex-shrink-0"
          style={{ width: 280, position: 'sticky', top: 90 }}
        >
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <p className="font-sans text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Sugerencias para seguir
            </p>
          </div>

          {suggestions.length === 0 ? (
            <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
              No hay sugerencias por ahora.
            </p>
          ) : (
            suggestions.map(u => (
              <SuggestionCard key={u.id} user={u} onFollow={handleFollowUser} />
            ))
          )}

          {suggestions.length > 0 && (
            <div className="mt-4">
              <Link
                to="/research"
                className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
              >
                Explorar investigaciones →
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile suggestions (below feed) */}
      <div ref={suggestionsRef} className="xl:hidden mt-12">
        {suggestions.length > 0 && (
          <section>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
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
  );
};

export default FeedPage;
