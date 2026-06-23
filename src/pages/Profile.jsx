import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

/* ─── helpers ─────────────────────────────────────────────── */
function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function fmtCount(n) {
  if (n >= 10000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
}

function getCsrf() {
  return document.cookie.split('; ').find(r => r.startsWith('csrf='))?.split('=')[1] || '';
}

/* ─── sub-components ────────────────────────────────────────── */

function ContentBadge({ type }) {
  const isPaper = type === 'PAPER' || type === 'RESEARCH';
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500,
      letterSpacing: '0.1em', padding: '2px 7px',
      border: `1px solid ${isPaper ? 'rgba(196,69,26,0.45)' : 'rgba(255,255,255,0.14)'}`,
      color: isPaper ? '#e0815e' : '#9a9a95',
      background: isPaper ? 'rgba(196,69,26,0.09)' : 'transparent',
    }}>
      {type}
    </span>
  );
}

function ContentRow({ item }) {
  return (
    <Link
      to={item.href}
      style={{ textDecoration: 'none', display: 'block', padding: '22px 4px 22px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.012)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 9, flexWrap: 'wrap' }}>
        <ContentBadge type={item.badgeLabel} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6f6f6a' }}>{item.date}</span>
        {item.meta && (
          <>
            <span style={{ color: '#3a3a36' }}>·</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6f6f6a' }}>{item.meta}</span>
          </>
        )}
      </div>
      <h3
        style={{ margin: 0, fontSize: 18, lineHeight: 1.34, fontWeight: 600, letterSpacing: '-0.01em', color: '#eceae6', transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = '#e0815e'}
        onMouseLeave={e => e.currentTarget.style.color = '#eceae6'}
      >
        {item.title}
      </h3>
      {item.excerpt && (
        <p style={{ margin: '8px 0 0', fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: 13.5, lineHeight: 1.6, color: '#8a8a85', maxWidth: 600 }}>
          {item.excerpt.length > 160 ? item.excerpt.slice(0, 160) + '…' : item.excerpt}
        </p>
      )}
    </Link>
  );
}

function PersonCard({ person, isOwnProfile, currentUserId }) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const isMe = person.id === currentUserId;

  async function toggleFollow() {
    if (isMe || busy) return;
    setBusy(true);
    try {
      await fetch(`${BACKEND_URL}/api/follow/${person.id}`, {
        method: 'POST', credentials: 'include',
        headers: { 'x-csrf-token': getCsrf() },
      });
      setFollowing(f => !f);
    } catch (_) {}
    setBusy(false);
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <Link to={`/profile/${person.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 38, height: 38, flexShrink: 0,
          border: '1px solid rgba(255,255,255,0.14)', background: '#161614',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#b6b4af',
          overflow: 'hidden',
        }}>
          {person.avatar
            ? <img src={person.avatar} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : getInitials(person.name)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, color: '#e4e2dd', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {person.name || person.username}
          </div>
          {person.username && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6f6f6a' }}>
              @{person.username}
            </div>
          )}
        </div>
      </Link>
      {!isMe && (
        <button
          onClick={toggleFollow}
          disabled={busy}
          style={{
            appearance: 'none', cursor: 'pointer', flexShrink: 0,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
            padding: '5px 11px',
            border: `1px solid ${following ? 'rgba(255,255,255,0.16)' : 'rgba(196,69,26,0.5)'}`,
            background: following ? 'transparent' : 'rgba(196,69,26,0.12)',
            color: following ? '#8a8a85' : '#e0815e',
            opacity: busy ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
        >
          {following ? 'Siguiendo' : 'Seguir'}
        </button>
      )}
    </div>
  );
}

/* ─── main component ────────────────────────────────────────── */
export default function Profile() {
  const { userId } = useParams();
  const { user: authUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [articles, setArticles] = useState([]);
  const [research, setResearch] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  const [activeTab, setActiveTab] = useState('Publicaciones');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [contentLoaded, setContentLoaded] = useState(false);

  /* Determine whose profile */
  const resolvedId = userId || authUser?.id;
  const isOwnProfile = authUser?.id && (resolvedId === authUser.id);

  /* Redirect /profile (no userId) to own profile */
  useEffect(() => {
    if (!userId && !authUser && !loading) {
      navigate('/login');
    }
  }, [userId, authUser, loading, navigate]);

  /* Fetch profile */
  const fetchProfile = useCallback(async () => {
    if (!resolvedId) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/${resolvedId}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.ok || !data.user) { setNotFound(true); return; }
      setProfile(data.user);
      setStats(data.stats);
    } catch (_) { setNotFound(true); }
    setLoading(false);
  }, [resolvedId]);

  /* Check follow status */
  const checkFollow = useCallback(async () => {
    if (!isAuthenticated() || isOwnProfile || !resolvedId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${resolvedId}/check`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setIsFollowing(data.isFollowing);
    } catch (_) {}
  }, [resolvedId, isAuthenticated, isOwnProfile]);

  /* Load all content */
  const loadContent = useCallback(async () => {
    if (!profile?.id || contentLoaded) return;
    setContentLoaded(true);
    try {
      const [artRes, resRes, fwrRes, fwgRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/articles?authorId=${profile.id}&status=published&limit=20`, { credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/research?authorId=${profile.id}&status=published&limit=20`, { credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/follow/${profile.id}/followers`, { credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/follow/${profile.id}/following`, { credentials: 'include' }),
      ]);
      const [artData, resData, fwrData, fwgData] = await Promise.all([
        artRes.json(), resRes.json(), fwrRes.json(), fwgRes.json(),
      ]);
      if (artData.ok) setArticles(artData.articles || []);
      if (resData.ok) setResearch(resData.research || resData.papers || []);
      if (fwrData.ok) setFollowers(fwrData.followers || []);
      if (fwgData.ok) setFollowing(fwgData.following || []);
    } catch (_) {}
  }, [profile, contentLoaded]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { checkFollow(); }, [checkFollow]);
  useEffect(() => { if (profile) loadContent(); }, [profile, loadContent]);

  /* Toggle follow */
  async function toggleFollow() {
    if (!isAuthenticated()) { navigate('/login'); return; }
    if (followBusy) return;
    setFollowBusy(true);
    try {
      await fetch(`${BACKEND_URL}/api/follow/${profile.id}`, {
        method: 'POST', credentials: 'include',
        headers: { 'x-csrf-token': getCsrf() },
      });
      setIsFollowing(f => !f);
      // Update followers count locally
      setStats(s => s ? {
        ...s,
        followers: isFollowing ? s.followers - 1 : s.followers + 1,
      } : s);
    } catch (_) {}
    setFollowBusy(false);
  }

  /* Derived content for current tab */
  const allPubs = [
    ...articles.map(a => ({
      id: a.id, href: `/articles/${a.id}`, badgeLabel: 'ARTÍCULO',
      date: fmtDate(a.createdAt || a.publishedAt),
      meta: a.viewCount ? `${fmtCount(a.viewCount)} lecturas` : '',
      title: a.title, excerpt: a.description || a.excerpt || '',
    })),
    ...research.map(r => ({
      id: r.id, href: `/research/${r.id}`, badgeLabel: 'PAPER',
      date: fmtDate(r.createdAt || r.publishedAt),
      meta: r.citationCount ? `${fmtCount(r.citationCount)} citas` : '',
      title: r.title, excerpt: r.abstract || r.description || '',
    })),
  ].sort((a, b) => (b.date < a.date ? -1 : 1));

  const tabItems = {
    Publicaciones: allPubs,
    Papers: research.map(r => ({
      id: r.id, href: `/research/${r.id}`, badgeLabel: 'PAPER',
      date: fmtDate(r.createdAt || r.publishedAt),
      meta: r.citationCount ? `${fmtCount(r.citationCount)} citas` : '',
      title: r.title, excerpt: r.abstract || r.description || '',
    })),
    Artículos: articles.map(a => ({
      id: a.id, href: `/articles/${a.id}`, badgeLabel: 'ARTÍCULO',
      date: fmtDate(a.createdAt || a.publishedAt),
      meta: a.viewCount ? `${fmtCount(a.viewCount)} lecturas` : '',
      title: a.title, excerpt: a.description || a.excerpt || '',
    })),
  };

  const isPeoplTab = activeTab === 'Seguidores' || activeTab === 'Siguiendo';
  const currentItems = isPeoplTab ? [] : (tabItems[activeTab] || allPubs);
  const currentPeople = activeTab === 'Seguidores' ? followers : activeTab === 'Siguiendo' ? following : [];

  const totalPublications = (stats?.articles || 0) + (stats?.research || 0);

  /* Tabs config */
  const tabCounts = {
    Publicaciones: totalPublications,
    Papers: stats?.research || 0,
    Artículos: stats?.articles || 0,
    Seguidores: stats?.followers || followers.length,
    Siguiendo: stats?.following || following.length,
  };
  const TABS = ['Publicaciones', 'Papers', 'Artículos', 'Seguidores', 'Siguiendo'];

  /* Topics from content */
  const allTags = [
    ...articles.flatMap(a => a.tags || []),
    ...research.flatMap(r => r.tags || []),
  ];
  const uniqueTags = [...new Set(allTags)].slice(0, 12);

  /* Metrics */
  const totalReads = articles.reduce((sum, a) => sum + (a.viewCount || 0), 0);
  const totalCitations = research.reduce((sum, r) => sum + (r.citationCount || 0), 0);

  /* ── loading / not found ── */
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.08)',
          borderTopColor: '#C4451A',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 28px' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#6f6f6a', letterSpacing: '0.08em' }}>
          PERFIL NO ENCONTRADO
        </div>
        <Link to="/" style={{ display: 'inline-block', marginTop: 24, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#e0815e', textDecoration: 'none' }}>
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  /* ── main render ── */
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>

      {/* Cover strip */}
      <div style={{
        height: 150,
        backgroundColor: '#0e0d0c',
        backgroundImage: 'repeating-linear-gradient(135deg,rgba(196,69,26,0.06) 0 1px,transparent 1px 11px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }} />

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>

        {/* Identity block */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, marginTop: -44, position: 'relative', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 108, height: 108, flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.16)', background: '#161614',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 34, color: '#d4d2cd',
            overflow: 'hidden',
          }}>
            {profile.avatar
              ? <img src={profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : getInitials(profile.name || profile.username)}
          </div>

          {/* Name + handle */}
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', color: '#f4f2ee' }}>
                {profile.name || profile.username}
              </h1>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#76746f', marginTop: 6 }}>
              {profile.username && `@${profile.username}`}
              {profile.institution && ` · ${profile.institution}`}
              {profile.country && ` · ${profile.country}`}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6, flexShrink: 0 }}>
            {isOwnProfile ? (
              <Link
                to="/profile/settings"
                style={{
                  textDecoration: 'none', fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12, color: '#9a9a95',
                  border: '1px solid rgba(255,255,255,0.12)', padding: '8px 14px',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = '#e9e7e3'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#9a9a95'; }}
              >
                ⚙ Configuración
              </Link>
            ) : (
              <>
                <button
                  onClick={toggleFollow}
                  disabled={followBusy}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                    letterSpacing: '0.02em', padding: '8px 18px',
                    border: `1px solid ${isFollowing ? 'rgba(255,255,255,0.16)' : 'transparent'}`,
                    background: isFollowing ? 'transparent' : '#C4451A',
                    color: isFollowing ? '#9a9a95' : '#0a0a0a',
                    opacity: followBusy ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {isFollowing ? '✓ Siguiendo' : 'Seguir'}
                </button>
                <button
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                    color: '#9a9a95', background: 'none',
                    border: '1px solid rgba(255,255,255,0.12)', padding: '8px 14px',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; e.currentTarget.style.color = '#e9e7e3'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#9a9a95'; }}
                >
                  ✉ Mensaje
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p style={{
            margin: '20px 0 0', fontFamily: "'IBM Plex Serif', Georgia, serif",
            fontSize: 15, lineHeight: 1.65, color: '#a6a49f', maxWidth: 640,
          }}>
            {profile.bio}
          </p>
        )}

        {/* Links row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 16, flexWrap: 'wrap', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
          {profile.website && (
            <span style={{ color: '#76746f' }}>
              🔗 <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: '#e0815e', textDecoration: 'none' }}>{profile.website.replace(/^https?:\/\//, '')}</a>
            </span>
          )}
          {profile.createdAt && (
            <span style={{ color: '#76746f' }}>◷ Se unió en {fmtDate(profile.createdAt)}</span>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', marginTop: 22, border: '1px solid rgba(255,255,255,0.1)', width: 'max-content', maxWidth: '100%', flexWrap: 'wrap' }}>
          {[
            { label: 'PUBLICACIONES', value: fmtCount(totalPublications), accent: false },
            { label: 'SEGUIDORES', value: fmtCount(stats?.followers ?? 0), accent: true },
            { label: 'SIGUIENDO', value: fmtCount(stats?.following ?? 0), accent: false },
            { label: 'EVENTOS', value: fmtCount(stats?.events ?? 0), accent: false },
          ].map((s, i, arr) => (
            <div
              key={s.label}
              style={{
                padding: '13px 22px',
                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}
            >
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 19, color: s.accent ? '#e0815e' : '#e9e7e3' }}>
                {s.value}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em', color: '#6f6f6a', marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const on = tab === activeTab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  appearance: 'none', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '0.03em',
                  padding: '14px 1px', display: 'flex', alignItems: 'center', gap: 7,
                  color: on ? '#eceae6' : '#6f6f6a',
                  borderBottom: `2px solid ${on ? '#C4451A' : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {tab}
                <span style={{
                  fontSize: 10,
                  color: on ? '#e0815e' : '#5a5a56',
                  border: `1px solid ${on ? 'rgba(196,69,26,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  padding: '0 5px',
                }}>
                  {fmtCount(tabCounts[tab] || 0)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 48, padding: '6px 0 72px', alignItems: 'start' }}>

          {/* Main column */}
          <main>
            {/* Content list */}
            {!isPeoplTab && (
              <div>
                {currentItems.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#5a5a56', letterSpacing: '0.06em' }}>
                    SIN PUBLICACIONES AÚN
                  </div>
                ) : (
                  currentItems.map(item => <ContentRow key={item.id} item={item} />)
                )}
              </div>
            )}

            {/* People grid */}
            {isPeoplTab && (
              <div style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {currentPeople.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#5a5a56', letterSpacing: '0.06em' }}>
                    {activeTab === 'Seguidores' ? 'SIN SEGUIDORES AÚN' : 'NO SIGUE A NADIE AÚN'}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    {currentPeople.map((person, i) => (
                      <div
                        key={person.id}
                        style={{ borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                      >
                        <PersonCard
                          person={person}
                          isOwnProfile={isOwnProfile}
                          currentUserId={authUser?.id}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Side rail */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 84 }}>
            {/* Metrics */}
            <section style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em', color: '#76746f',
              }}>
                MÉTRICAS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {[
                  { label: 'CITAS', value: fmtCount(totalCitations), accent: true, borderR: true, borderB: true },
                  { label: 'H-INDEX', value: '—', accent: false, borderR: false, borderB: true },
                  { label: 'LECTURAS', value: fmtCount(totalReads), accent: false, borderR: true, borderB: false },
                  { label: 'EVENTOS', value: fmtCount(stats?.events ?? 0), accent: false, borderR: false, borderB: false },
                ].map(m => (
                  <div
                    key={m.label}
                    style={{
                      padding: '15px 16px',
                      borderRight: m.borderR ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      borderBottom: m.borderB ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    }}
                  >
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, color: m.accent ? '#e0815e' : '#e9e7e3' }}>
                      {m.value}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em', color: '#6f6f6a', marginTop: 3 }}>
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Topics / interests */}
            {(uniqueTags.length > 0 || profile.interests?.length > 0) && (
              <section style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em', color: '#76746f', marginBottom: 13 }}>
                  TEMAS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {(uniqueTags.length > 0 ? uniqueTags : profile.interests || []).map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#9a9a95',
                        border: '1px solid rgba(255,255,255,0.09)', padding: '3px 8px',
                      }}
                    >
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Own profile: quick links */}
            {isOwnProfile && (
              <section style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em', color: '#76746f', marginBottom: 13 }}>
                  ACCIONES RÁPIDAS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: '+ Nuevo artículo', to: '/articles/create' },
                    { label: '+ Nuevo paper', to: '/research/create' },
                    { label: '+ Nuevo evento', to: '/events/create' },
                    { label: '⚙ Editar perfil', to: '/profile/settings' },
                  ].map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      style={{
                        textDecoration: 'none',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5,
                        color: '#9a9a95', padding: '6px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#e0815e'}
                      onMouseLeave={e => e.currentTarget.style.color = '#9a9a95'}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
