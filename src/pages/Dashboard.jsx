import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Calendar, BookOpen, ArrowRight, TrendingUp, Users, Clock, Building2, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

import { BACKEND_URL } from '../config/client';

const Dashboard = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Verificar si el usuario es admin cuando se carga
  useEffect(() => {
    if (user) {
      // Solo el correo específico tiene acceso al panel de research
      const admin = user.email === 'floresescobedoluisalberto@gmail.com';
      setIsAdmin(admin);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const [stats, setStats] = useState({
    articles: 0,
    posts: 0,
    events: 0
  });
  const [recentArticles, setRecentArticles] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [readingData, setReadingData] = useState({ continueReading: [], recommendations: [] });

  useEffect(() => {
    if (authLoading || !user) return;
    fetchDashboardData();
    fetchRecommendations();
  }, [user, authLoading]);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/reading-progress/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data) {
        setReadingData(data);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };

      const [statsRes, articlesRes, eventsRes, postsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/dashboard/stats`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/articles?limit=3`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/events?limit=2&upcoming=true`, { headers, credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/blog?limit=3`, { headers, credentials: 'include' })
      ]);

      const statsData = await statsRes.json();
      const articlesData = await articlesRes.json();
      const eventsData = await eventsRes.json();
      const postsData = await postsRes.json();

      if (statsData.ok) setStats(statsData.stats);
      if (statsData.drafts) setDrafts(statsData.drafts);
      if (articlesData.ok) setRecentArticles(articlesData.articles);
      if (eventsData.ok) setUpcomingEvents(eventsData.events);
      if (postsData.ok) setRecentPosts(postsData.posts);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const StatCard = ({ icon: Icon, label, value, color, description, delay = 0 }) => (
    <div
      className="glass-card p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
      style={{
        animation: `fadeInUp 0.6s ease-out ${delay}s both`
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{description}</p>
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
          <Icon className={`w-8 h-8 ${color.replace('text-', 'text-').replace('dark:', 'dark:')}`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 glass-card rounded-full">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Hero / Welcome Section */}
      <div className="relative animate-fade-in z-10">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative">
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 mb-4 tracking-tight">
            Bienvenido, <span className="text-blue-600 dark:text-blue-400">{user?.name?.split(' ')[0] || user?.username || 'Usuario'}</span>
          </h1>

          <div className="flex items-center gap-3">
            {user?.username && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                @{user.username}
              </span>
            )}
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Tu centro de control en Artix Hub
            </p>
          </div>
        </div>
      </div>

      {/* Continue Reading Section */}
      {readingData.continueReading?.length > 0 && (
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <BookOpen className="w-6 h-6 text-blue-500" />
              Continúa Leyendo
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readingData.continueReading.map((item, idx) => (
              <Link
                key={`${item.type}-${item.contentId}`}
                to={item.type === 'article' ? `/articles/${item.contentId}` : item.type === 'research' ? `/research/${item.contentId}` : `/blog/${item.contentId}`}
                className="group flex gap-4 p-4 glass-card hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all border border-transparent hover:border-blue-500/30"
              >
                <div className="w-20 h-24 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden relative">
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <FileText className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-500 transition-colors">
                      {item.title || 'Sin título'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 capitalize">{item.type}</p>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progreso</span>
                      <span>{Math.round(item.percentage)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommended for You */}
      {readingData.recommendations?.length > 0 && (
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
              <Sparkles className="w-6 h-6 text-purple-500" />
              Recomendado para ti
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {readingData.recommendations.map((item, idx) => (
              <Link
                key={item.id}
                to={`/articles/${item.id}`} // Assuming mainly articles for now, logic needed for mixed types if extended
                className="glass-card p-6 hover:translate-y-[-4px] transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">
                    {item.category}
                  </span>
                  <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User className="w-4 h-4" />
                  <span>{item.author?.name || 'Autor'}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Artix Research Panel - Solo para luisflores01 (filtrado por email) */}
      {isAdmin && (
        <section className="animate-fade-in relative group" style={{ animationDelay: '0.1s' }}>
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative glass-card-premium p-8 rounded-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-8">
                <div className="p-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-lg shadow-purple-500/20">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Panel Artix Research
                  </h2>
                  <p className="text-purple-200">
                    Herramientas exclusivas para creación de contenido oficial
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/articles/create?asArtixResearch=true')}
                  className="group/btn relative px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-white"
                >
                  <FileText className="w-5 h-5 text-blue-400 group-hover/btn:text-blue-300 transition-colors" />
                  <span className="font-medium">Crear Artículo</span>
                </button>
                <button
                  onClick={() => navigate('/research/create?asArtixResearch=true')}
                  className="group/btn relative px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-white"
                >
                  <Sparkles className="w-5 h-5 text-purple-400 group-hover/btn:text-purple-300 transition-colors" />
                  <span className="font-medium">Crear Investigación</span>
                </button>
                <button
                  onClick={() => navigate('/blog/create?asArtixResearch=true')}
                  className="group/btn relative px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-white"
                >
                  <BookOpen className="w-5 h-5 text-pink-400 group-hover/btn:text-pink-300 transition-colors" />
                  <span className="font-medium">Crear Post</span>
                </button>
                <button
                  onClick={() => navigate('/events/create?asArtixResearch=true')}
                  className="group/btn relative px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-white"
                >
                  <Calendar className="w-5 h-5 text-green-400 group-hover/btn:text-green-300 transition-colors" />
                  <span className="font-medium">Crear Evento</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <StatCard
          icon={FileText}
          label="Artículos"
          value={stats.articles}
          color="text-blue-500"
          description="Publicaciones académicas"
          delay={0}
        />
        <StatCard
          icon={BookOpen}
          label="Blog Posts"
          value={stats.posts}
          color="text-purple-500"
          description="Entradas de blog"
          delay={0.1}
        />
        <StatCard
          icon={Calendar}
          label="Eventos"
          value={stats.events}
          color="text-emerald-500"
          description="Eventos organizados"
          delay={0.2}
        />
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>

        {/* Recent Articles Column */}
        {recentArticles.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                <FileText className="w-6 h-6 text-blue-500" />
                Artículos Recientes
              </h2>
              <Link to="/articles" className="text-sm font-medium text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1">
                Ver todo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentArticles.slice(0, 3).map((article) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.id}`}
                  className="group flex items-start gap-4 p-4 glass-card hover:bg-white/10 transition-all border border-transparent hover:border-gray-700"
                >
                  <div className="w-16 h-16 rounded-xl bg-black/40 flex-shrink-0 overflow-hidden border border-white/5">
                    {article.coverUrl ? (
                      <img src={article.coverUrl} alt={article.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <FileText className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-100 truncate group-hover:text-blue-500 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {(article.description || article.content || '').replace(/<[^>]*>/g, '').trim()}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{formatDate(article.createdAt)}</span>
                      <span>•</span>
                      <span className="text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-500/20">
                        {article.category}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Blog Posts Column */}
        {recentPosts.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                <BookOpen className="w-6 h-6 text-purple-500" />
                Blog Reciente
              </h2>
              <Link to="/blog" className="text-sm font-medium text-gray-500 hover:text-purple-500 transition-colors flex items-center gap-1">
                Ver todo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentPosts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  to="/blog"
                  className="group flex items-start gap-4 p-4 glass-card hover:bg-white/10 transition-all border border-transparent hover:border-gray-700"
                >
                  <div className="w-16 h-16 rounded-xl bg-black/40 flex-shrink-0 overflow-hidden border border-white/5">
                    {post.coverUrl ? (
                      <img src={post.coverUrl} alt={post.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-100 truncate group-hover:text-purple-500 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {(post.content || '').replace(/<[^>]*>/g, '').trim()}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!loading && stats.articles === 0 && stats.posts === 0 && stats.events === 0 && (
        <div className="text-center py-20 animate-fade-in glass-card rounded-3xl border-dashed border-2 border-gray-800 m-4">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5">
              <Sparkles className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Tu viaje comienza aquí
            </h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Aún no has publicado contenido. ¡Comparte tus conocimientos con la comunidad de Artix Hub!
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/articles/create"
                className="glass-button flex items-center gap-2 text-white"
              >
                <FileText className="w-4 h-4" />
                Crear Artículo
              </Link>
              <Link
                to="/blog/create"
                className="glass-button-outline text-gray-300"
              >
                <BookOpen className="w-4 h-4 inline mr-2" />
                Crear Post
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>
    </div>
  );
};

export default Dashboard;
