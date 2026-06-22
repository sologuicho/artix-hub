import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { GLOBAL_CATEGORIES } from '../constants/categories';
import { BACKEND_URL } from '../config/client';

const ResearchRow = ({ item, onClick }) => (
  <article
    className="cursor-pointer group"
    style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}
    onClick={onClick}
  >
    <div className="flex flex-col md:flex-row gap-6">
      {item.coverUrl && (
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ width: '100%', maxWidth: '220px', aspectRatio: '4/3' }}
        >
          <img
            src={item.coverUrl}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
      <div className="flex flex-col justify-center gap-2 flex-1">
        {item.category && <span className="category-tag">{item.category}</span>}
        <h3
          className="font-display group-hover:[color:var(--accent)] transition-colors duration-150"
          style={{ fontSize: '1.375rem', lineHeight: 1.25, color: 'var(--text)' }}
        >
          {item.title}
        </h3>
        {item.description && (
          <p className="font-sans text-sm" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
            {item.description.length > 140 ? item.description.slice(0, 140) + '…' : item.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {item.author?.name && (
            <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{item.author.name}</span>
          )}
          {item.createdAt && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                {new Date(item.createdAt).toLocaleDateString('es-MX', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  </article>
);

const Research = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { canPublishArticles } = usePermissions();
  const navigate = useNavigate();
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchResearch();
  }, [query, activeCategory]);

  const fetchResearch = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      if (activeCategory && activeCategory !== 'All') params.append('category', activeCategory);

      const response = await fetch(`${BACKEND_URL}/api/research?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) setResearch(data.research || []);
    } catch (error) {
      console.error('Error fetching research:', error);
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
          <span className="category-tag">Explorar</span>
          <h1
            className="font-display mt-2"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text)', lineHeight: 1.1 }}
          >
            {t('nav.research') || 'Investigaciones'}
          </h1>
          <p className="font-sans mt-3" style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '520px' }}>
            Descubre investigaciones, estudios y papers de nuestra comunidad académica.
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
              placeholder="Buscar investigaciones..."
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
        ) : research.length === 0 ? (
          <div className="py-20 text-center">
            <GraduationCap size={32} style={{ color: 'var(--muted)', margin: '0 auto 1rem' }} />
            <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              No se encontraron investigaciones
            </p>
            <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
              Sé el primero en publicar un estudio o ajusta tus filtros.
            </p>
          </div>
        ) : (
          <div>
            {research.map(item => (
              <ResearchRow key={item.id} item={item} onClick={() => navigate(`/research/${item.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Floating create button */}
      {isAuthenticated() && canPublishArticles && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
          <button
            onClick={() => navigate('/research/create')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={14} />
            Crear investigación
          </button>
        </div>
      )}
    </div>
  );
};

export default Research;
