import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, User, Heart, MessageCircle, Share2, BookOpen, ArrowLeft, Copy, Check, UserPlus, UserCheck, Download, Eye, Clock, FileText, FlaskConical, Link as LinkIcon, DownloadCloud, Sparkles } from 'lucide-react';
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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const ActionButton = ({ onClick, icon: Icon, label, active, count, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300
      backdrop-blur-md border border-white/10
      ${active
        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
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

const ResearchView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [research, setResearch] = useState(null);
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
    fetchResearch();
  }, [id]);

  useEffect(() => {
    if (user && research?.author?.id) {
      checkFollowStatus();
      fetchReadingProgress();
    }
  }, [user, research?.author?.id]);

  const fetchReadingProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/reading-progress?researchId=${id}`, {
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
    if (!user || !research?.author?.id || user.id === research.author.id) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/follow/${research.author.id}/check`, {
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

      const response = await fetch(`${BACKEND_URL}/api/follow/${research.author.id}`, {
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

  const fetchResearch = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/research/${id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setResearch(data.research);
        setLikesCount(data.research.likesCount || 0);
      }
    } catch (error) {
      console.error('Error fetching research:', error);
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
        title: research.title,
        content: research.content,
        author: research.author?.name || 'Researcher',
        date: research.createdAt,
        description: research.abstract || research.description,
        tags: research.tags || []
      }, 'research');
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
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!research) {
    return (
      <PremiumPageLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-white mb-4">Investigación no encontrada</h2>
          <button onClick={() => navigate('/research')} className="glass-button-premium">
            Volver a Investigaciones
          </button>
        </div>
      </PremiumPageLayout>
    );
  }

  return (
    <PremiumPageLayout>
      {/* Back Navigation */}
      <button
        onClick={() => navigate('/research')}
        className="group flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium">Volver a Investigaciones</span>
      </button>

      {/* Collaboration Status */}
      <CollaborationInvitation type="research" itemId={id} onUpdate={fetchResearch} />

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
        <article className="space-y-8">
          {/* Header */}
          <header className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {research.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {research.status}
              </span>
              {research.tags?.map((tag, i) => (
                <span key={i} className="text-xs text-gray-500">#{tag}</span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              {research.title}
            </h1>

            <div className="flex items-center justify-between py-6 border-b border-white/5">
              <Link to={`/profile/${research.author?.id}`} className="flex items-center gap-4 group">
                {research.author?.avatar ? (
                  <img src={research.author.avatar} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-black border border-white/10" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                    {research.author?.name || 'Anonymous'}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>{formatDate(research.createdAt)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.ceil((research.content?.length || 0) / 1000)} min de lectura
                    </span>
                  </div>
                </div>
              </Link>

              {/* Follow / Actions */}
              <div className="flex items-center gap-3">
                {user && research.author?.id && user.id !== research.author.id && (
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${following
                      ? 'bg-white/5 text-gray-400 border border-white/5'
                      : 'bg-purple-600 text-white hover:bg-purple-500'
                      }`}
                  >
                    {following ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
                {user && (
                  <ContentActions
                    type="research"
                    itemId={research.id}
                    authorId={research.authorId || research.author?.id}
                    author={research.author}
                    onDelete={() => navigate('/research')}
                  />
                )}
              </div>
            </div>
          </header>

          {/* Abstract / Summary Box */}
          {research.abstract && (
            <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Abstract
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {research.abstract}
              </p>
            </div>
          )}

          {/* Featured Image */}
          {research.coverUrl && (
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-white/5">
              <img
                src={research.coverUrl}
                alt={research.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* New Advanced Reader */}
          <div className="my-8">
            <PaginatedReader
              content={research.content}
              title={research.title}
              contentId={research.id}
              contentType="research"
              initialProgress={readingProgress}
            />
          </div>

          {/* Attachments / References (Placeholder if we had them) */}

          {/* Comments */}
          {showComments && (
            <div id="comments-section" className="pt-12 border-t border-white/5">
              <h3 className="text-2xl font-bold text-white mb-8">Discusión Académica</h3>
              <CommentSection articleId={research.id} />
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
                  label="Recomendar"
                />
                <ActionButton
                  onClick={() => {
                    setShowComments(!showComments);
                    if (!showComments) {
                      setTimeout(() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                    }
                  }}
                  icon={MessageCircle}
                  count={research.comments?.length || 0}
                  label="Debatir"
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
                <ActionButton
                  onClick={() => setReadingMode(true)}
                  icon={BookOpen}
                  label="Modo Lectura Full"
                />
                <ActionButton
                  onClick={handleDownloadPDF}
                  icon={Download}
                  label={downloadingPDF ? 'Generando PDF...' : 'Descargar PDF'}
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
          <Heart className={`w-5 h-5 ${liked ? 'fill-purple-500 text-purple-500' : ''}`} />
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
          title={research.title}
          onClose={() => setShowShareModal(false)}
        />
      )}

      <ReadingMode
        isOpen={readingMode}
        onClose={() => setReadingMode(false)}
        title={research.title}
        author={research.author?.name}
        date={research.createdAt}
      >
        <div className="prose prose-xl prose-invert max-w-3xl mx-auto">
          <div dangerouslySetInnerHTML={{ __html: research.content }} />
        </div>
      </ReadingMode>

      <div className="lg:hidden">
        <ScrollToTop showAfter={300} />
      </div>

    </PremiumPageLayout>
  );
};

export default ResearchView;
