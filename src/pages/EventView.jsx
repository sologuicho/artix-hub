import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Bell, Check, Share2, ArrowLeft, Building2 } from 'lucide-react';
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
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => { fetchEvent(); }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/events/${id}`, { credentials: 'include' });
      const data = await response.json();
      if (data.ok) {
        setEvent(data.event);
        setRegistered(data.event.registrations?.some(r => r.userId === data.event.userId) || false);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    try {
      const response = await fetch(`${BACKEND_URL}/api/events/${id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) { setRegistered(true); setReminderEnabled(true); }
    } catch (error) {
      console.error('Error registering for event:', error);
    }
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
      <div className="site-container py-12">
        {/* Back */}
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider mb-10"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
        >
          <ArrowLeft size={13} /> Volver a Eventos
        </button>

        <CollaborationInvitation type="event" itemId={id} onUpdate={fetchEvent} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 items-start">
          {/* Main content */}
          <div>
            {/* Banner */}
            {event.bannerUrl && (
              <div style={{ marginBottom: '2rem', aspectRatio: '16/7', overflow: 'hidden' }}>
                <img
                  src={event.bannerUrl}
                  alt={event.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Type tag */}
            {event.type && <span className="category-tag">{event.type}</span>}

            {/* Title */}
            <h1
              className="font-display"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', lineHeight: 1.15, color: 'var(--text)', margin: '1rem 0 1.5rem' }}
            >
              {event.title}
            </h1>

            {/* Meta */}
            <div
              className="flex flex-col gap-3 py-5 mb-8"
              style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
            >
              {event.date && (
                <div className="flex items-center gap-3">
                  <Calendar size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <span className="font-sans text-sm" style={{ color: 'var(--text)' }}>{formatDate(event.date)}</span>
                  {event.time && (
                    <span className="font-sans text-sm" style={{ color: 'var(--muted)' }}>· {event.time}</span>
                  )}
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-3">
                  <MapPin size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <span className="font-sans text-sm" style={{ color: 'var(--text)' }}>{event.location}</span>
                </div>
              )}
              {event.registrations?.length > 0 && (
                <div className="flex items-center gap-3">
                  <Users size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <span className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                    {event.registrations.length} asistentes
                  </span>
                </div>
              )}
              {(event.creator?.name || event.creator?.username) && (
                <div className="flex items-center gap-3">
                  <Building2 size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                  <span className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                    Organizado por{' '}
                    <span style={{ color: 'var(--text)' }}>
                      {event.creator.name || event.creator.username}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h2 className="font-sans text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
                Sobre el evento
              </h2>
              <p className="font-sans" style={{ color: 'var(--text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                {event.description}
              </p>
            </div>

            {/* Comments */}
            <div className="mt-12 pt-10" style={{ borderTop: '1px solid var(--border)' }}>
              <h3 className="font-display mb-8" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                Discusión
              </h3>
              <CommentSection eventId={event.id} />
            </div>
          </div>

          {/* Sidebar */}
          <aside>
            <div style={{ position: 'sticky', top: '6rem' }}>
              {/* Registration */}
              <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-sans text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                    Inscripción
                  </p>
                  <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                    {event.registrations?.length || 0} inscritos
                  </span>
                </div>

                {!registered ? (
                  <button onClick={handleRegister} className="btn btn-primary w-full">
                    Inscribirme
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Check size={14} style={{ color: 'var(--accent)' }} />
                      <p className="font-sans text-sm" style={{ color: 'var(--text)' }}>Inscrito</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleToggleReminder('day_before')}
                        className="flex items-center gap-2 font-sans text-xs"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: reminderEnabled ? 'var(--accent)' : 'var(--muted)',
                          textDecoration: 'underline', textUnderlineOffset: 3,
                        }}
                      >
                        <Bell size={12} />
                        {reminderEnabled ? 'Quitar recordatorio' : 'Recordatorio (1 día antes)'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Share + Actions */}
              <button
                onClick={() => setShowShareModal(true)}
                className="btn btn-outline w-full mb-3"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Share2 size={13} /> Compartir evento
              </button>

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
