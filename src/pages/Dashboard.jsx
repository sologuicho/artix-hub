import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Calendar, BookOpen, ArrowRight, Building2, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import usePermissions from '../hooks/usePermissions';
import { BACKEND_URL } from '../config/client';

// ── Stat card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, description }) => (
  <div style={{ border: '1px solid var(--border)', padding: '1.75rem' }}>
    <p
      className="font-sans text-xs uppercase tracking-wider mb-3"
      style={{ color: 'var(--muted)' }}
    >
      {label}
    </p>
    <p
      className="font-display"
      style={{ fontSize: '3rem', color: 'var(--text)', lineHeight: 1 }}
    >
      {value}
    </p>
    <p
      className="font-sans text-xs mt-2"
      style={{ color: 'var(--muted)' }}
    >
      {description}
    </p>
  </div>
);

// ── Content row link ────────────────────────────────────────────────────────
const ContentRow = ({ title, meta, to, thumbnail }) => (
  <Link
    to={to}
    className="group flex items-start gap-4 py-4 article-divider transition-colors"
  >
    {thumbnail && (
      <div style={{ width: 56, height: 56, flexShrink: 0, overflow: 'hidden' }}>
        <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p
        className="font-sans font-medium group-hover:[color:var(--accent)] transition-colors duration-150 truncate"
        style={{ fontSize: '0.9375rem', color: 'var(--text)' }}
      >
        {title}
      </p>
      {meta && (
        <p className="font-sans text-xs mt-1" style={{ color: 'var(--muted)' }}>{meta}</p>
      )}
    </div>
    <ArrowRight size={14} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 4 }} />
  </Link>
);

// ── Dashboard ────────────────────────────────────────────────────────────────
const STUDENT_BANNER_KEY = 'student_banner_dismissed';

