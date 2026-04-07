import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, MessageCircle, Share2, MoreVertical, Clock, User, UserPlus, UserCheck, FileText, Bookmark } from 'lucide-react';
import ReactionButtons from '../components/ReactionButtons';
import CommentSection from '../components/CommentSection';
import CreatePostCard from '../components/CreatePostCard';
import ProfileSidebar from '../components/ProfileSidebar';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import ShareModal from '../components/ShareModal';
import AdvancedSearch from '../components/AdvancedSearch';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';

import { BACKEND_URL } from '../config/client';

const Blog = () => {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState({});
  const [showShareModal, setShowShareModal] = useState(null);
  const [filters, setFilters] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [following, setFollowing] = useState({});
  const [savedPosts, setSavedPosts] = useState({});
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  useEffect(() => {
    // Check follow status for all authors
    if (isAuthenticated() && posts.length > 0) {
      checkFollowStatuses();
    }
  }, [posts, isAuthenticated]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.query) params.append('search', filters.query);
      if (filters.category) params.append('category', filters.category);
      if (filters.author) params.append('author', filters.author);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`${BACKEND_URL}/api/blog?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        if (data.posts) {
          setPosts(data.posts);
          // Initialize reactions state
          const initialReactions = {};
          data.posts.forEach(post => {
            initialReactions[post.id] = post.reactions || {};
          });
          setReactions(initialReactions);
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchFilters) => {
    setFilters(searchFilters);
  };

  const checkFollowStatuses = async (authorId) => {
    if (!isAuthenticated() || !user) return;

    try {
      if (authorId) {
        // Toggle follow
        const isFollowing = following[authorId];
        const method = isFollowing ? 'DELETE' : 'POST';
        const response = await fetch(`${BACKEND_URL}/api/users/${authorId}/follow`, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (response.ok) {
          setFollowing(prev => ({
            ...prev,
            [authorId]: !isFollowing
          }));
        }
      } else {
        // Initial check for all authors in view
        // This is a simplified version; ideally we'd batch check or check on load
        // For now let's just assume false or fetch individual status if needed
        // To be properly implemented with a batch endpoint or individual checks
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleReaction = async (postId, type) => {
    if (!isAuthenticated()) {
      // Redirect to login or show auth modal
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/blog/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ type })
      });

      const data = await response.json();
      if (data.ok) {
        setReactions(prev => ({
          ...prev,
          [postId]: data.reactions
        }));
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleSavePost = (postId) => {
    setSavedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const toggleOptionsMenu = (postId, e) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === postId ? null : postId);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <PremiumPageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Profile */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <ProfileSidebar />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-2xl">
            {/* Create Post Card */}
            {isAuthenticated() && (
              <div className="mb-6">
                <CreatePostCard onPostCreated={fetchPosts} />
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6">
              <AdvancedSearch onSearch={handleSearch} type="blog" />
            </div>

            {/* Posts Feed */}
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-lg">No posts found</p>
                <button
                  onClick={() => setFilters({})}
                  className="mt-4 text-blue-400 hover:text-blue-300 font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <div key={post.id} className="group relative bg-[#0A0A0B]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all duration-300">

                    {/* Post Header */}
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Link to={`/profile/${post.author?.id}`} className="block relative">
                          {post.author?.avatar ? (
                            <img
                              src={post.author.avatar}
                              alt={post.author.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/5 group-hover:ring-white/20 transition-all"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/5">
                              {post.author?.name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </Link>
                        <div>
                          <Link to={`/profile/${post.author?.id}`} className="flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                            <h3 className="font-bold text-gray-200 text-sm">
                              {post.author?.name || 'Unknown Author'}
                            </h3>
                            {post.author?.role === 'admin' && (
                              <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{post.author?.headline || 'Member'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(post.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 relative">
                        {isAuthenticated() && post.author?.id !== user?.id && (
                          <button
                            onClick={() => checkFollowStatuses(post.author?.id)}
                            className={`text-sm font-medium transition-colors mr-2 ${following[post.author?.id]
                              ? 'text-gray-500 hover:text-red-400'
                              : 'text-blue-500 hover:text-blue-400'
                              }`}
                          >
                            {following[post.author?.id] ? 'Unfollow' : 'Follow'}
                          </button>
                        )}
                        <button
                          onClick={(e) => toggleOptionsMenu(post.id, e)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === post.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 bg-[#1A1A1D] border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <button className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                              <Share2 className="w-4 h-4" /> Share Post
                            </button>
                            <button className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2">
                              <Bookmark className="w-4 h-4" /> Save Post
                            </button>
                            <div className="h-px bg-white/5 my-1"></div>
                            <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                              Report Post
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="p-4">
                      {post.title && (
                        <h2 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors leading-tight">
                          {post.title}
                        </h2>
                      )}

                      {/* Text Content */}
                      <div
                        className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-3 prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                      />

                      {/* Media Grid */}
                      {(post.mediaUrls?.length > 0 || post.imageUrl || post.videoUrl || post.coverUrl) && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-white/5 bg-black/40">
                          {post.videoUrl ? (
                            <video
                              src={post.videoUrl}
                              controls
                              className="w-full aspect-video object-cover"
                            />
                          ) : (
                            <img
                              src={post.imageUrl || post.coverUrl || post.mediaUrls?.[0]}
                              alt="Post media"
                              className="w-full h-full object-cover max-h-[400px]"
                            />
                          )}
                        </div>
                      )}

                      {/* Documents */}
                      {post.documents?.length > 0 && (
                        <div className="mb-4 space-y-2">
                          {post.documents.map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group/doc"
                            >
                              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg group-hover/doc:scale-110 transition-transform">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <h4 className="text-sm font-medium text-gray-200 truncate">{doc.name || 'Documento adjunto'}</h4>
                                <p className="text-xs text-gray-500">PDF • 2.4 MB</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {post.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 text-xs font-medium text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
                              onClick={() => setFilters({ ...filters, query: tag })}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Post Footer - Stats & Actions */}
                    <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                      <ReactionButtons
                        postId={post.id}
                        reactions={reactions[post.id] || post.reactions || {}}
                        onReaction={(type) => handleReaction(post.id, type)}
                      />

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                          className={`flex items-center gap-2 text-sm transition-colors group/btn ${expandedComments[post.id] ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'
                            }`}
                        >
                          <MessageCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          <span>{post._count?.comments || 0}</span>
                        </button>
                        <button
                          onClick={() => setShowShareModal(post)}
                          className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-400 transition-colors group/btn"
                        >
                          <Share2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleSavePost(post.id)}
                          className={`flex items-center gap-2 text-sm transition-colors group/btn ${savedPosts[post.id] ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'
                            }`}
                        >
                          <Bookmark className={`w-4 h-4 group-hover/btn:scale-110 transition-transform ${savedPosts[post.id] ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {expandedComments[post.id] && (
                      <div className="border-t border-white/5 bg-black/20 p-4">
                        <CommentSection postId={post.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="hidden xl:block w-80 flex-shrink-0">
          </div>
        </div>
      </div>

      {showShareModal && (
        <ShareModal
          post={showShareModal}
          onClose={() => setShowShareModal(null)}
        />
      )}
    </PremiumPageLayout>
  );
};

export default Blog;
