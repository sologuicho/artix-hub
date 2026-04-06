import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Calendar, User, ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import PremiumCard from '../components/ui/PremiumCard';
import GlassSearchBar from '../components/ui/GlassSearchBar';
import { GLOBAL_CATEGORIES } from '../constants/categories';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';


const Articles = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchArticles();
  }, [filters, activeCategory]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.query) params.append('search', filters.query);
      if (activeCategory !== 'all') params.append('category', activeCategory);

      const response = await fetch(`${BACKEND_URL}/api/articles?${params.toString()}`);
      const data = await response.json();
      if (data.ok) {
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchFilters) => setFilters(prev => ({ ...prev, ...searchFilters }));

  // Separate featured content
  const featuredArticle = articles.length > 0 ? articles[0] : null;
  const standardArticles = articles.length > 0 ? articles.slice(1) : [];

  return (
    <PremiumPageLayout
      title={t('articles.title')}
      subtitle="Explore the frontier of human knowledge through curated research and insights."
    >
      {/* Controls Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-16 relative z-20">
        <div className="w-full lg:max-w-2xl">
          <GlassSearchBar
            onSearch={handleSearch}
            placeholder="Search articles, topics, or authors..."
            categories={GLOBAL_CATEGORIES}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {isAuthenticated() && (
          <button
            onClick={() => navigate('/articles/create')}
            className="group relative px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transition-all hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t('articles.create')}
            </span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-40">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-16">

          {/* Featured Article Section */}
          {featuredArticle && activeCategory === 'all' && !filters.query && (
            <div
              onClick={() => navigate(`/articles/${featuredArticle.id}`)}
              className="relative rounded-3xl overflow-hidden cursor-pointer group border border-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
              <div className="h-[500px] w-full relative">
                {featuredArticle.coverUrl ? (
                  <img
                    src={featuredArticle.coverUrl}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-black" />
                )}
              </div>

              <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-20">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-md">
                    FEATURED
                  </span>
                  <span className="text-gray-300 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    Curated Selection
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 max-w-4xl leading-tight group-hover:text-blue-200 transition-colors">
                  {featuredArticle.title}
                </h2>
                <div className="flex items-center gap-6 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    {featuredArticle.author?.avatar ? (
                      <img src={featuredArticle.author.avatar} className="w-8 h-8 rounded-full border border-white/20" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <span className="font-medium">{featuredArticle.author?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{featuredArticle.readTime || 5} min read</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standard Grid */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-500 rounded-full" />
                Latest Articles
              </h3>
              <button className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                View Archive <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(activeCategory === 'all' && !filters.query ? standardArticles : articles).map((article, index) => (
                <PremiumCard
                  key={article.id}
                  title={article.title}
                  description={article.description}
                  imageUrl={article.coverUrl}
                  category={article.category}
                  author={article.author}
                  date={new Date(article.createdAt).toLocaleDateString()}
                  stats={[
                    { icon: Clock, value: `${article.readTime || 5} min`, label: 'Lecture Time' }
                  ]}
                  onClick={() => navigate(`/articles/${article.id}`)}
                  delay={index * 0.05}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </PremiumPageLayout>
  );
};

export default Articles;