const Dashboard = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { canPublish, canPublishArticles } = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showStudentBanner, setShowStudentBanner] = useState(false);
  const [studentResult, setStudentResult] = useState(null); // 'verified' | 'pending' | 'already_active'

  const [stats, setStats] = useState({ articles: 0, posts: 0, events: 0 });
  const [recentArticles, setRecentArticles] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [readingData, setReadingData] = useState({ continueReading: [], recommendations: [] });

  useEffect(() => {
    if (user) {
      setIsAdmin(user.email === 'floresescobedoluisalberto@gmail.com');
      if (user.subscriptionTier === 'OBSERVER') {
        setShowStudentBanner(localStorage.getItem(STUDENT_BANNER_KEY) !== 'true');
      }
    }
    const result = sessionStorage.getItem('student_result');
    if (result) {
      setStudentResult(result);
      sessionStorage.removeItem('student_result');
    }
  }, [user]);

  const dismissStudentBanner = () => {
    localStorage.setItem(STUDENT_BANNER_KEY, 'true');
    setShowStudentBanner(false);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchDashboardData();
    fetchRecommendations();
  }, [user, authLoading]);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${BACKEND_URL}/api/reading-progress/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data) setReadingData(data);
    } catch (_) {}
  };

  const fetchDashboardData = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const [statsRes, articlesRes, eventsRes, postsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/dashboard/stats`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/articles?limit=3`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/events?limit=2&upcoming=true`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/blog?limit=3`, { headers, credentials: 'include' }),
      ]);
      const [statsData, articlesData, , postsData] = await Promise.all([
        statsRes.json(), articlesRes.json(), eventsRes.json(), postsRes.json(),
      ]);
      if (statsData.ok) setStats(statsData.stats);
      if (articlesData.ok) setRecentArticles(articlesData.articles);
      if (postsData.ok) setRecentPosts(postsData.posts);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div style={{
          width: 28, height: 28, border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="site-container py-16" style={{ minHeight: '100vh' }}>

      {/* Student banner for OBSERVER users */}
      {showStudentBanner && (
        <div
          className="flex items-center justify-between mb-8 font-sans text-sm"
          style={{
            padding: '0.875rem 1rem',
            backgroundColor: 'var(--surface)',
            borderLeft: '3px solid var(--accent)',
          }}
        >
          <Link
            to="/student-verification"
            style={{ color: 'var(--text)', textDecoration: 'none' }}
          >
            ¿Eres estudiante? Obtén el plan Miembro gratis{' '}
            <span style={{ color: 'var(--accent)' }}>→</span>
          </Link>
          <button
            onClick={dismissStudentBanner}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, padding: '0 0 0 1rem' }}
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Student verification result banners */}
      {studentResult === 'verified' && (
        <div
          className="flex items-center justify-between mb-8 font-sans text-sm"
          style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--surface)', borderLeft: '3px solid #6dbf6d' }}
        >
          <span style={{ color: 'var(--text)' }}>
            ¡Tu plan Estudiante está activo! Ya puedes publicar artículos y usar el asistente de escritura con IA.
          </span>
          <button
            onClick={() => setStudentResult(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', paddingLeft: '1rem', lineHeight: 1 }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {studentResult === 'pending' && (
        <div
          className="flex items-center justify-between mb-8 font-sans text-sm"
          style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--surface)', borderLeft: '3px solid var(--accent)' }}
        >
          <span style={{ color: 'var(--text)' }}>
            Solicitud enviada — revisaremos tu credencial en 24-48 horas y te notificaremos por email.
          </span>
          <button
            onClick={() => setStudentResult(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', paddingLeft: '1rem', lineHeight: 1 }}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {studentResult === 'already_active' && (
        <div
          className="flex items-center justify-between mb-8 font-sans text-sm"
          style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--surface)', borderLeft: '3px solid var(--border)' }}
        >
          <span style={{ color: 'var(--muted)' }}>Ya tienes el plan Estudiante activo.</span>
          <button
            onClick={() => setStudentResult(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', paddingLeft: '1rem', lineHeight: 1 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Welcome heading */}
      <div className="mb-12" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
        <span className="category-tag">Dashboard</span>
        <h1
          className="font-display mt-2"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--text)', lineHeight: 1.1 }}
        >
          Bienvenido,{' '}
          <span style={{ color: 'var(--accent)' }}>
            {user?.name?.split(' ')[0] || user?.username || 'Usuario'}
          </span>
        </h1>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {user?.username && (
            <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
              @{user.username} · Tu centro de control en Artix Hub
            </p>
          )}
          <Link
            to="/feed"
            className="font-sans text-sm transition-colors duration-150"
            style={{ color: 'var(--accent)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--accent)'}
          >
            Ver tu feed →
          </Link>
        </div>
      </div>

      {/* Admin research panel */}
      {isAdmin && (
        <section
          className="mb-12 p-8"
          style={{ border: '1px solid var(--accent)' }}
        >
          <div className="flex items-center gap-4 mb-6">
            <Building2 size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                Admin
              </p>
              <h2 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
                Panel Artix Research
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Crear Artículo', to: '/articles/create?asArtixResearch=true' },
              { label: 'Crear Investigación', to: '/research/create?asArtixResearch=true' },
              { label: 'Crear Post', to: '/blog/create?asArtixResearch=true' },
              { label: 'Crear Evento', to: '/events/create?asArtixResearch=true' },
            ].map(({ label, to }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className="btn btn-outline text-left"
                style={{ justifyContent: 'flex-start', fontSize: '0.6875rem' }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-16"
        style={{ border: '1px solid var(--border)' }}
      >
        <div style={{ borderRight: '1px solid var(--border)' }}>
          <StatCard label="Artículos" value={stats.articles} description="Publicaciones académicas" />
        </div>
        <div style={{ borderRight: '1px solid var(--border)' }}>
          <StatCard label="Blog Posts" value={stats.posts} description="Entradas de blog" />
        </div>
        <StatCard label="Eventos" value={stats.events} description="Eventos organizados" />
      </div>

      {/* Continue reading */}
      {readingData.continueReading?.length > 0 && (
        <section className="mb-16">
          <div className="mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--text)' }}>
              Continúa leyendo
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {readingData.continueReading.map(item => {
              const to = item.type === 'article'
                ? `/articles/${item.contentId}`
                : item.type === 'research'
                ? `/research/${item.contentId}`
                : `/blog/${item.contentId}`;
              return (
                <Link
                  key={`${item.type}-${item.contentId}`}
                  to={to}
                  className="group"
                  style={{ border: '1px solid var(--border)', padding: '1.25rem', display: 'block' }}
                >
                  <p
                    className="font-sans font-medium group-hover:[color:var(--accent)] transition-colors duration-150 mb-3"
                    style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.4 }}
                  >
                    {item.title || 'Sin título'}
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-sans text-xs capitalize" style={{ color: 'var(--muted)' }}>{item.type}</span>
                    <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>
                      {Math.round(item.percentage)}%
                    </span>
                  </div>
                  <div style={{ height: 2, backgroundColor: 'var(--border)' }}>
                    <div style={{ height: '100%', width: `${item.percentage}%`, backgroundColor: 'var(--accent)' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent content — 2 column grid */}
      {(recentArticles.length > 0 || recentPosts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Recent articles */}
          {recentArticles.length > 0 && (
            <section>
              <div
                className="flex items-center justify-between mb-2"
                style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}
              >
                <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--text)' }}>
                  Artículos recientes
                </h2>
                <Link
                  to="/articles"
                  className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  Ver todo
                </Link>
              </div>
              {recentArticles.slice(0, 3).map(article => (
                <ContentRow
                  key={article.id}
                  title={article.title}
                  meta={`${formatDate(article.createdAt)} · ${article.category || ''}`}
                  to={`/articles/${article.id}`}
                  thumbnail={article.coverUrl}
                />
              ))}
            </section>
          )}

          {/* Recent posts */}
          {recentPosts.length > 0 && (
            <section>
              <div
                className="flex items-center justify-between mb-2"
                style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}
              >
                <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--text)' }}>
                  Blog reciente
                </h2>
                <Link
                  to="/blog"
                  className="font-sans text-xs uppercase tracking-wider transition-colors duration-150"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  Ver todo
                </Link>
              </div>
              {recentPosts.slice(0, 3).map(post => (
                <ContentRow
                  key={post.id}
                  title={post.title}
                  meta={formatDate(post.createdAt)}
                  to="/blog"
                  thumbnail={post.coverUrl}
                />
              ))}
            </section>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && stats.articles === 0 && stats.posts === 0 && stats.events === 0 && (
        <div
          className="text-center py-20"
          style={{ border: '1px dashed var(--border)' }}
        >
          <p
            className="font-display mb-4"
            style={{ fontSize: '1.5rem', color: 'var(--muted)' }}
          >
            Tu viaje comienza aquí
          </p>
          <p className="font-sans text-sm mb-8" style={{ color: 'var(--muted)' }}>
            Aún no has publicado contenido. ¡Comparte tus conocimientos con la comunidad!
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {canPublishArticles && (
              <Link to="/articles/create" className="btn btn-primary">Crear Artículo</Link>
            )}
            {canPublish && (
              <Link to="/blog/create" className="btn btn-outline">Crear Post</Link>
            )}
            {!canPublish && !canPublishArticles && (
              <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                Adquiere un plan para habilitar la publicación de contenido.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
