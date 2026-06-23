import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', 'JetBrains Mono', monospace";
const SANS = "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif";

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase() || '??';
};

const readTimeMin = (content = '') => {
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min`;
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const getBadge = (type) => {
  const accent = type === 'PAPER' || type === 'EVENT';
  return {
    display: 'inline-block', fontFamily: MONO, fontSize: 10.5, fontWeight: 500,
    letterSpacing: '0.12em', padding: '3px 7px',
    border: `1px solid ${accent ? 'rgba(196,69,26,0.45)' : 'rgba(255,255,255,0.14)'}`,
    color: accent ? '#e0815e' : '#9a9a95',
    background: accent ? 'rgba(196,69,26,0.09)' : 'transparent',
  };
};

const FILTER_TABS = ['All', 'Articles', 'Papers', 'Blog', 'Events'];
const FILTER_ROUTES = { All: '/articles', Articles: '/articles', Papers: '/research', Blog: '/blog', Events: '/events' };
const TYPE_MAP = { Articles: 'ARTICLE', Papers: 'PAPER', Blog: 'BLOG', Events: 'EVENT' };

const TIERS = [
  { name: 'Free',    note: 'reader',   price: '$0',  active: false },
  { name: 'Student', note: 'verified', price: '$4',  active: true  },
  { name: 'Pro',     note: 'creators', price: '$12', active: false },
  { name: 'Team',    note: 'per seat', price: '$32', active: false },
];


export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [filter, setFilter]       = useState('All');
  const [sort, setSort]           = useState('Latest');
  const [following, setFollowing] = useState({});
  const [searchVal, setSearchVal] = useState('');

  const [articles,   setArticles]   = useState([]);
  const [research,   setResearch]   = useState([]);
  const [blogPosts,  setBlogPosts]  = useState([]);
  const [events,     setEvents]     = useState([]);
  const [suggested,  setSuggested]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [aR, rR, bR, eR, uR] = await Promise.all([
          fetch(`${BACKEND_URL}/api/articles?status=published&limit=5`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/research?status=published&limit=5`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/blog?status=published&limit=5`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/events?limit=8`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/users/suggested`, { credentials: 'include' }),
        ]);
        const [aD, rD, bD, eD, uD] = await Promise.all([aR.json(), rR.json(), bR.json(), eR.json(), uR.json()]);
        if (aD.ok) setArticles(aD.articles || []);
        if (rD.ok) setResearch(rD.research || []);
        if (bD.ok) setBlogPosts(bD.posts || []);
        if (eD.ok) setEvents(eD.events || []);
        if (uD.ok) setSuggested(uD.users || []);
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  const allItems = useMemo(() => [
    ...articles.map(a => ({
      id: a.id, type: 'ARTICLE', title: a.title,
      excerpt: a.summary || '',
      author: a.author?.name || a.author?.username || 'Unknown',
      affiliation: a.author?.institution || '',
      initials: getInitials(a.author?.name || a.author?.username || ''),
      date: fmtDate(a.createdAt), readTime: readTimeMin(a.content || ''),
      metric: `${(a.viewCount || 0).toLocaleString()} read`,
      tags: a.tags || [], trend: a.viewCount || 0, url: `/articles/${a.id}`,
      ts: new Date(a.createdAt).getTime(),
    })),
    ...research.map(r => ({
      id: r.id, type: 'PAPER', title: r.title,
      excerpt: r.abstract || r.summary || '',
      author: r.author?.name || r.author?.username || 'Unknown',
      affiliation: r.author?.institution || '',
      initials: getInitials(r.author?.name || r.author?.username || ''),
      date: fmtDate(r.createdAt), readTime: readTimeMin(r.content || ''),
      metric: `${(r.viewCount || 0).toLocaleString()} read`,
      tags: r.tags || [], trend: r.viewCount || 0, url: `/research/${r.id}`,
      ts: new Date(r.createdAt).getTime(),
    })),
    ...blogPosts.map(b => ({
      id: b.id, type: 'BLOG', title: b.title,
      excerpt: b.summary || '',
      author: b.author?.name || b.author?.username || 'Unknown',
      affiliation: b.author?.institution || '',
      initials: getInitials(b.author?.name || b.author?.username || ''),
      date: fmtDate(b.createdAt), readTime: readTimeMin(b.content || ''),
      metric: `${(b.viewCount || 0).toLocaleString()} read`,
      tags: b.tags || [], trend: b.viewCount || 0, url: `/blog/${b.id}`,
      ts: new Date(b.createdAt).getTime(),
    })),
    ...events.map(e => ({
      id: e.id, type: 'EVENT', title: e.title,
      excerpt: e.description || '',
      author: e.creator?.name || e.creator?.username || 'Unknown',
      affiliation: '',
      initials: getInitials(e.creator?.name || e.creator?.username || ''),
      date: fmtDate(e.startDate || e.createdAt),
      readTime: e.isLive ? 'live' : 'event',
      metric: `${e._count?.registrations || 0} attending`,
      tags: e.tags || [], trend: e._count?.registrations || 0, url: `/events/${e.id}`,
      ts: new Date(e.createdAt).getTime(),
    })),
  ].sort((a, b) => b.ts - a.ts), [articles, research, blogPosts, events]);

  const filteredItems = useMemo(() => {
    let list = filter === 'All' ? allItems : allItems.filter(i => i.type === TYPE_MAP[filter]);
    if (sort === 'Trending') list = [...list].sort((a, b) => b.trend - a.trend);
    return list;
  }, [allItems, filter, sort]);

  const liveEvent     = events.find(e => e.isLive) || null;
  const upcomingEvts  = events.filter(e => !e.isLive && new Date(e.startDate) > new Date()).slice(0, 3);

  const trendingTags = useMemo(() => {
    const counts = {};
    allItems.forEach(i => (i.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => `#${t}`);
  }, [allItems]);

  const userInitials = user ? getInitials(user.name || user.username || '') : '';

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchVal.trim())
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e9e7e3', fontFamily: SANS, WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        @keyframes artixpulse{0%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.7);}100%{opacity:1;transform:scale(1);}}
        *{box-sizing:border-box;}
        ::selection{background:#C4451A;color:#fff;}
        ::-webkit-scrollbar{width:11px;}
        ::-webkit-scrollbar-track{background:#0a0a0a;}
        ::-webkit-scrollbar-thumb{background:#1f1f1d;border:3px solid #0a0a0a;}
        input::placeholder{color:#5a5a56;}
        .ah-nav a{color:#86847f;text-decoration:none;font-size:13.5px;transition:color .15s;}
        .ah-nav a:hover{color:#e9e7e3;}
        .ah-item{transition:background .15s;cursor:pointer;}
        .ah-item:hover{background:rgba(255,255,255,0.012);}
        .ah-title{transition:color .15s;}
        .ah-item:hover .ah-title{color:#e0815e;}
        .ah-tag:hover{border-color:rgba(196,69,26,0.5)!important;color:#e0815e!important;}
        .ah-write:hover{background:rgba(196,69,26,0.12)!important;}
        .ah-sort:hover{color:#e9e7e3!important;}
        .ah-more:hover{border-color:rgba(255,255,255,0.28)!important;color:#e9e7e3!important;}
        .ah-ev-row:hover{background:rgba(255,255,255,0.015)!important;}
        .ah-plans:hover{background:#d4582a!important;}
        .ah-footer a{color:#6f6f6a;text-decoration:none;transition:color .15s;}
        .ah-footer a:hover{color:#e9e7e3;}
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.82)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', gap: 32 }}>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.06em', color: '#f2f0ec' }}>ARTIX</span>
            <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.18em', color: '#C4451A' }}>HUB</span>
          </Link>

          <nav className="ah-nav" style={{ display: 'flex', alignItems: 'center', gap: 26, flexShrink: 0 }}>
            <Link to="/feed">Feed</Link>
            <Link to="/articles">Articles</Link>
            <Link to="/research">Papers</Link>
            <Link to="/events">Events</Link>
            <Link to="/blog">Blog</Link>
          </nav>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', background: '#0f0f0e', height: 34, padding: '0 11px', gap: 9, width: 230, flexShrink: 0 }}>
            <span style={{ fontFamily: MONO, fontSize: 13, color: '#5a5a56' }}>⌕</span>
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search papers, authors…"
              style={{ background: 'none', border: 'none', outline: 'none', color: '#e9e7e3', fontFamily: MONO, fontSize: 12, width: '100%' }}
            />
            <span style={{ fontFamily: MONO, fontSize: 10, color: '#4d4d49', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 5px' }}>⌘K</span>
          </div>

          {isAuthenticated() ? (
            <Link to="/articles/create" className="ah-write"
              style={{ textDecoration: 'none', flexShrink: 0, fontFamily: MONO, fontSize: 12, letterSpacing: '0.03em', color: '#e0815e', border: '1px solid rgba(196,69,26,0.5)', padding: '7px 14px', transition: 'background .15s' }}>
              Write
            </Link>
          ) : (
            <Link to="/auth"
              style={{ textDecoration: 'none', flexShrink: 0, fontFamily: MONO, fontSize: 12, letterSpacing: '0.03em', color: '#e0815e', border: '1px solid rgba(196,69,26,0.5)', padding: '7px 14px' }}>
              Sign in
            </Link>
          )}

          {isAuthenticated() && user && (
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              {user.avatar ? (
                <img src={user.avatar} alt={userInitials} style={{ width: 32, height: 32, borderRadius: 0, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.14)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, flexShrink: 0, border: '1px solid rgba(255,255,255,0.14)', background: '#161614', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 11, color: '#c4c2bd' }}>
                  {userInitials}
                </div>
              )}
            </Link>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>

        {/* ── LIVE BANNER ── */}
        {liveEvent ? (
          <section style={{ marginTop: 30, border: '1px solid rgba(255,255,255,0.1)', background: '#0d0d0c', display: 'flex' }}>
            <div style={{
              position: 'relative', width: '48%', flexShrink: 0, minHeight: 228,
              backgroundColor: '#101010',
              backgroundImage: 'repeating-linear-gradient(135deg,rgba(255,255,255,0.035) 0 1px,transparent 1px 9px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, position: 'absolute', top: 14, left: 14, background: 'rgba(10,10,10,0.7)', padding: '5px 9px', border: '1px solid rgba(196,69,26,0.5)' }}>
                <span style={{ width: 7, height: 7, background: '#C4451A', borderRadius: '50%', display: 'block', animation: 'artixpulse 1.6s ease-in-out infinite' }} />
                <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', color: '#e0815e' }}>LIVE</span>
              </div>
              <span style={{ position: 'absolute', top: 16, right: 14, fontFamily: MONO, fontSize: 11, color: '#9a9a95' }}>
                {(liveEvent._count?.registrations || 0).toLocaleString()} watching
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', color: '#46463f' }}>[ LIVE&nbsp;VIDEO&nbsp;STREAM ]</span>
            </div>
            <div style={{ flex: 1, padding: '26px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', color: '#76746f' }}>LIVE EVENT</span>
              <h2 style={{ margin: '12px 0 0', fontSize: 25, lineHeight: 1.18, fontWeight: 600, letterSpacing: '-0.01em', color: '#f4f2ee' }}>
                {liveEvent.title}
              </h2>
              <p style={{ margin: '11px 0 0', fontSize: 13.5, lineHeight: 1.55, color: '#8a8a85', maxWidth: 440 }}>
                {(liveEvent.description || '').slice(0, 160)}
              </p>
              <div style={{ marginTop: 22 }}>
                <button
                  onClick={() => navigate(`/events/${liveEvent.id}/lobby`)}
                  style={{ cursor: 'pointer', flexShrink: 0, fontFamily: MONO, fontSize: 12.5, letterSpacing: '0.03em', padding: '10px 22px', border: 'none', background: '#C4451A', color: '#0a0a0a', appearance: 'none' }}>
                  Join stream →
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div style={{ marginTop: 30, border: '1px solid rgba(255,255,255,0.06)', background: '#0d0d0c', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 7, height: 7, background: '#2a2a28', borderRadius: '50%', display: 'block', flexShrink: 0 }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#3a3a36', letterSpacing: '0.08em' }}>NO LIVE EVENTS RIGHT NOW — CHECK UPCOMING BELOW</span>
            <div style={{ flex: 1 }} />
            <Link to="/events" style={{ fontFamily: MONO, fontSize: 11, color: '#6f6f6a', textDecoration: 'none', letterSpacing: '0.04em' }}>
              Browse events →
            </Link>
          </div>
        )}

        {/* ── CONTROL BAR ── */}
        <div style={{ marginTop: 34, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            {FILTER_TABS.map(name => {
              const active = name === filter;
              return (
                <button key={name} onClick={() => setFilter(name)} style={{
                  appearance: 'none', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em', padding: '14px 1px',
                  color: active ? '#eceae6' : '#6f6f6a',
                  borderBottom: `2px solid ${active ? '#C4451A' : 'transparent'}`,
                  marginBottom: -1, transition: 'color .15s',
                }}>
                  {name}
                </button>
              );
            })}
          </div>
          <button className="ah-sort" onClick={() => setSort(s => s === 'Latest' ? 'Trending' : 'Latest')}
            style={{ appearance: 'none', background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11.5, letterSpacing: '0.03em', color: '#86847f', padding: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7, transition: 'color .15s' }}>
            <span style={{ color: '#5a5a56' }}>sort:</span>
            <span style={{ color: '#e0815e' }}>{sort}</span>
            <span style={{ color: '#5a5a56' }}>↕</span>
          </button>
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 312px', gap: 48, padding: '8px 0 64px', alignItems: 'start' }}>

          {/* FEED */}
          <main>
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} style={{ padding: '25px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ height: 10, width: 60, background: 'rgba(255,255,255,0.05)', marginBottom: 14 }} />
                  <div style={{ height: 20, width: '72%', background: 'rgba(255,255,255,0.05)', marginBottom: 10 }} />
                  <div style={{ height: 13, width: '88%', background: 'rgba(255,255,255,0.03)' }} />
                </div>
              ))
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: '56px 0', textAlign: 'center', color: '#3a3a36', fontFamily: MONO, fontSize: 12 }}>
                No content in this category yet.
              </div>
            ) : filteredItems.map(item => (
              <article key={`${item.type}-${item.id}`} className="ah-item"
                style={{ padding: '25px 8px 25px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                onClick={() => navigate(item.url)}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
                  <span style={getBadge(item.type)}>{item.type}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: '#6f6f6a' }}>{item.date}</span>
                  <span style={{ color: '#3a3a36' }}>·</span>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: '#6f6f6a' }}>{item.readTime}</span>
                </div>

                <h3 className="ah-title" style={{ margin: 0, fontSize: 19.5, lineHeight: 1.32, fontWeight: 600, letterSpacing: '-0.01em', color: '#eceae6' }}>
                  {item.title}
                </h3>

                {item.excerpt && (
                  <p style={{ margin: '9px 0 0', fontSize: 14, lineHeight: 1.6, color: '#8a8a85', maxWidth: 620 }}>
                    {item.excerpt.length > 180 ? item.excerpt.slice(0, 180) + '…' : item.excerpt}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <div style={{ width: 24, height: 24, flexShrink: 0, border: '1px solid rgba(255,255,255,0.14)', background: '#161614', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 9.5, color: '#b6b4af' }}>
                      {item.initials}
                    </div>
                    <span style={{ fontSize: 13, color: '#c8c6c1', fontWeight: 500, whiteSpace: 'nowrap' }}>{item.author}</span>
                    {item.affiliation && (
                      <span style={{ fontSize: 12.5, color: '#605f5a', whiteSpace: 'nowrap' }}>{item.affiliation}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: '#76746f', flexShrink: 0 }}>{item.metric}</span>
                </div>

                {item.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }} onClick={e => e.stopPropagation()}>
                    {item.tags.slice(0, 5).map(tag => (
                      <span key={tag} className="ah-tag"
                        style={{ fontFamily: MONO, fontSize: 11, color: '#86847f', border: '1px solid rgba(255,255,255,0.09)', padding: '2px 8px', cursor: 'pointer', transition: 'all .15s' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}

            {!loading && filteredItems.length > 0 && (
              <div style={{ padding: '28px 0', textAlign: 'center' }}>
                <button className="ah-more"
                  onClick={() => navigate(FILTER_ROUTES[filter] || '/articles')}
                  style={{ appearance: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em', color: '#9a9a95', background: 'none', border: '1px solid rgba(255,255,255,0.12)', padding: '11px 26px', transition: 'all .15s' }}>
                  Load more entries
                </button>
              </div>
            )}
          </main>

          {/* ── SIDEBAR ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'sticky', top: 84 }}>

            {/* LIVE NOW */}
            {liveEvent && (
              <section style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#0d0d0c' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ width: 7, height: 7, background: '#C4451A', borderRadius: '50%', display: 'block', animation: 'artixpulse 1.6s ease-in-out infinite' }} />
                  <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', color: '#e0815e' }}>LIVE NOW</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: MONO, fontSize: 11, color: '#6f6f6a' }}>
                    {liveEvent._count?.registrations || 0} watching
                  </span>
                </div>
                <div style={{ padding: '15px 16px' }}>
                  <h4 style={{ margin: 0, fontSize: 14.5, lineHeight: 1.35, fontWeight: 600, color: '#eceae6' }}>{liveEvent.title}</h4>
                  <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#7a7a75' }}>
                    {liveEvent.creator?.name || liveEvent.creator?.username || ''}
                  </p>
                  <button onClick={() => navigate(`/events/${liveEvent.id}/lobby`)}
                    style={{ appearance: 'none', cursor: 'pointer', width: '100%', marginTop: 14, fontFamily: MONO, fontSize: 12, letterSpacing: '0.03em', padding: 9, border: 'none', background: '#C4451A', color: '#0a0a0a' }}>
                    Join session
                  </button>
                </div>
              </section>
            )}

            {/* UPCOMING EVENTS */}
            {upcomingEvts.length > 0 && (
              <section style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', color: '#76746f' }}>
                  UPCOMING EVENTS
                </div>
                {upcomingEvts.map(ev => {
                  const d = new Date(ev.startDate);
                  return (
                    <div key={ev.id} className="ah-ev-row"
                      style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.055)', display: 'flex', gap: 13, cursor: 'pointer', transition: 'background .15s' }}
                      onClick={() => navigate(`/events/${ev.id}`)}>
                      <div style={{ flexShrink: 0, width: 46, fontFamily: MONO }}>
                        <div style={{ fontSize: 16, color: '#e0815e', fontWeight: 500 }}>{d.getDate()}</div>
                        <div style={{ fontSize: 10, color: '#6f6f6a', letterSpacing: '0.1em' }}>
                          {d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, lineHeight: 1.35, color: '#d4d2cd', fontWeight: 500 }}>{ev.title}</div>
                        <div style={{ fontFamily: MONO, fontSize: 11, color: '#6f6f6a', marginTop: 4 }}>
                          {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} UTC
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* WHO TO FOLLOW */}
            {suggested.length > 0 && (
              <section style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', color: '#76746f' }}>
                  WHO TO FOLLOW
                </div>
                {suggested.map(f => {
                  const on = !!following[f.id];
                  const displayName = f.name || f.username || '';
                  const field = f.institution || (f._count?.articles > 0 ? `${f._count.articles} articles` : f._count?.research > 0 ? `${f._count.research} papers` : `${f._count?.followers || 0} followers`);
                  return (
                    <div key={f.id} style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.055)', display: 'flex', alignItems: 'center', gap: 11 }}>
                      {f.avatar ? (
                        <img src={f.avatar} alt={displayName} style={{ width: 30, height: 30, flexShrink: 0, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.14)' }} />
                      ) : (
                        <div style={{ width: 30, height: 30, flexShrink: 0, border: '1px solid rgba(255,255,255,0.14)', background: '#161614', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 10, color: '#b6b4af' }}>
                          {getInitials(displayName)}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/profile/${f.id}`)}>
                        <div style={{ fontSize: 13, color: '#d4d2cd', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                        <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#6f6f6a' }}>{field}</div>
                      </div>
                      <button
                        onClick={() => setFollowing(p => ({ ...p, [f.id]: !p[f.id] }))}
                        style={{ appearance: 'none', cursor: 'pointer', flexShrink: 0, fontFamily: MONO, fontSize: 11, letterSpacing: '0.02em', padding: '5px 11px', border: `1px solid ${on ? 'rgba(255,255,255,0.16)' : 'rgba(196,69,26,0.5)'}`, background: on ? 'transparent' : 'rgba(196,69,26,0.12)', color: on ? '#8a8a85' : '#e0815e', transition: 'all .15s' }}>
                        {on ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
              </section>
            )}

            {/* TRENDING TAGS */}
            {trendingTags.length > 0 && (
              <section style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px' }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', color: '#76746f', marginBottom: 13 }}>TRENDING TAGS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {trendingTags.map(t => (
                    <span key={t} className="ah-tag"
                      style={{ fontFamily: MONO, fontSize: 11, color: '#9a9a95', border: '1px solid rgba(255,255,255,0.09)', padding: '3px 8px', cursor: 'pointer', transition: 'all .15s' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* MEMBERSHIP */}
            <section style={{ border: '1px solid rgba(196,69,26,0.28)', background: '#0e0c0b' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.14em', color: '#e0815e' }}>MEMBERSHIP</div>
                <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.5, color: '#8a8a85' }}>
                  Unlock unlimited reading, hosting, and the full archive.
                </p>
              </div>
              {TIERS.map(t => (
                <div key={t.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.055)',
                  borderLeft: `2px solid ${t.active ? '#C4451A' : 'transparent'}`,
                  background: t.active ? 'rgba(196,69,26,0.08)' : 'transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e4e2dd' }}>{t.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#6f6f6a' }}>{t.note}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: '#b6b4af' }}>{t.price}</span>
                </div>
              ))}
              <div style={{ padding: '13px 16px' }}>
                <Link to="/subscription" className="ah-plans"
                  style={{ textDecoration: 'none', display: 'block', textAlign: 'center', fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em', color: '#0a0a0a', background: '#C4451A', padding: 10, transition: 'background .15s' }}>
                  Compare plans →
                </Link>
              </div>
            </section>

          </aside>
        </div>

        {/* ── FOOTER ── */}
        <footer className="ah-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '28px 0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#6f6f6a', letterSpacing: '0.06em' }}>
              <span style={{ color: '#C4451A', fontWeight: 600 }}>ARTIX</span> HUB · 2026 · an open platform for research &amp; writing
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/research">papers</Link>
            <Link to="/articles">articles</Link>
            <Link to="/events">events</Link>
            <Link to="/blog">blog</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
