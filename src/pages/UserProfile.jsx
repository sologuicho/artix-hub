import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, MapPin, Briefcase, FileText, Users, BookOpen, Calendar, MessageSquare, Settings, Heart, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';

import { BACKEND_URL } from '../config/client';

const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'articles', label: 'Artículos' },
  { id: 'research', label: 'Investigaciones' },
  { id: 'events', label: 'Eventos' },
  { id: 'posts', label: 'Posts' },
];

const TYPE_LABEL = { article: 'Artículo', research: 'Investigación', event: 'Evento', post: 'Post' };

const getRoute = (type, id) => {
  if (type === 'post') return `/blog`;
  if (type === 'event') return `/events/${id}`;
  if (type === 'research') return `/research/${id}`;
  return `/articles/${id}`;
};

const UserProfile = () => {
  const { userId } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ articles: 0, research: 0, events: 0, posts: 0, followers: 0, following: 0 });
  const [content, setContent] = useState({ articles: [], research: [], events: [], posts: [] });
  const [contentLoaded, setContentLoaded] = useState(false);
  const [following, setFollowing] = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(true);
  const [expandedComments, setExpandedComments] = useState({});
  const [reactions, setReactions] = useState({});

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
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf') return value;
    }
    return null;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) { setProfileUser(data.user); setStats(data.stats || stats); }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const checkFollowStatus = async () => {
    if (!currentUser || !userId || currentUser.id === userId) { setCheckingFollow(false); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${userId}/check`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setFollowing(data.following || false);
    } catch (_) {}
    finally { setCheckingFollow(false); }
  };

  const handleFollow = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    const prevFollowing = following;
    const prevStats = stats;
    setFollowing(f => !f);
    setStats(prev => ({ ...prev, followers: !prevFollowing ? prev.followers + 1 : prev.followers - 1 }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${userId}`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) { setFollowing(prevFollowing); setStats(prevStats); }
    } catch (_) {
      setFollowing(prevFollowing);
      setStats(prevStats);
    }
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
          events: eData.ok ? (eData.events || []) : [],
          posts,
        });
      } else {
        const params = new URLSearchParams(baseParams);
        let endpoint = '';
        if (activeTab === 'articles') { params.append('authorId', userId); endpoint = `${BACKEND_URL}/api/articles?${params}`; }
        else if (activeTab === 'research') { params.append('author', userId); endpoint = `${BACKEND_URL}/api/research?${params}`; }
        else if (activeTab === 'events') { params.append('creatorId', userId); endpoint = `${BACKEND_URL}/api/events?${params}`; }
        else if (activeTab === 'posts') { params.append('authorId', userId); endpoint = `${BACKEND_URL}/api/blog?${params}`; }

        if (endpoint) {
          const res = await fetch(endpoint, { credentials: 'include' });
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
      const res = await fetch(`${BACKEND_URL}/api/blog/${postId}/react`, {
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
        <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="site-container py-16 text-center">
          <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--muted)' }}>Usuario no encontrado</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === userId;

  const itemsToDisplay = activeTab === 'all'
    ? [
        ...(content.articles || []).map(i => ({ ...i, type: 'article' })),
        ...(content.research || []).map(i => ({ ...i, type: 'research' })),
        ...(content.events || []).map(i => ({ ...i, type: 'event' })),
        ...(content.posts || []).map(i => ({ ...i, type: 'post' })),
      ].filter(i => i && i.id).sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
    : (content[activeTab] || []).map(i => ({ ...i, type: activeTab === 'posts' ? 'post' : activeTab.replace(/s$/, '') }));

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-12">
        {/* Profile Header */}
        <div
          className="flex flex-col gap-6 mb-10 pb-10"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
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
                <h1 className="font-display" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--text)', lineHeight: 1.1 }}>
                  {profileUser.name || profileUser.username || 'Usuario'}
                </h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  @{profileUser.username || 'usuario'}
                </p>
                {profileUser.bio && (
                  <p className="font-sans text-sm mt-3" style={{ color: 'var(--text)', maxWidth: '480px' }}>
                    {profileUser.bio}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 font-sans text-xs" style={{ color: 'var(--muted)' }}>
                  {profileUser.occupation && (
                    <span className="flex items-center gap-1"><Briefcase size={11} /> {profileUser.occupation}</span>
                  )}
                  {profileUser.country && (
                    <span className="flex items-center gap-1"><MapPin size={11} /> {profileUser.country}</span>
                  )}
                </div>
                {profileUser.interests?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {profileUser.interests.map((interest, i) => (
                      <span key={i} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>#{interest}</span>
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
                  className="btn btn-outline flex items-center gap-2"
                >
                  <Settings size={13} /> Configuración
                </button>
              ) : !checkingFollow ? (
                <button
                  onClick={handleFollow}
                  className="btn btn-ghost"
                  style={{
                    fontSize: '0.6875rem', padding: '0.375rem 0',
                    borderBottom: `1px solid ${following ? 'var(--border)' : 'var(--text)'}`,
                    color: following ? 'var(--muted)' : 'var(--text)',
                  }}
                >
                  {following ? 'Siguiendo' : 'Seguir'}
                </button>
              ) : null}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 flex-wrap font-sans text-sm" style={{ color: 'var(--muted)' }}>
            <Link to={`/profile/${userId}/followers`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.followers}</span> seguidores
            </Link>
            <Link to={`/profile/${userId}/following`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.following}</span> siguiendo
            </Link>
            <span><span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.articles}</span> artículos</span>
            <span><span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.research}</span> investigaciones</span>
            <span><span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.events}</span> eventos</span>
            <span><span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.posts}</span> posts</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8" style={{ maxWidth: '480px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Buscar en el perfil…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-8 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="font-sans text-xs uppercase tracking-wider pb-3 whitespace-nowrap"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '1px solid var(--text)' : '1px solid transparent',
                marginBottom: '-1px',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {!contentLoaded ? (
          <div className="py-20 flex items-center justify-center">
            <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : itemsToDisplay.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>
              {activeTab === 'all' ? 'No hay contenido publicado aún' : `No hay ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()} aún`}
            </p>
          </div>
        ) : (
          <div>
            {itemsToDisplay.map(item => {
              if (item.type === 'post') {
                return (
                  <div
                    key={`post-${item.id}`}
                    style={{ borderBottom: '1px solid var(--border)', padding: '1.5rem 0' }}
                  >
                    {/* Post header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.author?.avatar
                          ? <img src={item.author.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <User size={14} style={{ color: 'var(--muted)' }} />
                        }
                      </div>
                      <div>
                        <p className="font-sans text-sm font-medium" style={{ color: 'var(--text)' }}>{item.author?.name}</p>
                        <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{formatDate(item.createdAt)}</p>
                      </div>
                    </div>

                    {/* Post content */}
                    {item.title && (
                      <h3 className="font-display mb-2" style={{ fontSize: '1.125rem', color: 'var(--text)' }}>{item.title}</h3>
                    )}
                    <div
                      className="font-sans text-sm prose-editorial"
                      style={{ color: 'var(--text)', lineHeight: 1.7, marginBottom: '1rem' }}
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                    {(item.imageUrl || item.coverUrl) && (
                      <div style={{ marginBottom: '1rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={item.imageUrl || item.coverUrl} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover' }} />
                      </div>
                    )}

                    {/* Post actions */}
                    <div className="flex items-center gap-5">
                      <button
                        onClick={(e) => handlePostReaction(e, item.id)}
                        className="flex items-center gap-1.5 font-sans text-xs"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
                      >
                        <Heart size={13} /> {reactions[item.id]?.love?.count || 0}
                      </button>
                      <button
                        onClick={() => setExpandedComments(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        className="flex items-center gap-1.5 font-sans text-xs"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
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
                  className="group block py-5"
                  style={{ borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
                >
                  <div className="flex items-start gap-4">
                    {(item.coverUrl || item.bannerUrl) && (
                      <div style={{ width: 80, height: 60, flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={item.coverUrl || item.bannerUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="category-tag">{TYPE_LABEL[item.type]}</span>
                        {item.category && <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{item.category}</span>}
                      </div>
                      <h3
                        className="font-display group-hover:[color:var(--accent)] transition-colors mb-1"
                        style={{ fontSize: '1.0625rem', color: 'var(--text)', lineHeight: 1.3 }}
                      >
                        {item.title || 'Sin título'}
                      </h3>
                      {item.description && (
                        <p className="font-sans text-sm mb-1" style={{ color: 'var(--muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.description}
                        </p>
                      )}
                      <p className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
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
