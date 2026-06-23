import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

/* ─── helpers ─────────────────────────────────────────────── */
const MONTHS_ES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function getEventStatus(event) {
  if (event.isLive) return 'live';
  const d = new Date(event.date);
  return d > new Date() ? 'upcoming' : 'past';
}

function fmtCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/* ─── sub-components ─────────────────────────────────────── */

const pulse = `@keyframes artixpulse{0%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.7);}100%{opacity:1;transform:scale(1);}}`;

function LiveBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
      letterSpacing: '0.14em', color: '#e0815e',
      border: '1px solid rgba(196,69,26,0.5)',
      background: 'rgba(196,69,26,0.1)', padding: '2px 8px',
    }}>
      <style>{pulse}</style>
      <span style={{
        width: 7, height: 7, background: '#C4451A', borderRadius: '50%', display: 'block',
        animation: 'artixpulse 1.6s ease-in-out infinite',
      }} />
      EN VIVO
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === 'live') return <LiveBadge />;
  if (status === 'upcoming') return (
    <span style={{
      display: 'inline-block',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500,
      letterSpacing: '0.1em', padding: '2px 8px',
      border: '1px solid rgba(255,255,255,0.16)', color: '#b6b4af',
    }}>PRÓXIMO</span>
  );
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500,
      letterSpacing: '0.1em', padding: '2px 8px',
      border: '1px solid rgba(255,255,255,0.1)', color: '#76746f',
    }}>GRABADO</span>
  );
}

/* Featured live card */
function FeaturedLiveCard({ event, navigate }) {
  const date = new Date(event.date);
  const minutesAgo = Math.round((Date.now() - date.getTime()) / 60000);
  const registrations = event._count?.registrations ?? 0;

  return (
    <section
      onClick={() => navigate(`/events/${event.id}/lobby`)}
      style={{
        border: '1px solid rgba(196,69,26,0.4)', background: '#0d0c0b',
        display: 'flex', cursor: 'pointer', marginTop: 26,
        transition: 'border-color 0.18s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(196,69,26,0.7)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(196,69,26,0.4)'}
    >
      {/* Left panel */}
      <div style={{
        position: 'relative', width: '52%', flexShrink: 0, minHeight: 286,
        backgroundColor: '#101010',
        backgroundImage: 'repeating-linear-gradient(135deg,rgba(255,255,255,0.035) 0 1px,transparent 1px 9px)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <style>{pulse}</style>
        <div style={{
          position: 'absolute', top: 14, left: 14,
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'rgba(10,10,10,0.7)', padding: '5px 9px',
          border: '1px solid rgba(196,69,26,0.5)',
        }}>
          <span style={{
            width: 7, height: 7, background: '#C4451A', borderRadius: '50%', display: 'block',
            animation: 'artixpulse 1.6s ease-in-out infinite',
          }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.14em', color: '#e0815e' }}>
            EN VIVO
          </span>
        </div>
        {registrations > 0 && (
          <span style={{
            position: 'absolute', top: 16, right: 14,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#9a9a95',
          }}>
            {fmtCount(registrations)} viendo
          </span>
        )}
        <span style={{
          width: 54, height: 54, border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: '#e9e7e3',
        }}>▶</span>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, padding: '30px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {event.type && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.12em', color: '#76746f' }}>
            {event.type.toUpperCase()}
          </div>
        )}
        <h2 style={{ margin: '13px 0 0', fontSize: 26, lineHeight: 1.18, fontWeight: 600, letterSpacing: '-0.015em', color: '#f4f2ee' }}>
          {event.title}
        </h2>
        {event.description && (
          <p style={{
            margin: '12px 0 0', fontFamily: "'IBM Plex Serif', Georgia, serif",
            fontSize: 14.5, lineHeight: 1.55, color: '#9a9a95', maxWidth: 430,
          }}>
            {event.description.length > 160 ? event.description.slice(0, 160) + '…' : event.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, letterSpacing: '0.03em',
            color: '#0a0a0a', background: '#C4451A', padding: '10px 22px',
          }}>
            Entrar a la sala →
          </span>
          {minutesAgo > 0 && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: '#76746f' }}>
              comenzó hace {minutesAgo} min
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* Event list row */
function EventRow({ event, navigate }) {
  const status = getEventStatus(event);
  const date = new Date(event.date);
  const isLive = status === 'live';
  const isPast = status === 'past';
  const registrations = event._count?.registrations ?? 0;
  const creator = event.creator;

  const mon = isLive ? 'AHORA' : MONTHS_ES[date.getMonth()];
  const day = isLive ? '●' : String(date.getDate()).padStart(2, '0');
  const timeStr = isPast ? 'grabado' : isLive ? 'en vivo' : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  function handleClick() {
    if (isLive) navigate(`/events/${event.id}/lobby`);
    else navigate(`/events/${event.id}`);
  }

  const ctaLabel = isLive ? 'Entrar' : isPast ? 'Ver grabación' : 'Registrarse';
  const attendLabel = isPast
    ? `${fmtCount(registrations)} vistas`
    : isLive
      ? `${fmtCount(registrations)} viendo`
      : `${fmtCount(registrations)} inscritos`;

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'grid', gridTemplateColumns: '96px minmax(0,1fr) auto',
        gap: 24, alignItems: 'center', padding: '20px 4px 20px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.012)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Date box */}
      <div style={{
        textAlign: 'center', padding: '12px 6px',
        border: isLive ? '1px solid rgba(196,69,26,0.45)' : '1px solid rgba(255,255,255,0.09)',
        background: isLive ? 'rgba(196,69,26,0.06)' : 'transparent',
      }}>
        <style>{pulse}</style>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.1em', color: '#6f6f6a' }}>
          {mon}
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 26, lineHeight: 1.05,
          color: isLive ? '#C4451A' : '#e0815e', marginTop: 3,
          ...(isLive ? { animation: 'artixpulse 1.6s ease-in-out infinite' } : {}),
        }}>
          {day}
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6f6f6a', marginTop: 3 }}>
          {timeStr}
        </div>
      </div>

      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <StatusBadge status={status} />
          {event.type && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6f6f6a' }}>
              {event.type}
            </span>
          )}
        </div>
        <h3 style={{
          margin: 0, fontSize: 18, lineHeight: 1.32, fontWeight: 600,
          letterSpacing: '-0.01em', color: '#eceae6', transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#e0815e'}
          onMouseLeave={e => e.currentTarget.style.color = '#eceae6'}
        >
          {event.title}
        </h3>
        {creator && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10 }}>
            <div style={{
              width: 22, height: 22, flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.14)', background: '#161614',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#b6b4af',
              overflow: 'hidden',
            }}>
              {creator.avatar
                ? <img src={creator.avatar} alt={creator.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getInitials(creator.name)}
            </div>
            <span style={{ fontSize: 12.5, color: '#c8c6c1' }}>{creator.name || creator.username}</span>
          </div>
        )}
      </div>

      {/* Attendance + CTA */}
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: '#76746f' }}>
          {attendLabel}
        </span>
        <span style={isLive ? {
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: '0.03em',
          color: '#0a0a0a', background: '#C4451A', padding: '7px 16px',
        } : {
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: '0.03em',
          color: '#e0815e', border: '1px solid rgba(196,69,26,0.5)', padding: '6px 15px',
        }}>
          {ctaLabel}
        </span>
      </div>
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────── */
const TABS = ['En vivo', 'Próximo', 'Grabado'];
const TOPICS_FIXED = ['Todos', 'Conferencia', 'Taller', 'Charla', 'Grupo de lectura', 'Defensa'];

