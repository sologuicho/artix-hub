import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Plus, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { GLOBAL_CATEGORIES } from '../constants/categories';
import { BACKEND_URL } from '../config/client';

const EventRow = ({ event, onClick }) => {
  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  return (
    <article
      className="cursor-pointer group"
      style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}
      onClick={onClick}
    >
      <div className="flex flex-col md:flex-row gap-6">
        {event.bannerUrl && (
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{ width: '100%', maxWidth: '220px', aspectRatio: '4/3' }}
          >
            <img
              src={event.bannerUrl}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
        <div className="flex flex-col justify-center gap-2 flex-1">
          {event.type && <span className="category-tag">{event.type}</span>}
          <h3
            className="font-display group-hover:[color:var(--accent)] transition-colors duration-150"
            style={{ fontSize: '1.375rem', lineHeight: 1.25, color: 'var(--text)' }}
          >
            {event.title}
          </h3>
          {event.description && (
            <p className="font-sans text-sm" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
              {event.description.length > 140 ? event.description.slice(0, 140) + '…' : event.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {dateStr && (
              <div className="flex items-center gap-1.5">
                <Calendar size={12} style={{ color: 'var(--muted)' }} />
                <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{dateStr}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin size={12} style={{ color: 'var(--muted)' }} />
                <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{event.location}</span>
              </div>
            )}
            {event.registrations?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users size={12} style={{ color: 'var(--muted)' }} />
                <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                  {event.registrations.length} asistentes
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const Events = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { canPublishEvents } = usePermissions();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchEvents();
  }, [query, activeCategory]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      if (activeCategory && activeCategory !== 'All') params.append('type', activeCategory);

      const response = await fetch(`${BACKEND_URL}/api/events?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...(GLOBAL_CATEGORIES || []).filter(c => c.id !== 'all').slice(0, 5).map(c => c.id)];

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-16">
        {/* Header */}
        <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
          <span className="category-tag">Comunidad</span>
          <h1
            className="font-display mt-2"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text)', lineHeight: 1.1 }}
          >
            {t('events.title') || 'Próximos Eventos'}
          </h1>
          <p className="font-sans mt-3" style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '520px' }}>
            {t('events.subtitle') || 'Descubre conferencias, talleres y encuentros de la comunidad Artix.'}
          </p>
        </div>

        {/* Search + categories */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 flex-wrap">
          <div className="relative" style={{ maxWidth: '400px', flex: '0 0 auto', width: '100%' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
            />
            <input
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Buscar eventos..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="font-sans text-xs uppercase tracking-wider"
                style={{
                  background: 'none',
                  border: activeCategory === cat ? '1px solid var(--text)' : '1px solid var(--border)',
                  color: activeCategory === cat ? 'var(--text)' : 'var(--muted)',
                  padding: '0.375rem 0.75rem',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
              >
                {cat === 'All' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div style={{
              width: 28, height: 28,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar size={32} style={{ color: 'var(--muted)', margin: '0 auto 1rem' }} />
            <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              No se encontraron eventos
            </p>
            <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
              Intenta ajustar tu búsqueda o filtros.
            </p>
          </div>
        ) : (
          <div>
            {events.map(event => (
              <EventRow key={event.id} event={event} onClick={() => navigate(`/events/${event.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Floating create button */}
      {isAuthenticated() && canPublishEvents && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
          <button
            onClick={() => navigate('/events/create')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={14} />
            Crear evento
          </button>
        </div>
      )}
    </div>
  );
};

export default Events;
