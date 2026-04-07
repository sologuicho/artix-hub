import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, User, Heart, MessageCircle, Share2, BookOpen, ArrowLeft, Copy, Check, UserPlus, UserCheck, Download, Eye, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import CollaborationInvitation from '../components/CollaborationInvitation';
import CommentSection from '../components/CommentSection';
import ContentActions from '../components/ContentActions';
import ReadingMode from '../components/ReadingMode';
import ScrollToTop from '../components/ScrollToTop';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import { generatePDF } from '../utils/pdfGenerator';
import PaginatedReader from '../components/reader/PaginatedReader';
import { motion } from 'framer-motion';
import PricingModal from '../components/PricingModal';

import { BACKEND_URL } from '../config/client';

const ActionButton = ({ onClick, icon: Icon, label, active, count, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300
      backdrop-blur-md border border-white/10
      ${active
        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
    {label && <span>{label}</span>}
    {count !== undefined && <span className="text-sm opacity-60 ml-1">{count}</span>}
  </button>
);

const ArticleView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [readingProgress, setReadingProgress] = useState(null);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  useEffect(() => {
    if (user && article) {
      checkFollowStatus();
      fetchReadingProgress();
    }
  }, [user, article]);

  const fetchReadingProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/reading-progress?articleId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data) {
        setReadingProgress(data);
      }
    } catch (error) {
      console.error('Error fetching reading progress:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !article?.author?.id || user.id === article.author.id) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/follow/${article.author.id}/check`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) setFollowing(data.following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const response = await fetch(`${BACKEND_URL}/api/follow/${article.author.id}`, {
        method: 'POST',
        headers: {
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.ok) {
        setFollowing(data.following);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const [limitReached, setLimitReached] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  const fetchArticle = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/articles/${id}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (response.status === 403 && data.error === 'limit_reached') {
        setLimitReached(true);
        // Do not set article data if limit reached (or maybe backend doesn't send it)
        return;
      }

      if (data.ok) {
        setArticle(data.article);
        setLikesCount(data.article.likesCount || 0);
      } else {
        // Handle other errors?
      }
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await generatePDF({
        title: article.title,
        content: article.content,
        author: article.author?.name || 'Autor desconocido',
        date: article.createdAt,
        description: article.description,
        tags: article.tags || []
      }, 'article');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al generar el PDF. Por favor, intenta de nuevo.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030303]">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (limitReached) {
    return (
      <PremiumPageLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 border border-yellow-500/20">
            <div className="w-10 h-10 border-2 border-yellow-500 rounded-full flex items-center justify-center">
              <span className="font-bold text-yellow-500">!</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Daily Limit Reached</h2>
          <p className="text-gray-400 max-w-md mb-8">
            You've hit your daily reading limit on the Observer plan. Upgrade to unlock unlimited access to world-class research and articles.
          </p>
          <button
            onClick={() => setShowPricing(true)}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:scale-105"
          >
            Upgrade Membership
          </button>
          <button onClick={() => navigate('/articles')} className="mt-4 text-sm text-gray-500 hover:text-white transition-colors">
            Back to Articles
          </button>
        </div>
        <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
      </PremiumPageLayout>
    );
  }

  if (!article) {
    return (
      <PremiumPageLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-white mb-4">Artículo no encontrado</h2>
          <button onClick={() => navigate('/articles')} className="glass-button-premium">
            Volver a Artículos
          </button>
        </div>
      </PremiumPageLayout>
    );
  }

  return (
    <PremiumPageLayout>
      {/* Back Navigation */}
      <button
        onClick={() => navigate('/articles')}
        className="group flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium">Volver a Artículos</span>
      </button>

      {/* Collaboration Status */}
      <CollaborationInvitation type="article" itemId={id} onUpdate={fetchArticle} />

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
        <article className="space-y-8">
          {/* Header */}
          <header className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {article.category}
              </span>
              {article.tags?.map((tag, i) => (
                <span key={i} className="text-xs text-gray-500">#{tag}</span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              {article.title}
            </h1>

            <div className="flex items-center justify-between py-6 border-b border-white/5">
              <Link to={`/profile/${article.author?.id}`} className="flex items-center gap-4 group">
                {article.author?.avatar ? (
                  <img src={article.author.avatar} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-black border border-white/10" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="text-white font-medium group-hover:text-blue-400 transition-colors">
                    {article.author?.name || 'Anonymous'}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>{formatDate(article.createdAt)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.ceil((article.content?.length || 0) / 1000)} min de lectura
                    </span>
                  </div>
                </div>
              </Link>

              {/* Follow / Actions */}
              <div className="flex items-center gap-3">
                {user && article.author?.id && user.id !== article.author.id && (
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${following
                      ? 'bg-white/5 text-gray-400 border border-white/5'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                  >
                    {following ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
                {user && (
                  <ContentActions
                    type="article"
                    itemId={article.id}
                    authorId={article.authorId || article.author?.id}
                    author={article.author}
                    onDelete={() => navigate('/articles')}
                  />
                )}
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {article.coverUrl && (
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-white/5">
              <img
                src={article.coverUrl}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* New Advanced Reader */}
          <div className="my-8">
            <PaginatedReader
              content={article.content}
              title={article.title}
              contentId={article.id}
              contentType="article"
              initialProgress={readingProgress}
            />
          </div>

          {/* Tags Footer */}
          {article.tags && article.tags.length > 0 && (
            <div className="pt-8 border-t border-white/5">
              <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Temas Relacionados</h4>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors cursor-default">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {showComments && (
            <div id="comments-section" className="pt-12 border-t border-white/5">
              <h3 className="text-2xl font-bold text-white mb-8">Discusión</h3>
              <CommentSection articleId={article.id} />
            </div>
          )}
        </article>

        {/* Sidebar Actions (Sticky) */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-4">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm space-y-4">
              <h4 className="font-semibold text-white">Acciones</h4>

              <div className="grid gap-3">
                <ActionButton
                  onClick={handleLike}
                  icon={Heart}
                  active={liked}
                  count={likesCount}
                  label="Me gusta"
                />
                <ActionButton
                  onClick={() => {
                    setShowComments(!showComments);
                    if (!showComments) {
                      setTimeout(() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }
                  }}
                  icon={MessageCircle}
                  count={article.comments?.length || 0}
                  label="Comentar"
                />
                <ActionButton
                  onClick={() => setShowShareModal(true)}
                  icon={Share2}
                  label="Compartir"
                />
                <ActionButton
                  onClick={handleCopyLink}
                  icon={copied ? Check : Copy}
                  label={copied ? 'Copiado' : 'Copiar Link'}
                  active={copied}
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm space-y-4">
              <h4 className="font-semibold text-white">Herramientas</h4>
              <div className="grid gap-3">
                {/* Legacy Reading Mode - kept but maybe less emphasized now */}
                <ActionButton
                  onClick={() => setReadingMode(true)}
                  icon={BookOpen}
                  label="Modo Lectura Full"
                />
                <ActionButton
                  onClick={handleDownloadPDF}
                  icon={Download}
                  label={downloadingPDF ? 'Generando...' : 'Descargar PDF'}
                  disabled={downloadingPDF}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Floating Actions */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:hidden z-40 flex items-center gap-2 p-2 rounded-full bg-[#111]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
        <button onClick={handleLike} className="p-3 text-white hover:bg-white/10 rounded-full">
          <Heart className={`w-5 h-5 ${liked ? 'fill-blue-500 text-blue-500' : ''}`} />
        </button>
        <button onClick={() => setShowComments(!showComments)} className="p-3 text-white hover:bg-white/10 rounded-full">
          <MessageCircle className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-white/10" />
        <button onClick={() => setReadingMode(true)} className="p-3 text-white hover:bg-white/10 rounded-full">
          <BookOpen className="w-5 h-5" />
        </button>
        <button onClick={() => setShowShareModal(true)} className="p-3 text-white hover:bg-white/10 rounded-full">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Modals */}
      {showShareModal && (
        <ShareModal
          url={window.location.href}
          title={article.title}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <ReadingMode
        isOpen={readingMode}
        onClose={() => setReadingMode(false)}
        title={article.title}
        author={article.author?.name}
        date={article.createdAt}
      >
        <div className="prose prose-xl prose-invert max-w-3xl mx-auto">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>
      </ReadingMode>

      <div className="lg:hidden">
        <ScrollToTop showAfter={300} />
      </div>

    </PremiumPageLayout>
  );
};

export default ArticleView;