export default function Events() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Próximo');
  const [activeTopic, setActiveTopic] = useState('Todos');
  const [topics, setTopics] = useState(TOPICS_FIXED);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/events?limit=40`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        const events = data.events || [];
        setAllEvents(events);
        // Build topic list from returned types
        const types = [...new Set(events.map(e => e.type).filter(Boolean))];
        setTopics(['Todos', ...types]);
        // Auto-select tab: prefer live if any, else upcoming
        const hasLive = events.some(e => e.isLive);
        if (hasLive) setActiveTab('En vivo');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* Derived data */
  function classify(ev) {
    if (ev.isLive) return 'En vivo';
    if (new Date(ev.date) > new Date()) return 'Próximo';
    return 'Grabado';
  }

  const counts = {
    'En vivo': allEvents.filter(e => classify(e) === 'En vivo').length,
    'Próximo': allEvents.filter(e => classify(e) === 'Próximo').length,
    'Grabado': allEvents.filter(e => classify(e) === 'Grabado').length,
  };

  const featuredLive = allEvents.find(e => e.isLive);

  const filtered = allEvents
    .filter(e => classify(e) === activeTab)
    .filter(e => activeTopic === 'Todos' || e.type === activeTopic);

  /* ── render ── */
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '32px 0 0', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
              letterSpacing: '0.16em', color: '#76746f', marginBottom: 9,
            }}>
              CHARLAS · GRUPOS DE LECTURA · DEFENSAS · TALLERES
            </div>
            <h1 style={{ margin: 0, fontSize: 27, fontWeight: 600, letterSpacing: '-0.02em', color: '#f4f2ee' }}>
              Eventos
            </h1>
          </div>
          {isAuthenticated() && (
            <Link
              to="/events/create"
              style={{
                textDecoration: 'none', flexShrink: 0,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                letterSpacing: '0.03em', color: '#e0815e',
                border: '1px solid rgba(196,69,26,0.5)', padding: '7px 14px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,69,26,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Crear evento
            </Link>
          )}
        </div>

        {/* Featured live */}
        {!loading && featuredLive && (
          <FeaturedLiveCard event={featuredLive} navigate={navigate} />
        )}

        {/* Tabs + topic filter */}
        <div style={{
          marginTop: 34, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Status tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
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
                    {counts[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Topic filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {topics.map(tp => {
              const on = tp === activeTopic;
              return (
                <button
                  key={tp}
                  onClick={() => setActiveTopic(tp)}
                  style={{
                    appearance: 'none', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.02em',
                    padding: '0 0 14px',
                    color: on ? '#e0815e' : '#6f6f6a',
                    borderBottom: `1px solid ${on ? '#C4451A' : 'transparent'}`,
                  }}
                >
                  {tp}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '8px 0 72px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
              <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.08)',
                borderTopColor: '#C4451A',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#6f6f6a', letterSpacing: '0.08em' }}>
                NO HAY EVENTOS EN ESTA CATEGORÍA
              </div>
              {activeTab === 'En vivo' && (
                <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: '#5a5a56', marginTop: 12 }}>
                  No hay eventos en vivo ahora mismo. Consulta los próximos eventos.
                </p>
              )}
            </div>
          ) : (
            filtered.map(event => (
              <EventRow key={event.id} event={event} navigate={navigate} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
