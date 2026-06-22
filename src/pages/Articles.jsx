import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { GLOBAL_CATEGORIES } from '../constants/categories';
import { BACKEND_URL } from '../config/client';

const ArticleRow = ({ article, onClick }) => (
  <article
    className="cursor-pointer group"
    style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}
    onClick={onClick}
  >
    <div className="flex flex-col md:flex-row gap-6">
      {article.coverUrl && (
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ width: '100%', maxWidth: '220px', aspectRatio: '4/3' }}
        >
          <img
            src={article.coverUrl}
            alt={article.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
      <div className="flex flex-col justify-center gap-2 flex-1">
        {article.category && <span className="category-tag">{article.category}</span>}
        <h3
          className="font-display group-hover:[color:var(--accent)] transition-colors duration-150"
          style={{ fontSize: '1.375rem', lineHeight: 1.25, color: 'var(--text)' }}
        >
          {article.title}
        </h3>
        {article.description && (
          <p className="font-sans text-sm" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
            {article.description.length > 140 ? article.description.slice(0, 140) + '…' : article.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {article.author?.name && (
            <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{article.author.name}</span>
          )}
          {article.createdAt && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                {new Date(article.createdAt).toLocaleDateString('es-MX', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            </>
          )}
          {article.readTime && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{article.readTime} min</span>
            </>
          )}
        </div>
      </div>
    </div>
  </article>
);

const Articles = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { canPublishArticles } = usePermissions();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetchArticles();
  }, [query, activeCategory]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      if (activeCategory !== 'all') params.append('category', activeCategory);

      const response = await fetch(`${BACKEND_URL}/api/articles?${params.toString()}`);
      const data = await response.json();
      if (data.ok) setArticles(data.articles || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...(GLOBAL_CATEGORIES || []).filter(c => c.id !== 'all').slice(0, 4).map(c => c.id)];

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-16">
        {/* Header */}
        <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
          <span className="category-tag">Artículos</span>
          <h1
            className="font-display mt-2"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text)', lineHeight: 1.1 }}
          >
            {t('articles.title') || 'Artículos'}
          </h1>
          <p className="font-sans mt-3" style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '520px' }}>
            Explora investigaciones, estudios y perspectivas de nuestra comunidad.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 flex-wrap">
            <div className="relative" style={{ maxWidth: '360px', flex: '0 0 auto', width: '100%' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
              />
              <input
                className="input-field"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Buscar artículos..."
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
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          </div>

          {isAuthenticated() && canPublishArticles && (
            <button
              onClick={() => navigate('/articles/create')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
            >
              <Plus size={14} />
              {t('articles.create') || 'Crear Artículo'}
            </button>
          )}
        </div>

        {/* Section label */}
        <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
            Artículos recientes
          </h2>
        </div>

        {/* Articles */}
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
        ) : articles.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>
              {query ? `Sin resultados para "${query}"` : 'Aún no hay artículos publicados'}
            </p>
          </div>
        ) : (
          <div>
            {articles.map(article => (
              <ArticleRow
                key={article.id}
                article={article}
                onClick={() => navigate(`/articles/${article.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Articles;
