import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, Users, Bell, Check, Share2, ArrowLeft,
  Building2, Repeat2, Radio, MessageSquare, ExternalLink, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import CollaborationInvitation from '../components/CollaborationInvitation';
import ContentActions from '../components/ContentActions';
import CommentSection from '../components/CommentSection';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const getCsrfToken = () => {
  for (const c of document.cookie.split(';')) {
    const [name, value] = c.trim().split('=');
    if (name === 'csrf') return value;
  }
  return null;
};

const EventView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [waitlisted, setWaitlisted] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState(null);
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => { fetchEvent(); }, [id]);

  useEffect(() => {
    if (!event?.date) return;
    const tick = () => {
      const diff = new Date(event.date) - new Date();
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }); return; }
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        isPast: false,
      });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [event]);

  useEffect(() => {
    if (event && user) setRegistered(event.registrations?.some(r => r.userId === user.id) || false);
  }, [event, user]);

  useEffect(() => {
    if (!event || !user || !isAuthenticated()) return;
    fetch(`${BACKEND_URL}/api/events/${id}/waitlist`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.ok && d.onWaitlist) { setWaitlisted(true); setWaitlistPosition(d.position); } })
      .catch(() => {});
  }, [event, user]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/events/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) { setEvent(data.event); fetchRepostCount(); checkRepostStatus(); }
    } catch (_) {}
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    setRegisterLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/events/${id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return; }
        if (data.waitlisted) { setWaitlisted(true); setWaitlistPosition(data.position); }
        else { setRegistered(true); setReminderEnabled(true); fetchEvent(); }
      }
    } catch (_) {}
    finally { setRegisterLoading(false); }
  };

  const handleUnregister = async () => {
    if (!isAuthenticated()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/events/${id}/register`, {
        method: 'DELETE', headers: { 'x-csrf-token': getCsrfToken() || '' }, credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) { setRegistered(false); setReminderEnabled(false); fetchEvent(); }
    } catch (_) {}
  };

  const handleToggleReminder = async (reminderType) => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/reminders/events/${id}`, {
        method: reminderEnabled ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ reminderType: reminderType || 'day_before' }),
      });
      const data = await res.json();
      if (data.ok) setReminderEnabled(!reminderEnabled);
    } catch (_) {}
  };

  const fetchRepostCount = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/repost/counts?eventId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setRepostCount(data.count);
    } catch (_) {}
  };

  const checkRepostStatus = async () => {
    if (!isAuthenticated()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/repost/check?eventId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setReposted(data.reposted);
    } catch (_) {}
  };

  const handleRepost = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    const prev = reposted;
    setReposted(!prev); setRepostCount(c => prev ? c - 1 : c + 1);
    try {
      const res = await fetch(`${BACKEND_URL}/api/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ eventId: id }),
      });
      const data = await res.json();
      if (data.ok) { setReposted(data.reposted); setRepostCount(data.count); }
      else { setReposted(prev); setRepostCount(c => prev ? c + 1 : c - 1); }
    } catch (_) { setReposted(prev); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const pad = (n) => String(n).padStart(2, '0');

  const attendeeCount = event?.registrations?.length || 0;
  const capacityPct = event?.maxAttendees
    ? Math.min(100, (attendeeCount / event.maxAttendees) * 100)
    : null;

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 26, height: 26, border: '2px solid var(--border)', borderTopColor: '#C4451A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1rem' }}>
            404 — Evento no encontrado
          </p>
          <button
            onClick={() => navigate('/events')}
            style={{ fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', padding: '0.625rem 1.5rem', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#C4451A'; e.currentTarget.style.color = '#C4451A'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            ← Volver a eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`
        @keyframes artixpulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', width: '100%', height: 'clamp(320px, 45vw, 480px)', overflow: 'hidden' }}>
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={event.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a0a07 0%, #0c0c0b 60%, #111 100%)' }} />
        )}

        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(8,8,8,0.97) 0%, rgba(8,8,8,0.6) 55%, rgba(8,8,8,0.25) 100%)',
        }} />

        {/* Back */}
        <button
          onClick={() => navigate('/events')}
          style={{
            position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 2,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)', padding: 0, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <ArrowLeft size={12} /> Eventos
        </button>

        {/* Live indicator */}
        {event.isLive && (
          <div style={{
            position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 2,
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            backgroundColor: 'rgba(196,69,26,0.15)', border: '1px solid rgba(196,69,26,0.5)',
            padding: '0.25rem 0.625rem',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#C4451A', animation: 'artixpulse 1.5s infinite', display: 'inline-block' }} />
            <span style={{ fontFamily: MONO, fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C4451A' }}>
              En vivo
            </span>
          </div>
        )}

        {/* Bottom content */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem 2.5rem 2.5rem', zIndex: 2 }}>
          {event.type && (
            <span style={{
              fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '0.625rem',
            }}>
              {event.type}
            </span>
          )}
          <h1 style={{
            fontFamily: SANS, fontWeight: 700, margin: 0, color: '#fff',
            fontSize: 'clamp(1.75rem, 4.5vw, 3.25rem)', lineHeight: 1.1,
            maxWidth: '75%',
          }}>
            {event.title}
          </h1>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="site-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>

        <CollaborationInvitation type="event" itemId={id} onUpdate={fetchEvent} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '3rem', alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div>

            {/* Meta strip */}
            <div style={{ display: 'flex', gap: '1px', backgroundColor: 'var(--border)', border: '1px solid var(--border)', marginBottom: '2.5rem' }}>
              {event.date && (
                <div style={{ flex: 1, minWidth: 0, padding: '1rem 1.25rem', backgroundColor: 'var(--bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                    <Calendar size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Fecha</span>
                  </div>
                  <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>
                    {formatDate(event.date)}
                    {event.time && <span style={{ color: 'var(--muted)' }}> · {event.time}</span>}
                  </p>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, padding: '1rem 1.25rem', backgroundColor: 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                  <MapPin size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Lugar</span>
                </div>
                <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)', margin: 0 }}>
                  {event.location || 'Por definir'}
                </p>
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: '1rem 1.25rem', backgroundColor: 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                  <Users size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <span style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Asistentes</span>
                </div>
                <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)', margin: 0 }}>
                  {attendeeCount}
                  {event.maxAttendees && (
                    <span style={{ color: 'var(--muted)', fontFamily: MONO, fontSize: '0.75rem' }}> / {event.maxAttendees}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Countdown */}
            {event.date && (
              <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1.25rem 0', marginBottom: '2.5rem' }}>
                {countdown.isPast ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={13} style={{ color: 'var(--muted)' }} />
                    <span style={{ fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      Evento finalizado
                    </span>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.875rem' }}>
                      Comienza en
                    </p>
                    <div style={{ display: 'flex', gap: 0 }}>
                      {[
                        { value: countdown.days, label: 'Días' },
                        { value: countdown.hours, label: 'Horas' },
                        { value: countdown.minutes, label: 'Min' },
                        { value: countdown.seconds, label: 'Seg' },
                      ].map((unit, i, arr) => (
                        <div
                          key={unit.label}
                          style={{
                            flex: 1, textAlign: 'center',
                            borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                          }}
                        >
                          <div style={{ fontFamily: MONO, fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
                            {pad(unit.value)}
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.4rem' }}>
                            {unit.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div style={{ marginBottom: '2.5rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1rem' }}>
                Acerca del evento
              </p>
              <p style={{ fontFamily: SANS, fontSize: '1.0625rem', color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                {event.description}
              </p>
            </div>

            {/* Organizer */}
            {(event.creator?.name || event.creator?.username) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <Building2 size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                  Organizado por
                </span>
                <span style={{ fontFamily: SANS, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>
                  {event.creator.name || event.creator.username}
                </span>
              </div>
            )}

            {/* Comments */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem', marginTop: '1rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '2rem' }}>
                Discusión
              </p>
              <CommentSection eventId={event.id} />
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside>
            <div style={{ position: 'sticky', top: '6rem' }}>

              {/* Live now */}
              {event.isLive && (
                <div style={{
                  backgroundColor: 'rgba(196,69,26,0.08)', border: '1px solid rgba(196,69,26,0.3)',
                  padding: '0.875rem 1rem', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#C4451A', animation: 'artixpulse 1.5s infinite', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: MONO, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C4451A', margin: 0 }}>
                      En vivo ahora
                    </p>
                    {event.streamUrl && (
                      <a
                        href={event.streamUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem', textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; }}
                      >
                        Ver transmisión <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Registration card */}
              <div style={{
                backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                padding: '1.5rem', marginBottom: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <span style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Inscripción
                  </span>
                  {event.ticketPrice > 0 && (
                    <span style={{ fontFamily: MONO, fontSize: '1rem', fontWeight: 700, color: '#C4451A' }}>
                      {event.ticketCurrency || 'MXN'} {event.ticketPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Capacity bar */}
                {event.maxAttendees && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: '0.5625rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                      <span>{attendeeCount} inscritos</span>
                      <span>Límite {event.maxAttendees}</span>
                    </div>
                    <div style={{ height: 3, backgroundColor: 'var(--border)' }}>
                      <div style={{
                        height: '100%', width: `${capacityPct}%`,
                        backgroundColor: capacityPct >= 100 ? '#ef4444' : '#C4451A',
                        transition: 'width 0.4s',
                      }} />
                    </div>
                  </div>
                )}

                {/* Action area */}
                {waitlisted ? (
                  <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                    <Clock size={18} style={{ color: 'var(--muted)', margin: '0 auto 0.5rem' }} />
                    <p style={{ fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.25rem' }}>En lista de espera</p>
                    <p style={{ fontFamily: MONO, fontSize: '0.625rem', color: 'var(--muted)', margin: 0 }}>Posición #{waitlistPosition}</p>
                  </div>
                ) : !registered ? (
                  <button
                    onClick={handleRegister}
                    disabled={registerLoading}
                    style={{
                      width: '100%', padding: '0.875rem',
                      backgroundColor: registerLoading ? 'var(--border)' : '#C4451A',
                      color: '#fff', border: 'none', cursor: registerLoading ? 'not-allowed' : 'pointer',
                      fontFamily: SANS, fontSize: '0.9375rem', fontWeight: 700, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!registerLoading) e.currentTarget.style.backgroundColor = '#a33615'; }}
                    onMouseLeave={e => { if (!registerLoading) e.currentTarget.style.backgroundColor = '#C4451A'; }}
                  >
                    {registerLoading
                      ? 'Procesando…'
                      : event.ticketPrice > 0
                        ? `Comprar — ${event.ticketCurrency || 'MXN'} ${event.ticketPrice.toFixed(2)}`
                        : 'Inscribirme'}
                  </button>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Check size={14} style={{ color: '#C4451A' }} />
                      <span style={{ fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600, color: '#C4451A' }}>
                        Inscrito/a
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleReminder('day_before')}
                      style={{
                        width: '100%', background: 'none',
                        border: `1px solid ${reminderEnabled ? '#C4451A' : 'var(--border)'}`,
                        color: reminderEnabled ? '#C4451A' : 'var(--muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        padding: '0.625rem', cursor: 'pointer', marginBottom: '0.625rem',
                        fontFamily: SANS, fontSize: '0.8125rem', transition: 'all 0.15s',
                      }}
                    >
                      <Bell size={13} />
                      {reminderEnabled ? 'Quitar recordatorio' : 'Recordatorio (1 día antes)'}
                    </button>
                    <button
                      onClick={handleUnregister}
                      style={{
                        width: '100%', background: 'none', border: 'none',
                        color: 'var(--muted)', fontFamily: MONO, fontSize: '0.5625rem',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        cursor: 'pointer', padding: '0.375rem 0', textDecoration: 'underline',
                        opacity: 0.7, transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                    >
                      Cancelar inscripción
                    </button>
                  </div>
                )}
              </div>

              {/* Lobby button */}
              {(registered || event.isLive) && (
                <button
                  onClick={() => navigate(`/events/${id}/lobby`)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    backgroundColor: event.isLive ? '#C4451A' : 'var(--surface)',
                    color: event.isLive ? '#fff' : 'var(--text)',
                    border: event.isLive ? 'none' : '1px solid var(--border)',
                    padding: '0.75rem',
                    fontFamily: SANS, fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer', marginBottom: '0.625rem', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {event.isLive ? <Radio size={14} /> : <MessageSquare size={14} />}
                  {event.isLive ? 'Unirse al evento en vivo' : 'Ir al lobby'}
                </button>
              )}

              {/* Repost */}
              <button
                onClick={handleRepost}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: 'none', border: '1px solid var(--border)',
                  color: reposted ? '#C4451A' : 'var(--muted)',
                  borderColor: reposted ? 'rgba(196,69,26,0.4)' : 'var(--border)',
                  padding: '0.625rem', cursor: 'pointer', marginBottom: '0.5rem',
                  fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  transition: 'all 0.15s',
                }}
              >
                <Repeat2 size={13} />
                {reposted ? 'Reposteado' : 'Repostear'}
                {repostCount > 0 && <span style={{ fontFamily: MONO, fontSize: '0.5625rem', marginLeft: 2 }}>· {repostCount}</span>}
              </button>

              {/* Share */}
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
                  padding: '0.625rem', cursor: 'pointer', marginBottom: '0.75rem',
                  fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
              >
                <Share2 size={13} /> Compartir
              </button>

              {/* Content actions */}
              {isAuthenticated() && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <ContentActions
                    type="event"
                    itemId={event.id}
                    authorId={event.creatorId || event.creator?.id}
                    author={event.creator}
                    onDelete={() => navigate('/events')}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {showShareModal && (
        <ShareModal
          url={window.location.href}
          title={event.title}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default EventView;
