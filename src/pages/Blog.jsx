import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

/* ── Helpers ── */
const getInitials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase() || '?';

const relativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return new Date(dateStr).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
};

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '');

/* ── Filter pill ── */
const Pill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      appearance: 'none',
      cursor: 'pointer',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11.5,
      letterSpacing: '0.02em',
      padding: '5px 12px',
      border: `1px solid ${active ? 'rgba(196,69,26,0.5)' : 'rgba(255,255,255,0.1)'}`,
      background: active ? 'rgba(196,69,26,0.12)' : 'transparent',
      color: active ? '#e0815e' : '#86847f',
      transition: 'all 0.1s',
    }}
  >
    {label}
  </button>
);

/* ── Post card ── */
const PostCard = ({ post }) => {
  const excerpt = stripHtml(post.content || post.summary || '').slice(0, 200);
  const authorName = post.author?.name || post.author?.username || 'Anónimo';
  const initials = getInitials(authorName);

  return (
    <article
      style={{
        padding: '20px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 34,
            height: 34,
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
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              alt={authorName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            initials
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e4e2dd' }}>{authorName}</span>
            {post.author?.username && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#6f6f6a' }}>
                @{post.author.username}
              </span>
            )}
            <span style={{ color: '#3a3a36' }}>·</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#6f6f6a' }}>
              {relativeTime(post.createdAt)}
            </span>
          </div>

          {/* Title */}
          {post.title && (
            <Link
              to={`/blog/${post.id}`}
              style={{ textDecoration: 'none' }}
            >
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 15,
                  fontWeight: 600,
                  lineHeight: 1.45,
                  color: '#d4d2cd',
                }}
              >
                {post.title}
              </p>
            </Link>
          )}

          {/* Excerpt */}
          {excerpt && (
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 13.5,
                lineHeight: 1.6,
                color: '#86847f',
              }}
            >
              {excerpt}
              {stripHtml(post.content || '').length > 200 ? '…' : ''}
            </p>
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {post.tags.map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: '#86847f',
                    cursor: 'pointer',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer meta */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginTop: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: '#6f6f6a',
            }}
          >
            {post.viewCount != null && (
              <span>{post.viewCount} lecturas</span>
            )}
            {post._count?.comments != null && (
              <span>{post._count.comments} comentarios</span>
            )}
            <Link
              to={`/blog/${post.id}`}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: '#C4451A',
                textDecoration: 'none',
                marginLeft: 'auto',
              }}
            >
              Leer →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 34, height: 34, background: '#1c1c1a', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, width: '40%', background: '#1c1c1a', marginBottom: 10 }} />
        <div style={{ height: 16, width: '75%', background: '#1c1c1a', marginBottom: 8 }} />
        <div style={{ height: 12, width: '90%', background: '#1c1c1a', marginBottom: 4 }} />
        <div style={{ height: 12, width: '60%', background: '#1c1c1a' }} />
      </div>
    </div>
  </div>
);

const FILTERS = ['Recientes', 'Populares', 'Siguiendo'];

