import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, User, Search, Plus, GraduationCap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import PremiumCard from '../components/ui/PremiumCard';
import GlassSearchBar from '../components/ui/GlassSearchBar';
import { GLOBAL_CATEGORIES } from '../constants/categories';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const Research = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ query: '', category: 'All' });

  useEffect(() => {
    fetchResearch();
  }, [filters]);

  const fetchResearch = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.query) params.append('search', filters.query);
      if (filters.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters.author) params.append('author', filters.author);

      const response = await fetch(`${BACKEND_URL}/api/research?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setResearch(data.research || []);
      }
    } catch (error) {
      console.error('Error fetching research:', error);
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

  return (
    <PremiumPageLayout>
      {/* Header Section */}
      <div className="relative z-10 mb-12 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 mb-6 animate-fade-in tracking-tight">
          {t('nav.research') || 'Investigaciones'}
        </h1>
        <p className="text-lg text-blue-200/60 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
          Descubre investigaciones estudios y papers de nuestra comunidad académica.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="max-w-4xl mx-auto mb-12 animate-slide-up relative z-20" style={{ animationDelay: '0.2s' }}>
        <GlassSearchBar
          onSearch={handleSearchChange}
          categories={GLOBAL_CATEGORIES}
          activeCategory={filters.category}
          onCategoryChange={handleCategoryChange}
          placeholder="Buscar investigaciones..."
        />
      </div>

      {/* Create Button */}
      {isAuthenticated() && (
        <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
          <button
            onClick={() => navigate('/research/create')}
            className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)]"
          >
            <Plus className="w-6 h-6 text-white" />
            <span className="absolute right-full mr-4 px-3 py-1.5 bg-gray-900 border border-white/10 rounded-lg text-sm text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Crear Investigación
            </span>
          </button>
        </div>
      )}

      {/* Research Grid */}
      <div className="relative z-10 w-full">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-[400px] rounded-3xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : research.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-white/5">
              <GraduationCap className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No se encontraron investigaciones</h3>
            <p className="text-gray-400">Sé el primero en publicar un estudio o ajusta tus filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {research.map((item, index) => (
              <PremiumCard
                key={item.id}
                title={item.title}
                description={item.description}
                imageUrl={item.coverUrl}
                category={item.category}
                author={item.author}
                date={new Date(item.createdAt).toLocaleDateString()}
                stats={[
                  { icon: User, value: item.author?.name || 'Usuario', label: 'Autor' }
                ]}
                onClick={() => navigate(`/research/${item.id}`)}
                delay={index * 0.05}
              />
            ))}
          </div>
        )}
      </div>
    </PremiumPageLayout>
  );
};

export default Research;

