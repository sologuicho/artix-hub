import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Clock, User, Bookmark, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import ContentActions from '../components/ContentActions';
import ShareModal from '../components/ShareModal';
import ScrollToTop from '../components/ScrollToTop';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import { motion } from 'framer-motion';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    const [name, value] = c.trim().split('=');
    if (name === 'csrf') return value;
  }
  return null;
};

const BlogPostView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  useEffect(() => {
    if (user && post) {
      checkFollowStatus();
      checkReactionStatus();
      checkSavedStatus();
    }
  }, [user, post]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/blog/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setPost(data.post);
        setLikesCount(data.post.likesCount || 0);
      } else {
        setError('Post no encontrado');
      }
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Error al cargar el post');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!post?.author?.id || user?.id === post.author.id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${post.author.id}/check`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setFollowing(data.following);
    } catch (_) {}
  };

  const checkReactionStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions/post/${id}/check`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setLiked(data.reacted);
    } catch (_) {}
  };

  const checkSavedStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/saved/check?postId=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setSaved(data.saved);
    } catch (_) {}
  };

  const handleLike = async () => {
    if (!user) return navigate('/auth');
    try {
      const res = await fetch(`${BACKEND_URL}/api/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ postId: id, type: 'like' })
      });
      const data = await res.json();
      if (data.ok) {
        setLiked(prev => !prev);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleSave = async () => {
    if (!user) return navigate('/auth');
    try {
      const method = saved ? 'DELETE' : 'POST';
      const res = await fetch(`${BACKEND_URL}/api/saved`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ postId: id })
      });
      const data = await res.json();
      if (data.ok) setSaved(prev => !prev);
    } catch (err) {
      console.error('Error saving post:', err);
    }
  };

  const handleFollow = async () => {
    if (!user) return navigate('/auth');
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${post.author.id}`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) setFollowing(data.following);
    } catch (_) {}
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  const readTime = (content) => Math.max(1, Math.ceil((content?.length || 0) / 1200));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030303]">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <PremiumPageLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-white mb-4">{error || 'Post no encontrado'}</h2>
          <button onClick={() => navigate('/blog')} className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">
            Volver al Blog
          </button>
        </div>
      </PremiumPageLayout>
    );
  }

  return (
    <PremiumPageLayout>
      {/* Back Nav */}
      <button
        onClick={() => navigate('/blog')}
        className="group flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium">Volver al Blog</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12 max-w-5xl mx-auto">
        {/* Main article */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Cover Image */}
          {post.coverUrl && (
            <div className="rounded-2xl overflow-hidden border border-white/5 aspect-video">
              <img src={post.coverUrl} alt={post.title || 'Blog cover'} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Header */}
          <header className="space-y-5">
            {post.category && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {post.category}
              </span>
            )}

            {post.title && (
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{post.title}</h1>
            )}

            {/* Author row */}
            <div className="flex items-center justify-between py-5 border-b border-white/5">
              <Link to={`/profile/${post.author?.id}`} className="flex items-center gap-3 group">
                {post.author?.avatar ? (
                  <img src={post.author.avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-black border border-white/10" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                    {post.author?.name || 'Anónimo'}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{formatDate(post.createdAt)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {readTime(post.content)} min de lectura
                    </span>
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                {user && post.author?.id && user.id !== post.author.id && (
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      following ? 'bg-white/5 text-gray-400 border border-white/10' : 'bg-purple-600 text-white hover:bg-purple-500'
                    }`}
                  >
                    {following ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
                {user && (
                  <ContentActions
                    type="blog"
                    itemId={post.id}
                    authorId={post.authorId || post.author?.id}
                    author={post.author}
                    onDelete={() => navigate('/blog')}
                  />
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <div
            className="prose prose-invert prose-lg max-w-none
              prose-headings:font-bold prose-headings:text-white
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline
              prose-code:bg-white/5 prose-code:rounded prose-code:px-1
              prose-blockquote:border-l-purple-500 prose-blockquote:text-gray-400
              prose-img:rounded-xl prose-img:border prose-img:border-white/10"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Video embed */}
          {post.videoUrl && (
            <div className="rounded-xl overflow-hidden border border-white/5 aspect-video">
              <iframe src={post.videoUrl} className="w-full h-full" allowFullScreen title="Video" />
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="pt-6 border-t border-white/5 flex flex-wrap gap-2">
              {post.tags.map((tag, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Comments */}
          {showComments && (
            <div id="blog-comments" className="pt-10 border-t border-white/5">
              <h3 className="text-xl font-bold text-white mb-6">Comentarios</h3>
              <CommentSection postId={post.id} />
            </div>
          )}
        </motion.article>

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm space-y-3">
              <h4 className="font-semibold text-white text-sm">Acciones</h4>

              <button
                onClick={handleLike}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                  liked ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 border-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                <span>Me gusta</span>
                {likesCount > 0 && <span className="ml-auto text-xs opacity-60">{likesCount}</span>}
              </button>

              <button
                onClick={() => { setShowComments(!showComments); setTimeout(() => document.getElementById('blog-comments')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Comentar</span>
              </button>

              <button
                onClick={handleSave}
                className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                  saved ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 border-white/10'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                <span>{saved ? 'Guardado' : 'Guardar'}</span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile actions bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:hidden z-40 flex items-center gap-1 p-2 rounded-full bg-[#111]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
        <button onClick={handleLike} className="p-3 text-white hover:bg-white/10 rounded-full">
          <Heart className={`w-5 h-5 ${liked ? 'fill-red-400 text-red-400' : ''}`} />
        </button>
        <button onClick={() => setShowComments(!showComments)} className="p-3 text-white hover:bg-white/10 rounded-full">
          <MessageCircle className="w-5 h-5" />
        </button>
        <button onClick={handleSave} className="p-3 text-white hover:bg-white/10 rounded-full">
          <Bookmark className={`w-5 h-5 ${saved ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </button>
        <button onClick={() => setShowShareModal(true)} className="p-3 text-white hover:bg-white/10 rounded-full">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {showShareModal && (
        <ShareModal url={window.location.href} title={post.title || 'Blog Post'} onClose={() => setShowShareModal(false)} />
      )}

      <ScrollToTop showAfter={300} />
    </PremiumPageLayout>
  );
};

export default BlogPostView;
