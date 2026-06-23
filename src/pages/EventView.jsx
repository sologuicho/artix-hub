import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Bell, Check, Share2, ArrowLeft, Building2, Repeat2, Radio, MessageSquare, ExternalLink, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import CollaborationInvitation from '../components/CollaborationInvitation';
import ContentActions from '../components/ContentActions';
import CommentSection from '../components/CommentSection';
import { BACKEND_URL } from '../config/client';

const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
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
      const now = new Date();
      const target = new Date(event.date);
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds, isPast: false });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [event]);

  // Derive registration/waitlist status reactively
  useEffect(() => {
    if (event && user) {
      setRegistered(event.registrations?.some(r => r.userId === user.id) || false);
    }
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
      const response = await fetch(`${BACKEND_URL}/api/events/${id}`, { credentials: 'include' });
      const data = await response.json();
      if (data.ok) {
        setEvent(data.event);
        fetchRepostCount();
        checkRepostStatus();
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    setRegisterLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/events/${id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        if (data.checkoutUrl) {
          // Paid event — redirect to Stripe
          window.location.href = data.checkoutUrl;
          return;
        }
        if (data.waitlisted) {
          setWaitlisted(true);
          setWaitlistPosition(data.position);
        } else {
          setRegistered(true);
          setReminderEnabled(true);
          // Refresh event to update attendee count
          fetchEvent();
        }
      }
    } catch (error) {
      console.error('Error registering for event:', error);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!isAuthenticated()) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/events/${id}/register`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setRegistered(false);
        setReminderEnabled(false);
        fetchEvent();
      }
    } catch (_) {}
  };

  const handleToggleReminder = async (reminderType) => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    try {
      const response = await fetch(`${BACKEND_URL}/api/reminders/events/${id}`, {
        method: reminderEnabled ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ reminderType: reminderType || 'day_before' }),
      });
      const data = await response.json();
      if (data.ok) setReminderEnabled(!reminderEnabled);
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
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
    setReposted(!prev);
    setRepostCount(c => prev ? c - 1 : c + 1);
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

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 28, height: 28,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="site-container py-16 text-center">
          <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            Evento no encontrado
          </p>
          <button onClick={() => navigate('/events')} className="btn btn-outline">
            Volver a Eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div style={{ width: '100%', position: 'relative', overflow: 'hidden', minHeight: '420px', maxHeight: '520px' }}>
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, var(--surface) 0%, #111 100%)',
          }} />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%)',
        }} />

        {/* Back button */}
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider"
          style={{
            position: 'absolute', top: '1.5rem', left: '1.5rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#fff', padding: 0, zIndex: 2,
          }}
        >
          <ArrowLeft size={13} style={{ color: '#fff' }} /> Volver a Eventos
        </button>

        {/* Bottom content */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '2rem 2rem 2.5rem',
          zIndex: 2,
        }}>
          {event.type && (
            <span
              className="category-tag"
              style={{
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                marginBottom: '0.75rem',
                display: 'inline-block',
              }}
            >
              {event.type}
            </span>
          )}
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              lineHeight: 1.1,
              color: '#fff',
              margin: 0,
            }}
          >
            {event.title}
          </h1>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="site-container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>

        <CollaborationInvitation type="event" itemId={id} onUpdate={fetchEvent} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 items-start">

          {/* ── Left column ── */}
          <div>

            {/* Info cards row */}
            <div
              style={{
                display: 'flex',
                gap: '1px',
                flexWrap: 'wrap',
                marginBottom: '2.5rem',
                backgroundColor: 'var(--border)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Date card */}
              {event.date && (
                <div style={{
                  flex: 1, minWidth: '160px', padding: '1rem 1.25rem',
                  backgroundColor: 'var(--surface)',
                }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: '0.4rem' }}>
                    <Calendar size={12} style={{ color: 'var(--muted)' }} />
                    <span
                      className="font-sans text-xs uppercase tracking-widest"
                      style={{ color: 'var(--muted)' }}
                    >
                      Fecha
                    </span>
                  </div>
                  <p className="font-sans text-sm" style={{ color: 'var(--text)', margin: 0 }}>
                    {formatDate(event.date)}
                    {event.time && (
                      <span style={{ color: 'var(--muted)' }}> · {event.time}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Location card */}
              <div style={{
                flex: 1, minWidth: '160px', padding: '1rem 1.25rem',
                backgroundColor: 'var(--surface)',
              }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '0.4rem' }}>
                  <MapPin size={12} style={{ color: 'var(--muted)' }} />
                  <span
                    className="font-sans text-xs uppercase tracking-widest"
                    style={{ color: 'var(--muted)' }}
                  >
                    Lugar
                  </span>
                </div>
                <p className="font-sans text-sm" style={{ color: 'var(--text)', margin: 0 }}>
                  {event.location || 'Por definir'}
                </p>
              </div>

              {/* Attendees card */}
              <div style={{
                flex: 1, minWidth: '160px', padding: '1rem 1.25rem',
                backgroundColor: 'var(--surface)',
              }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '0.4rem' }}>
                  <Users size={12} style={{ color: 'var(--muted)' }} />
                  <span
                    className="font-sans text-xs uppercase tracking-widest"
                    style={{ color: 'var(--muted)' }}
                  >
                    Asistentes
                  </span>
                </div>
                <p className="font-sans text-sm" style={{ color: 'var(--text)', margin: 0 }}>
                  {event.registrations?.length || 0}{' '}
                  <span style={{ color: 'var(--muted)' }}>asistentes</span>
                </p>
              </div>
            </div>

            {/* Countdown */}
            {event.date && (
              countdown.isPast ? (
                <div style={{
                  marginBottom: '2rem',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  padding: '1rem 0',
                  textAlign: 'center',
                }}>
                  <span
                    className="font-sans text-xs uppercase tracking-widest"
                    style={{ color: 'var(--muted)' }}
                  >
                    Evento finalizado
                  </span>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  gap: '0',
                  marginBottom: '2rem',
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                  padding: '1rem 0',
                }}>
                  {[
                    { value: countdown.days, label: 'Días' },
                    { value: countdown.hours, label: 'Horas' },
                    { value: countdown.minutes, label: 'Min' },
                    { value: countdown.seconds, label: 'Seg' },
                  ].map((unit, i, arr) => (
                    <div
                      key={unit.label}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div
                        className="font-mono"
                        style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}
                      >
                        {String(unit.value).padStart(2, '0')}
                      </div>
                      <div
                        className="font-sans text-xs uppercase tracking-widest"
                        style={{ color: 'var(--muted)', marginTop: '0.3rem' }}
                      >
                        {unit.label}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Description */}
            <div style={{ marginBottom: '2.5rem' }}>
              <p
                className="font-sans text-xs uppercase tracking-widest"
                style={{ color: 'var(--muted)', marginBottom: '1rem' }}
              >
                Acerca del evento
              </p>
              <p
                className="font-sans"
                style={{ color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '1.0625rem', margin: 0 }}
              >
                {event.description}
              </p>
            </div>

            {/* Organizer */}
            {(event.creator?.name || event.creator?.username) && (
              <div
                className="flex items-center gap-3"
                style={{ marginBottom: '2.5rem' }}
              >
                <Building2 size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span className="font-sans text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  Organizado por
                </span>
                <span className="font-sans text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {event.creator.name || event.creator.username}
                </span>
              </div>
            )}

            {/* Comments */}
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '2.5rem',
                marginTop: '2.5rem',
              }}
            >
              <h3 className="font-display mb-8" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                Discusión
              </h3>
              <CommentSection eventId={event.id} />
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside>
            <div style={{ position: 'sticky', top: '6rem' }}>

              {/* LIVE badge */}
              {event.isLive && (
                <div style={{
                  backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                  padding: '0.75rem 1rem', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                }}>
                  <Radio size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ef4444', margin: 0 }}>EN VIVO AHORA</p>
                    {event.streamUrl && (
                      <a
                        href={event.streamUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}
                      >
                        Ver stream <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Registration card */}
              <div style={{
                backgroundColor: 'var(--surface)',
                border: '2px solid var(--border)',
                padding: '1.5rem',
                marginBottom: '1rem',
              }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                  <p className="font-display" style={{ fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
                    Inscripción
                  </p>
                  {event.ticketPrice > 0 && (
                    <span className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {event.ticketCurrency || 'MXN'} {event.ticketPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Capacity bar */}
                {event.maxAttendees && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.375rem' }}>
                      <span>{event.registrations?.length || 0} inscritos</span>
                      <span>Límite: {event.maxAttendees}</span>
                    </div>
                    <div style={{ height: 4, backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, ((event.registrations?.length || 0) / event.maxAttendees) * 100)}%`,
                        backgroundColor: (event.registrations?.length || 0) >= event.maxAttendees ? '#ef4444' : 'var(--accent)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                )}

                {waitlisted ? (
                  <div style={{ textAlign: 'center' }}>
                    <Clock size={20} style={{ color: 'var(--muted)', margin: '0 auto 0.5rem' }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.25rem' }}>
                      En lista de espera
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
                      Posición #{waitlistPosition}
                    </p>
                  </div>
                ) : !registered ? (
                  <button
                    onClick={handleRegister}
                    disabled={registerLoading}
                    className="btn btn-primary w-full"
                    style={{ padding: '0.875rem' }}
                  >
                    {registerLoading ? 'Procesando…' : event.ticketPrice > 0 ? `Comprar entrada — ${event.ticketCurrency || 'MXN'} ${event.ticketPrice?.toFixed(2)}` : 'Inscribirme'}
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center gap-2" style={{ marginBottom: '0.875rem' }}>
                      <Check size={15} style={{ color: 'var(--accent)' }} />
                      <span className="font-sans text-sm font-medium" style={{ color: 'var(--accent)' }}>
                        Estás inscrito/a
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleReminder('day_before')}
                      className="btn btn-ghost w-full"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
                    >
                      <Bell size={13} style={{ color: reminderEnabled ? 'var(--accent)' : 'var(--muted)' }} />
                      <span style={{ color: reminderEnabled ? 'var(--accent)' : 'var(--muted)', fontSize: '0.8125rem' }}>
                        {reminderEnabled ? 'Quitar recordatorio' : 'Recordatorio (1 día antes)'}
                      </span>
                    </button>
                    <button
                      onClick={handleUnregister}
                      style={{
                        width: '100%', background: 'none', border: 'none',
                        color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer',
                        padding: '0.25rem 0', textDecoration: 'underline',
                      }}
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
                    backgroundColor: event.isLive ? '#ef4444' : 'var(--surface)',
                    color: event.isLive ? '#fff' : 'var(--text)',
                    border: event.isLive ? 'none' : '1px solid var(--border)',
                    padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                    marginBottom: '0.75rem', transition: 'all 0.15s',
                  }}
                >
                  {event.isLive ? <Radio size={14} /> : <MessageSquare size={14} />}
                  {event.isLive ? 'Unirse al evento en vivo' : 'Ir al lobby'}
                </button>
              )}

              {/* Repost */}
              <button
                onClick={handleRepost}
                className="btn btn-ghost w-full"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  marginBottom: '0.5rem',
                  color: reposted ? 'var(--accent)' : 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                <Repeat2 size={13} />
                {reposted ? 'Reposteado' : 'Repostear'}
                {repostCount > 0 && <span className="font-mono" style={{ fontSize: '0.7rem' }}>· {repostCount}</span>}
              </button>

              {/* Share */}
              <button
                onClick={() => setShowShareModal(true)}
                className="btn btn-outline w-full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}
              >
                <Share2 size={13} /> Compartir evento
              </button>

              {/* Content actions */}
              {isAuthenticated() && (
                <div className="flex justify-end">
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
