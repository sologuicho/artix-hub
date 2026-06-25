import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, MapPin, Briefcase, Users, Heart, MessageSquare, Settings, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const TABS = [
  { id: 'all',       label: 'Todos' },
  { id: 'articles',  label: 'Artículos' },
  { id: 'research',  label: 'Investigaciones' },
  { id: 'events',    label: 'Eventos' },
  { id: 'posts',     label: 'Posts' },
];

const TYPE_LABEL = { article: 'Artículo', research: 'Investigación', event: 'Evento', post: 'Post' };

const getRoute = (type, id) => {
  if (type === 'post')     return `/blog`;
  if (type === 'event')    return `/events/${id}`;
  if (type === 'research') return `/research/${id}`;
  return `/articles/${id}`;
};

const UserProfile = () => {
  const { userId } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [stats, setStats]               = useState({ articles: 0, research: 0, events: 0, posts: 0, followers: 0, following: 0 });
  const [content, setContent]           = useState({ articles: [], research: [], events: [], posts: [] });
  const [contentLoaded, setContentLoaded] = useState(false);
  const [following, setFollowing]       = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(true);
  const [expandedComments, setExpandedComments] = useState({});
  const [reactions, setReactions]       = useState({});

  useEffect(() => {
    if (userId) {
      fetchProfile();
      if (isAuthenticated()) checkFollowStatus();
      else setCheckingFollow(false);
    }
  }, [userId]);

  useEffect(() => {
    if (profileUser) fetchContent();
  }, [profileUser, activeTab, searchQuery]);

  const getCsrfToken = () => {
    for (const c of document.cookie.split(';')) {
      const [n, v] = c.trim().split('=');
      if (n === 'csrf') return v;
    }
    return null;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${BACKEND_URL}/api/users/${userId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) { setProfileUser(data.user); setStats(data.stats || stats); }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const checkFollowStatus = async () => {
    if (!currentUser || !userId || currentUser.id === userId) { setCheckingFollow(false); return; }
    try {
      const res  = await fetch(`${BACKEND_URL}/api/follow/${userId}/check`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setFollowing(data.following || false);
    } catch (_) {}
    finally { setCheckingFollow(false); }
  };

  const handleFollow = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    const prevFollowing = following;
    const prevStats     = stats;
    setFollowing(f => !f);
    setStats(prev => ({ ...prev, followers: !prevFollowing ? prev.followers + 1 : prev.followers - 1 }));
    try {
      const res  = await fetch(`${BACKEND_URL}/api/follow/${userId}`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) { setFollowing(prevFollowing); setStats(prevStats); }
    } catch (_) { setFollowing(prevFollowing); setStats(prevStats); }
  };

  const fetchContent = async () => {
    if (!profileUser) return;
    setContentLoaded(false);
    try {
      const baseParams = new URLSearchParams();
      if (searchQuery) baseParams.append('search', searchQuery);
      baseParams.append('limit', '100');

      if (activeTab === 'all') {
        const [aRes, rRes, eRes, pRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/articles?authorId=${userId}&${baseParams}`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/research?author=${userId}&${baseParams}`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/events?creatorId=${userId}&${baseParams}`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/blog?authorId=${userId}&${baseParams}`, { credentials: 'include' }),
        ]);
        const [aData, rData, eData, pData] = await Promise.all([aRes.json(), rRes.json(), eRes.json(), pRes.json()]);
        const posts = pData.ok ? (pData.posts || []) : [];
        const initReactions = {};
        posts.forEach(p => { initReactions[p.id] = p.reactions || {}; });
        setReactions(prev => ({ ...prev, ...initReactions }));
        setContent({
          articles: aData.ok ? (aData.articles || []) : [],
          research: rData.ok ? (rData.research || []) : [],
          events:   eData.ok ? (eData.events   || []) : [],
          posts,
        });
      } else {
        const params = new URLSearchParams(baseParams);
        let endpoint = '';
        if (activeTab === 'articles') { params.append('authorId', userId);  endpoint = `${BACKEND_URL}/api/articles?${params}`; }
        else if (activeTab === 'research') { params.append('author', userId); endpoint = `${BACKEND_URL}/api/research?${params}`; }
        else if (activeTab === 'events')   { params.append('creatorId', userId); endpoint = `${BACKEND_URL}/api/events?${params}`; }
        else if (activeTab === 'posts')    { params.append('authorId', userId);  endpoint = `${BACKEND_URL}/api/blog?${params}`; }

        if (endpoint) {
          const res  = await fetch(endpoint, { credentials: 'include' });
          const data = await res.json();
          if (data.ok) {
            const items = activeTab === 'posts' ? (data.posts || []) : (data[activeTab] || []);
            setContent(prev => ({ ...prev, [activeTab]: items }));
            if (activeTab === 'posts') {
              const initReactions = {};
              items.forEach(p => { initReactions[p.id] = p.reactions || {}; });
              setReactions(prev => ({ ...prev, ...initReactions }));
            }
          }
        }
      }
    } catch (_) {}
    finally { setContentLoaded(true); }
  };

  const handlePostReaction = async (e, postId) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated()) return;
    try {
      const res  = await fetch(`${BACKEND_URL}/api/blog/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'love' }),
      });
      const data = await res.json();
      if (data.ok) setReactions(prev => ({ ...prev, [postId]: data.reactions }));
    } catch (_) {}
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: '#C4451A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="site-container py-16" style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.5rem', color: 'var(--muted)' }}>Usuario no encontrado</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === userId;

  const itemsToDisplay = activeTab === 'all'
    ? [
        ...(content.articles || []).map(i => ({ ...i, type: 'article' })),
        ...(content.research || []).map(i => ({ ...i, type: 'research' })),
        ...(content.events   || []).map(i => ({ ...i, type: 'event' })),
        ...(content.posts    || []).map(i => ({ ...i, type: 'post' })),
      ].filter(i => i && i.id).sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    : (content[activeTab] || []).map(i => ({ ...i, type: activeTab === 'posts' ? 'post' : activeTab.replace(/s$/, '') }));

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .up-link:hover .up-title { color: #C4451A !important; }
      `}</style>
      <div className="site-container py-12">

        {/* ── Profile header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>

              {/* Avatar — square */}
              <div style={{
                width: 72, height: 72,
                backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {profileUser.avatar ? (
                  <img src={profileUser.avatar} alt={profileUser.name || profileUser.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={28} style={{ color: 'var(--muted)' }} />
                )}
              </div>

              <div>
                <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--text)', lineHeight: 1.1 }}>
                  {profileUser.name || profileUser.username || 'Usuario'}
                </h1>
                <p style={{ fontFamily: MONO, fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  @{profileUser.username || 'usuario'}
                </p>
                {profileUser.bio && (
                  <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--text)', maxWidth: 480, marginTop: '0.75rem', lineHeight: 1.6 }}>
                    {profileUser.bio}
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                  {profileUser.occupation && (
                    <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Briefcase size={11} /> {profileUser.occupation}
                    </span>
                  )}
                  {profileUser.country && (
                    <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={11} /> {profileUser.country}
                    </span>
                  )}
                </div>
                {profileUser.interests?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {profileUser.interests.map((interest, i) => (
                      <span key={i} style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>#{interest}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div>
              {isOwnProfile ? (
                <button
                  onClick={() => navigate('/profile/settings')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    fontFamily: MONO, fontSize: '0.6875rem', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    background: 'none',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  <Settings size={13} /> Configuración
                </button>
              ) : !checkingFollow ? (
                <button
                  onClick={handleFollow}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontFamily: MONO, fontSize: '0.6875rem', fontWeight: 600,
                    letterSpacing: '0.06em',
                    borderBottom: `1px solid ${following ? 'var(--border)' : 'var(--text)'}`,
                    color: following ? 'var(--muted)' : 'var(--text)',
                    cursor: 'pointer', transition: 'color 0.15s',
                  }}
                >
                  {following ? 'Siguiendo' : 'Seguir'}
                </button>
              ) : null}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <Link to={`/profile/${userId}/followers`} style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.followers}</span> seguidores
              </span>
            </Link>
            <Link to={`/profile/${userId}/following`} style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.following}</span> siguiendo
              </span>
            </Link>
            {[
              { value: stats.articles, label: 'artículos' },
              { value: stats.research, label: 'investigaciones' },
              { value: stats.events,   label: 'eventos' },
              { value: stats.posts,    label: 'posts' },
            ].map(({ value, label }) => (
              <span key={label} style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span> {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ position: 'relative', maxWidth: 480, marginBottom: '2rem' }}>
          <Search size={14} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            style={{
              width: '100%', paddingLeft: '1.5rem',
              background: 'transparent', border: 'none', outline: 'none',
              borderBottom: '1px solid var(--border)',
              fontFamily: SANS, fontSize: '0.9375rem',
              color: 'var(--text)', paddingBottom: '0.5rem',
            }}
            placeholder="Buscar en el perfil…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0.75rem',
                fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                whiteSpace: 'nowrap', marginBottom: '-1px',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                borderBottom: activeTab === tab.id ? '1px solid var(--text)' : '1px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {!contentLoaded ? (
          <div style={{ padding: '5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: '#C4451A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : itemsToDisplay.length === 0 ? (
          <div style={{ padding: '5rem 0', textAlign: 'center' }}>
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.25rem', color: 'var(--muted)' }}>
              {activeTab === 'all' ? 'No hay contenido publicado aún' : `No hay ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()} aún`}
            </p>
          </div>
        ) : (
          <div>
            {itemsToDisplay.map(item => {
              if (item.type === 'post') {
                return (
                  <div key={`post-${item.id}`} style={{ borderBottom: '1px solid var(--border)', padding: '1.5rem 0' }}>
                    {/* Post header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: 32, height: 32,
                        backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                        overflow: 'hidden', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.author?.avatar
                          ? <img src={item.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <User size={14} style={{ color: 'var(--muted)' }} />
                        }
                      </div>
                      <div>
                        <p style={{ fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{item.author?.name}</p>
                        <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>{formatDate(item.createdAt)}</p>
                      </div>
                    </div>

                    {item.title && (
                      <h3 style={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)', marginBottom: '0.5rem' }}>{item.title}</h3>
                    )}
                    <div
                      className="prose-editorial"
                      style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.7, marginBottom: '1rem' }}
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                    {(item.imageUrl || item.coverUrl) && (
                      <div style={{ marginBottom: '1rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={item.imageUrl || item.coverUrl} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }} />
                      </div>
                    )}

                    {/* Post actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <button
                        onClick={(e) => handlePostReaction(e, item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: MONO, fontSize: '0.6875rem' }}
                      >
                        <Heart size={13} /> {reactions[item.id]?.love?.count || 0}
                      </button>
                      <button
                        onClick={() => setExpandedComments(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: MONO, fontSize: '0.6875rem' }}
                      >
                        <MessageSquare size={13} /> {item._count?.comments || 0}
                      </button>
                    </div>

                    {expandedComments[item.id] && (
                      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                        <CommentSection postId={item.id} />
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={getRoute(item.type, item.id)}
                  className="up-link"
                  style={{ display: 'block', padding: '1.25rem 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    {(item.coverUrl || item.bannerUrl) && (
                      <div style={{ width: 80, height: 60, flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={item.coverUrl || item.bannerUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                        <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4451A' }}>
                          {TYPE_LABEL[item.type]}
                        </span>
                        {item.category && (
                          <span style={{ fontFamily: MONO, fontSize: '0.5625rem', color: 'var(--muted)' }}>{item.category}</span>
                        )}
                      </div>
                      <h3
                        className="up-title"
                        style={{ fontFamily: SANS, fontWeight: 700, fontSize: '1.0625rem', color: 'var(--text)', lineHeight: 1.3, marginBottom: '0.25rem', transition: 'color 0.15s' }}
                      >
                        {item.title || 'Sin título'}
                      </h3>
                      {item.description && (
                        <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.25rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.description}
                        </p>
                      )}
                      <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
                        {formatDate(item.createdAt || item.date)}
                        {item.location && ` · ${item.location}`}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
