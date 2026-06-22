import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticleCanvas from '../components/ui/ParticleCanvas';
import PricingSection from '../components/PricingSection';
import { useLanguage } from '../context/LanguageContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { BACKEND_URL } from '../config/client';

// ─── Hero — responde al toggle ──────────────────────────────────────────────
const Hero = ({ navigate, isDark }) => {
  // Colores que dependen del tema
  const heroBg      = isDark ? '#111110' : '#FAFAF8';
  const heroText    = isDark ? '#F0EDE8' : '#1A1917';
  const heroMuted   = isDark ? '#8C8A86' : '#6B6760';
  const heroAccent  = isDark ? '#E8572A' : '#C4451A';
  const btnBorder   = isDark ? '#F0EDE8' : '#1A1917';
  const btnHoverBg  = isDark ? '#F0EDE8' : '#1A1917';
  const btnHoverTxt = isDark ? '#111110' : '#FAFAF8';

  return (
    <section
      style={{ backgroundColor: heroBg, minHeight: '100vh', transition: 'background-color 0.3s ease' }}
      className="relative flex items-center justify-center overflow-hidden"
    >
      <ParticleCanvas isDark={isDark} />

      <div
        className="relative flex flex-col items-center text-center px-6"
        style={{ zIndex: 10, maxWidth: '860px' }}
      >
        <span
          className="font-sans text-xs font-medium tracking-widest uppercase mb-8"
          style={{ color: heroAccent, transition: 'color 0.3s ease' }}
        >
          Plataforma Académica
        </span>

        <h1
          className="font-display"
          style={{
            fontSize: 'clamp(2.5rem, 7vw, 4.75rem)',
            lineHeight: 1.1,
            color: heroText,
            marginBottom: '1.75rem',
            maxWidth: '800px',
            transition: 'color 0.3s ease',
          }}
        >
          El conocimiento que construye el futuro
        </h1>

        <p
          className="font-sans"
          style={{
            fontSize: '1.125rem',
            lineHeight: 1.7,
            color: heroMuted,
            maxWidth: '520px',
            marginBottom: '2.75rem',
            transition: 'color 0.3s ease',
          }}
        >
          Artix Hub es la comunidad para estudiantes, investigadores y profesionales
          de América Latina.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Primary — siempre accent */}
          <button
            onClick={() => navigate('/articles')}
            className="btn btn-primary"
            style={{ minWidth: '180px' }}
          >
            Explorar contenido
          </button>

          {/* Outline — usa los colores del tema del hero */}
          <button
            onClick={() => navigate('/auth')}
            className="btn"
            style={{
              minWidth: '180px',
              border: `1px solid ${btnBorder}`,
              color: btnBorder,
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = btnHoverBg;
              e.currentTarget.style.color = btnHoverTxt;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = btnBorder;
            }}
          >
            Crear cuenta
          </button>
        </div>
      </div>
    </section>
  );
};

// ─── ArticleRow ─────────────────────────────────────────────────────────────
const ArticleRow = ({ article, onClick }) => (
  <article
    className="cursor-pointer group"
    style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}
    onClick={onClick}
  >
    <div className="flex flex-col md:flex-row gap-6">
      {article.coverImage && (
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ width: '100%', maxWidth: '260px', aspectRatio: '3/2' }}
        >
          <img
            src={article.coverImage}
            alt={article.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      <div className="flex flex-col justify-center gap-2 flex-1">
        {article.category && (
          <span className="category-tag">{article.category}</span>
        )}
        <h3
          className="font-display group-hover:[color:var(--accent)] transition-colors duration-150"
          style={{ fontSize: '1.375rem', lineHeight: 1.25, color: 'var(--text)' }}
        >
          {article.title}
        </h3>
        {article.summary && (
          <p className="font-sans text-sm" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
            {article.summary.length > 140 ? article.summary.slice(0, 140) + '…' : article.summary}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {article.author?.name && (
            <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
              {article.author.name}
            </span>
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
        </div>
      </div>
    </div>
  </article>
);

// ─── Home ────────────────────────────────────────────────────────────────────
const Home = ({ searchQuery = '' }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isDark } = useDarkMode();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/articles?status=published&limit=6`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok) setArticles(data.articles || []);
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetchArticles();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      a.author?.name?.toLowerCase().includes(q) ||
      a.tags?.some(tag => tag.toLowerCase().includes(q))
    );
  }, [searchQuery, articles]);

  return (
    <div style={{ backgroundColor: 'var(--bg)' }}>
      <Hero navigate={navigate} isDark={isDark} />

      {/* Articles section */}
      <section className="py-24" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="site-container">
          <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <span className="category-tag">Publicaciones recientes</span>
            <h2
              className="font-display mt-2"
              style={{ fontSize: '2rem', color: 'var(--text)' }}
            >
              {t('home.articles.title') || 'Lo más reciente'}
            </h2>
          </div>

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
          ) : filtered.length > 0 ? (
            <div>
              {filtered.map(article => (
                <ArticleRow
                  key={article.id}
                  article={article}
                  onClick={() => navigate(`/articles/${article.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                {searchQuery ? `Sin resultados para "${searchQuery}"` : 'Aún no hay artículos publicados'}
              </p>
              {!searchQuery && (
                <button onClick={() => navigate('/auth')} className="btn btn-outline mt-4">
                  Únete a la comunidad
                </button>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => navigate('/articles')}
                className="btn btn-ghost font-sans"
                style={{ fontSize: '0.8125rem' }}
              >
                Ver todos los artículos →
              </button>
            </div>
          )}
        </div>
      </section>

      <PricingSection />
    </div>
  );
};

export default Home;
