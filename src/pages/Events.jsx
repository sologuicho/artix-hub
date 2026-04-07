import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Plus, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import PremiumCard from '../components/ui/PremiumCard';
import GlassSearchBar from '../components/ui/GlassSearchBar';
import { GLOBAL_CATEGORIES } from '../constants/categories';

import { BACKEND_URL } from '../config/client';

const Events = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ query: '', category: 'All' });

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.query) params.append('search', filters.query);
      if (filters.category && filters.category !== 'All') params.append('type', filters.category);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`${BACKEND_URL}/api/events?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (query) => {
    setFilters(prev => ({ ...prev, query }));
  };

  const handleCategoryChange = (category) => {
    setFilters(prev => ({ ...prev, category }));
  };

  const formatDate = (dateString, timeString) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric'
    });
    return timeString ? `${dateStr} • ${timeString}` : dateStr;
  };

  return (
    <PremiumPageLayout>
      {/* Header Section */}
      <div className="relative z-10 mb-12 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white mb-6 animate-fade-in tracking-tight">
          {t('events.title') || "Próximos Eventos"}
        </h1>
        <p className="text-lg text-blue-200/60 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {t('events.subtitle') || "Descubre conferencias, talleres y encuentros exclusivos de la comunidad Artix."}
        </p>
      </div>

      {/* Search & Filter */}
      <div className="max-w-4xl mx-auto mb-12 animate-slide-up relative z-20" style={{ animationDelay: '0.2s' }}>
        <GlassSearchBar
          onSearch={handleSearchChange}
          categories={GLOBAL_CATEGORIES}
          activeCategory={filters.category}
          onCategoryChange={handleCategoryChange}
          placeholder="Buscar eventos..."
        />
      </div>

      {/* Create Button */}
      {isAuthenticated() && (
        <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
          <button
            onClick={() => navigate('/events/create')}
            className="group relative flex items-center justify-center w-14 h-14 bg-blue-600 rounded-full hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
          >
            <Plus className="w-6 h-6 text-white" />
            <span className="absolute right-full mr-4 px-3 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Crear Evento
            </span>
          </button>
        </div>
      )}

      {/* Events Grid */}
      <div className="relative z-10 w-full">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-[400px] rounded-3xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-white/5">
              <Calendar className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No se encontraron eventos</h3>
            <p className="text-gray-400">Intenta ajustar tu búsqueda o filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event, index) => (
              <PremiumCard
                key={event.id}
                title={event.title}
                description={event.description}
                imageUrl={event.bannerUrl}
                category={event.type}
                author={event.creator}
                date={formatDate(event.date, event.time)}
                stats={[
                  { icon: Users, value: event.registrations?.length || 0, label: 'Asistentes' },
                  { icon: MapPin, value: event.location, label: 'Ubicación' }
                ]}
                onClick={() => navigate(`/events/${event.id}`)}
                delay={index * 0.05}
              />
            ))}
          </div>
        )}
      </div>
    </PremiumPageLayout>
  );
};

export default Events;
