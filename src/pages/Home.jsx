import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroVideo from '../components/HeroVideo';
import ArticleCard from '../components/ArticleCard';
import { useLanguage } from '../context/LanguageContext';
import { Sparkles, ArrowRight, TrendingUp, Zap } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const articles = [
  {
    id: 1,
    title: 'Advanced Quantum Computing Algorithms',
    category: 'Quantum Physics',
    author: 'Dr. Sarah Chen',
    description: 'Exploring the latest breakthroughs in quantum algorithm development and their practical applications in modern computing systems.',
    date: 'Jan 15, 2024',
    tags: ['quantum', 'computing', 'algorithms'],
  },
  {
    id: 2,
    title: 'Machine Learning in Drug Discovery',
    category: 'AI Research',
    author: 'Prof. Michael Zhang',
    description: 'How artificial intelligence is revolutionizing the pharmaceutical industry and accelerating drug development processes.',
    date: 'Jan 12, 2024',
    tags: ['machine-learning', 'pharmaceuticals', 'ai'],
  },
  {
    id: 3,
    title: 'Climate Change Modeling with Supercomputers',
    category: 'Environmental Science',
    author: 'Dr. Emily Rodriguez',
    description: 'Using high-performance computing to predict climate patterns and develop strategies for environmental conservation.',
    date: 'Jan 10, 2024',
    tags: ['climate', 'supercomputing', 'environment'],
  },
  {
    id: 4,
    title: 'Neural Networks for Image Recognition',
    category: 'AI Research',
    author: 'Dr. James Wilson',
    description: 'Deep learning techniques that are transforming computer vision and image processing capabilities.',
    date: 'Jan 8, 2024',
    tags: ['neural-networks', 'computer-vision', 'deep-learning'],
  },
  {
    id: 5,
    title: 'Quantum Entanglement in Communication',
    category: 'Quantum Physics',
    author: 'Dr. Lisa Anderson',
    description: 'The future of secure communication through quantum entanglement and its implications for cybersecurity.',
    date: 'Jan 5, 2024',
    tags: ['quantum', 'communication', 'security'],
  },
  {
    id: 6,
    title: 'Biotechnology Breakthroughs in 2024',
    category: 'Biology',
    author: 'Dr. Robert Kim',
    description: 'Recent advances in genetic engineering and biotechnology that are shaping the future of medicine.',
    date: 'Jan 3, 2024',
    tags: ['biotechnology', 'genetics', 'medicine'],
  },
];

import PricingSection from '../components/PricingSection';

const Home = ({ searchQuery = '' }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const articlesSectionRef = useRef(null);
  const [articlesVisible, setArticlesVisible] = useState(false);
  const [realArticles, setRealArticles] = useState([]);
  const [realPosts, setRealPosts] = useState([]);
  const [realEvents, setRealEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      // Fetch published articles
      const articlesRes = await fetch(`${BACKEND_URL}/api/articles?status=published&limit=6`, {
        credentials: 'include'
      });
      const articlesData = await articlesRes.json();
      if (articlesData.ok) {
        setRealArticles(articlesData.articles || []);
      }

      // Fetch recent posts
      const postsRes = await fetch(`${BACKEND_URL}/api/blog?limit=6`, {
        credentials: 'include'
      });
      const postsData = await postsRes.json();
      if (postsData.ok) {
        setRealPosts(postsData.posts || []);
      }

      // Fetch upcoming events
      const eventsRes = await fetch(`${BACKEND_URL}/api/events?upcoming=true&limit=6`, {
        credentials: 'include'
      });
      const eventsData = await eventsRes.json();
      if (eventsData.ok) {
        setRealEvents(eventsData.events || []);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (scrollPosition) => {
    setScrollY(scrollPosition);

    // Mostrar artículos cuando el scroll pasa cierto punto
    if (articlesSectionRef.current) {
      const sectionTop = articlesSectionRef.current.offsetTop;
      const windowHeight = window.innerHeight;

      if (scrollPosition + windowHeight > sectionTop - 200) {
        setArticlesVisible(true);
      }
    }
  };

  const filteredArticles = useMemo(() => {
    const articlesToFilter = realArticles.length > 0 ? realArticles : articles;
    if (!searchQuery.trim()) {
      return articlesToFilter;
    }

    const query = searchQuery.toLowerCase();
    return articlesToFilter.filter((article) => {
      return (
        article.title?.toLowerCase().includes(query) ||
        article.category?.toLowerCase().includes(query) ||
        article.author?.name?.toLowerCase().includes(query) ||
        article.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, realArticles]);

  return (
    <div className="relative bg-black min-h-screen">
      {/* Hero Section con Video */}
      <HeroVideo onScroll={handleScroll} />

      {/* Sección de Artículos - Aparece después del scroll */}
      <section
        ref={articlesSectionRef}
        className={`relative py-24 transition-all duration-1000 ${articlesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
      >
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-blue-400 mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              <span>Descubre lo último</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 mb-6 tracking-tight">
              {t('home.articles.title')}
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              {t('home.articles.subtitle')}
            </p>
          </div>

          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => navigate(`/articles/${article.id}`)}
                  className="transform transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <ArticleCard article={article} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 glass-card rounded-3xl">
              <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg">
                No articles found matching your search.
              </p>
            </div>
          )}

          {/* View All Button */}
          <div className="mt-16 text-center">
            <button
              onClick={() => navigate('/articles')}
              className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
            >
              Explorar Todo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

    </div>
  );
};

export default Home;
