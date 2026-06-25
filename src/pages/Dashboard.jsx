import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import usePermissions from '../hooks/usePermissions';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";
const ACCENT = '#C4451A';

// ── Stat card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, description }) => (
  <div style={{ border: '1px solid var(--border)', padding: '1.75rem' }}>
    <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '0.875rem' }}>
      {label}
    </p>
    <p style={{ fontFamily: MONO, fontSize: '3rem', color: 'var(--text)', lineHeight: 1, fontWeight: 600 }}>
      {value}
    </p>
    <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '0.625rem' }}>
      {description}
    </p>
  </div>
);

// ── Content row link ────────────────────────────────────────────────────────
const ContentRow = ({ title, meta, to, thumbnail }) => (
  <Link
    to={to}
    style={{ textDecoration: 'none', display: 'flex', alignItems: 'start', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}
    className="group"
  >
    {thumbnail && (
      <div style={{ width: 56, height: 56, flexShrink: 0, overflow: 'hidden', borderRadius: 0 }}>
        <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        className="group-hover:[color:var(--accent)]"
        style={{ fontFamily: SANS, fontWeight: 500, fontSize: '0.9375rem', color: 'var(--text)', transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {title}
      </p>
      {meta && (
        <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{meta}</p>
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
  const [studentResult, setStudentResult] = useState(null);

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 28, height: 28, border: '2px solid var(--border)',
          borderTopColor: ACCENT, borderRadius: '50%',
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
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '2rem',
            padding: '0.875rem 1rem',
            backgroundColor: 'var(--surface)',
            borderLeft: `3px solid ${ACCENT}`,
            fontFamily: SANS,
            fontSize: '0.875rem',
          }}
        >
          <Link
            to="/student-verification"
            style={{ color: 'var(--text)', textDecoration: 'none' }}
          >
            ¿Eres estudiante? Obtén el plan Miembro gratis{' '}
            <span style={{ color: ACCENT }}>→</span>
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
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '2rem',
            padding: '0.875rem 1rem',
            backgroundColor: 'var(--surface)',
            borderLeft: '3px solid #6dbf6d',
            fontFamily: SANS, fontSize: '0.875rem',
          }}
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
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '2rem',
            padding: '0.875rem 1rem',
            backgroundColor: 'var(--surface)',
            borderLeft: `3px solid ${ACCENT}`,
            fontFamily: SANS, fontSize: '0.875rem',
          }}
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
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '2rem',
            padding: '0.875rem 1rem',
            backgroundColor: 'var(--surface)',
            borderLeft: '3px solid var(--border)',
            fontFamily: SANS, fontSize: '0.875rem',
          }}
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
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '2rem', marginBottom: '3rem' }}>
        <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
          Dashboard
        </p>
        <h1
          style={{ fontFamily: SANS, fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
        >
          Bienvenido,{' '}
          <span style={{ color: ACCENT }}>
            {user?.name?.split(' ')[0] || user?.username || 'Usuario'}
          </span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
          {user?.username && (
            <p style={{ fontFamily: MONO, fontSize: '0.75rem', color: 'var(--muted)' }}>
              @{user.username} · Tu centro de control en Artix Hub
            </p>
          )}
          <Link
            to="/feed"
            style={{ fontFamily: MONO, fontSize: '0.75rem', color: ACCENT, textDecoration: 'none' }}
          >
            Ver tu feed →
          </Link>
        </div>
      </div>

      {/* Admin research panel */}
      {isAdmin && (
        <section
          style={{ border: `1px solid ${ACCENT}`, padding: '2rem', marginBottom: '3rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Building2 size={18} style={{ color: ACCENT, flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: ACCENT }}>
                Admin
              </p>
              <h2 style={{ fontFamily: SANS, fontWeight: 600, fontSize: '1.25rem', color: 'var(--text)', marginTop: '0.125rem' }}>
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
                style={{ justifyContent: 'flex-start', fontFamily: MONO, fontSize: '0.6875rem' }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Stats grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-3"
        style={{ border: '1px solid var(--border)', marginBottom: '4rem' }}
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
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>
              Continúa leyendo
            </p>
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
                  style={{ border: '1px solid var(--border)', padding: '1.25rem', display: 'block', textDecoration: 'none' }}
                  className="group"
                >
                  <p
                    className="group-hover:[color:var(--accent)]"
                    style={{ fontFamily: SANS, fontWeight: 500, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.4, marginBottom: '0.875rem', transition: 'color 0.15s' }}
                  >
                    {item.title || 'Sin título'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontFamily: MONO, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>{item.type}</span>
                    <span style={{ fontFamily: MONO, fontSize: '0.75rem', color: ACCENT, fontWeight: 600 }}>
                      {Math.round(item.percentage)}%
                    </span>
                  </div>
                  <div style={{ height: 2, backgroundColor: 'var(--border)' }}>
                    <div style={{ height: '100%', width: `${item.percentage}%`, backgroundColor: ACCENT }} />
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}
              >
                <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>
                  Artículos recientes
                </p>
                <Link
                  to="/articles"
                  style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = ACCENT}
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}
              >
                <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>
                  Blog reciente
                </p>
                <Link
                  to="/blog"
                  style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = ACCENT}
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
          style={{ textAlign: 'center', padding: '5rem 2rem', border: '1px dashed var(--border)' }}
        >
          <p
            style={{ fontFamily: SANS, fontWeight: 600, fontSize: '1.5rem', color: 'var(--muted)', marginBottom: '1rem' }}
          >
            Tu viaje comienza aquí
          </p>
          <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '2rem' }}>
            Aún no has publicado contenido. ¡Comparte tus conocimientos con la comunidad!
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            {canPublishArticles && (
              <Link to="/articles/create" className="btn btn-primary">Crear Artículo</Link>
            )}
            {canPublish && (
              <Link to="/blog/create" className="btn btn-outline">Crear Post</Link>
            )}
            {!canPublish && !canPublishArticles && (
              <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)' }}>
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