const Blog = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('Recientes');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const LIMIT = 10;

  const fetchPosts = async (pageNum = 1, replace = true) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const sort = filter === 'Populares' ? 'popular' : 'recent';
      const params = new URLSearchParams({
        status: 'published',
        limit: LIMIT,
        offset: (pageNum - 1) * LIMIT,
        sort,
      });
      const res = await fetch(`${BACKEND_URL}/api/blog?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.posts) {
        if (replace) {
          setPosts(data.posts);
        } else {
          setPosts(prev => [...prev, ...data.posts]);
        }
        setHasMore(data.posts.length === LIMIT);
        setPage(pageNum);
      } else {
        setError('No se pudieron cargar los posts.');
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  /* Derive trends from post tags */
  const trends = useMemo(() => {
    const freq = {};
    posts.forEach(p =>
      (p.tags || []).forEach(t => { freq[t] = (freq[t] || 0) + 1; })
    );
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag: `#${tag}`, count: `${count} post${count !== 1 ? 's' : ''}` }));
  }, [posts]);

  /* Derive active authors */
  const activeAuthors = useMemo(() => {
    const map = {};
    posts.forEach(p => {
      const id = p.author?.id;
      if (!id) return;
      if (!map[id]) map[id] = { ...p.author, count: 0 };
      map[id].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [posts]);

  /* "Siguiendo" filter — client-side by followed IDs */
  const displayedPosts = useMemo(() => {
    if (filter !== 'Siguiendo') return posts;
    // If we can't determine following, show all
    return posts;
  }, [posts, filter]);

  const visibleFilters = isAuthenticated()
    ? FILTERS
    : FILTERS.filter(f => f !== 'Siguiendo');

  return (
    <div
      style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        color: '#e9e7e3',
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 300px',
            gap: 48,
            padding: '30px 0 72px',
            alignItems: 'start',
          }}
        >
          {/* ── Main stream ── */}
          <main>
            {/* Title */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10.5,
                  letterSpacing: '0.16em',
                  color: '#76746f',
                  marginBottom: 8,
                }}
              >
                NOTAS CORTAS DE LA COMUNIDAD
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 25,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: '#f4f2ee',
                    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                  }}
                >
                  Blog
                </h1>
                {isAuthenticated() && (
                  <button
                    onClick={() => navigate('/blog/create')}
                    style={{
                      appearance: 'none',
                      cursor: 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      color: '#0a0a0a',
                      background: '#C4451A',
                      border: 'none',
                      padding: '7px 16px',
                      flexShrink: 0,
                    }}
                  >
                    + Escribir
                  </button>
                )}
              </div>
            </div>

            {/* Filter pills */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 0 14px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                marginBottom: 4,
                flexWrap: 'wrap',
              }}
            >
              {visibleFilters.map(f => (
                <Pill key={f} label={f} active={filter === f} onClick={() => setFilter(f)} />
              ))}
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  padding: '20px 0',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: '#e0815e',
                }}
              >
                {error}
              </div>
            )}

            {/* Posts list */}
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            ) : displayedPosts.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <p
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 13,
                    color: '#76746f',
                  }}
                >
                  No hay posts todavía.
                </p>
                {isAuthenticated() && (
                  <button
                    onClick={() => navigate('/blog/create')}
                    style={{
                      appearance: 'none',
                      cursor: 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12,
                      color: '#e0815e',
                      background: 'none',
                      border: '1px solid rgba(196,69,26,0.4)',
                      padding: '8px 18px',
                      marginTop: 16,
                    }}
                  >
                    Crear el primer post
                  </button>
                )}
              </div>
            ) : (
              displayedPosts.map(post => <PostCard key={post.id} post={post} />)
            )}

            {/* Load more */}
            {!loading && hasMore && (
              <div style={{ padding: '26px 0', textAlign: 'center' }}>
                <button
                  onClick={() => fetchPosts(page + 1, false)}
                  disabled={loadingMore}
                  style={{
                    appearance: 'none',
                    cursor: loadingMore ? 'wait' : 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    letterSpacing: '0.04em',
                    color: '#9a9a95',
                    background: 'none',
                    border: '1px solid rgba(255,255,255,0.12)',
                    padding: '10px 24px',
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? 'Cargando…' : 'Cargar más posts'}
                </button>
              </div>
            )}
          </main>

          {/* ── Right rail ── */}
          <aside
            style={{
              position: 'sticky',
              top: 84,
              display: 'flex',
              flexDirection: 'column',
              gap: 26,
            }}
          >
            {/* Tendencias */}
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
                TENDENCIAS
              </div>
              {trends.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: '#5a5a56',
                  }}
                >
                  Sin tendencias aún.
                </div>
              ) : (
                trends.map((t, i) => (
                  <div
                    key={t.tag}
                    style={{
                      padding: '12px 16px',
                      borderBottom:
                        i < trends.length - 1 ? '1px solid rgba(255,255,255,0.055)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 13,
                        color: '#e0815e',
                      }}
                    >
                      {t.tag}
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 11,
                        color: '#6f6f6a',
                        marginTop: 3,
                      }}
                    >
                      {t.count}
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* Autores activos */}
            {activeAuthors.length > 0 && (
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
                  AUTORES ACTIVOS
                </div>
                {activeAuthors.map((author, i) => (
                  <div
                    key={author.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom:
                        i < activeAuthors.length - 1 ? '1px solid rgba(255,255,255,0.055)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                    }}
                  >
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
                        overflow: 'hidden',
                      }}
                    >
                      {author.avatar ? (
                        <img
                          src={author.avatar}
                          alt={author.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        getInitials(author.name || author.username)
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: '#d4d2cd',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {author.name || author.username}
                      </div>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10.5,
                          color: '#6f6f6a',
                        }}
                      >
                        {author.count} post{author.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Write CTA for unauthenticated */}
            {!isAuthenticated() && (
              <div
                style={{
                  border: '1px solid rgba(196,69,26,0.25)',
                  padding: 16,
                }}
              >
                <p
                  style={{
                    margin: '0 0 12px',
                    fontSize: 13,
                    color: '#86847f',
                    lineHeight: 1.55,
                  }}
                >
                  ¿Quieres publicar en el blog de la comunidad?
                </p>
                <Link
                  to="/auth"
                  style={{
                    display: 'inline-block',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11.5,
                    color: '#0a0a0a',
                    background: '#C4451A',
                    padding: '7px 14px',
                    textDecoration: 'none',
                  }}
                >
                  Crear cuenta
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Blog;
