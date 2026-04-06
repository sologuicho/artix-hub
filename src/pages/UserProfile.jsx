import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, MapPin, Briefcase, FileText, Users, UserPlus, UserCheck, BookOpen, Calendar, MessageSquare, Search, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import ProtectedRoute from '../components/ProtectedRoute';
import CommentSection from '../components/CommentSection';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const UserProfile = () => {
  const { userId } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    articles: 0,
    research: 0,
    events: 0,
    posts: 0,
    followers: 0,
    following: 0
  });
  const [content, setContent] = useState({
    articles: [],
    research: [],
    events: [],
    posts: []
  });
  const [contentLoaded, setContentLoaded] = useState(false);
  const [following, setFollowing] = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(true);
  const [expandedComments, setExpandedComments] = useState({});
  const [reactions, setReactions] = useState({});
  const [savedPosts, setSavedPosts] = useState({});

  useEffect(() => {
    if (userId) {
      fetchProfile();
      if (isAuthenticated()) {
        checkFollowStatus();
      } else {
        setCheckingFollow(false);
      }
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    if (profileUser) {
      fetchContent();
    }
  }, [profileUser, activeTab, searchQuery]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setProfileUser(data.user);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser || !userId || currentUser.id === userId) {
      setCheckingFollow(false);
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/follow/${userId}/check`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setFollowing(data.following || false);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setCheckingFollow(false);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated()) {
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

      const response = await fetch(`${BACKEND_URL}/api/follow/${userId}`, {
        method: 'POST',
        headers: {
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.ok) {
        setFollowing(data.following);
        setStats(prev => ({
          ...prev,
          followers: data.following ? prev.followers + 1 : prev.followers - 1
        }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const fetchContent = async () => {
    if (!profileUser) return;

    setContentLoaded(false);
    try {
      const baseParams = new URLSearchParams();
      if (searchQuery) baseParams.append('search', searchQuery);
      baseParams.append('limit', '100'); // Get more items for "all" tab

      if (activeTab === 'all') {
        // Fetch all content types in parallel with authorId filter
        const [articlesRes, researchRes, eventsRes, postsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/articles?authorId=${userId}&${baseParams.toString()}`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/research?author=${userId}&${baseParams.toString()}`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/events?creatorId=${userId}&${baseParams.toString()}`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/blog?authorId=${userId}&${baseParams.toString()}`, { credentials: 'include' })
        ]);

        const [articlesData, researchData, eventsData, postsData] = await Promise.all([
          articlesRes.json(),
          researchRes.json(),
          eventsRes.json(),
          postsRes.json()
        ]);

        // Process posts reactions
        const postItems = postsData.ok ? (postsData.posts || []) : [];
        const initialReactions = {};
        postItems.forEach(post => {
          initialReactions[post.id] = post.reactions || {};
        });
        setReactions(prev => ({ ...prev, ...initialReactions }));

        const newContent = {
          articles: articlesData.ok ? (articlesData.articles || []) : [],
          research: researchData.ok ? (researchData.research || []) : [],
          events: eventsData.ok ? (eventsData.events || []) : [],
          posts: postsData.ok ? (postsData.posts || []) : []
        };


        setContent(prev => ({
          ...prev,
          ...newContent
        }));
        setContentLoaded(true);
      } else {
        const params = new URLSearchParams(baseParams);
        let endpoint = '';
        if (activeTab === 'articles') {
          params.append('authorId', userId);
          endpoint = `${BACKEND_URL}/api/articles?${params.toString()}`;
        } else if (activeTab === 'research') {
          params.append('author', userId);
          endpoint = `${BACKEND_URL}/api/research?${params.toString()}`;
        } else if (activeTab === 'events') {
          params.append('creatorId', userId);
          endpoint = `${BACKEND_URL}/api/events?${params.toString()}`;
        } else if (activeTab === 'posts') {
          params.append('authorId', userId);
          endpoint = `${BACKEND_URL}/api/blog?${params.toString()}`;
        }

        if (endpoint) {
          const response = await fetch(endpoint, { credentials: 'include' });
          const data = await response.json();
          if (data.ok) {
            setContent(prev => ({
              ...prev,
              [activeTab]: activeTab === 'posts' ? (data.posts || []) : (data[activeTab] || [])
            }));

            if (activeTab === 'posts' && data.posts) {
              const initialReactions = {};
              data.posts.forEach(post => {
                initialReactions[post.id] = post.reactions || {};
              });
              setReactions(prev => ({ ...prev, ...initialReactions }));
            }
          }
          setContentLoaded(true);
        } else {
          setContentLoaded(true);
        }
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      setContentLoaded(true);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Usuario no encontrado</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === userId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="glass-card p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[2px] shadow-lg shadow-purple-500/20">
              <div className="w-full h-full rounded-full overflow-hidden bg-black ">
                {profileUser.avatar ? (
                  <img src={profileUser.avatar} alt={profileUser.name || profileUser.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold bg-gradient-to-br from-blue-600 to-purple-600">
                    {(profileUser.name || profileUser.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">
                {profileUser.name || profileUser.username || 'Usuario'}
              </h1>
              <p className="text-gray-400 mb-4">@{profileUser.username || 'usuario'}</p>

              {/* Stats */}
              <div className="flex items-center gap-6 flex-wrap">
                <Link
                  to={`/profile/${userId}/followers`}
                  className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                >
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="font-semibold text-white">{stats.followers}</span>
                  <span className="text-gray-500">seguidores</span>
                </Link>
                <Link
                  to={`/profile/${userId}/following`}
                  className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                >
                  <UserPlus className="w-5 h-5 text-gray-400" />
                  <span className="font-semibold text-white">{stats.following}</span>
                  <span className="text-gray-500">siguiendo</span>
                </Link>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-white">{stats.articles}</span>
                  <span className="text-gray-500">artículos</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-white">{stats.research}</span>
                  <span className="text-gray-500">investigaciones</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-white">{stats.events}</span>
                  <span className="text-gray-500">eventos</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-white">{stats.posts}</span>
                  <span className="text-gray-500">posts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isOwnProfile ? (
              <button
                onClick={() => navigate('/profile/settings')}
                className="glass-button flex items-center gap-2 text-white"
              >
                <Settings className="w-5 h-5" />
                Configuración
              </button>
            ) : (
              !checkingFollow && (
                <button
                  onClick={handleFollow}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${following
                    ? 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    }`}
                >
                  {following ? (
                    <>
                      <UserCheck className="w-5 h-5" />
                      Siguiendo
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Seguir
                    </>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* Bio and Info */}
        <div className="space-y-4">
          {profileUser.bio && (
            <p className="text-gray-300">{profileUser.bio}</p>
          )}
          <div className="flex items-center gap-6 flex-wrap">
            {profileUser.country && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">{profileUser.country}</span>
              </div>
            )}
            {profileUser.occupation && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">{profileUser.occupation}</span>
              </div>
            )}
          </div>
          {profileUser.interests && profileUser.interests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profileUser.interests.map((interest, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-900/30 text-blue-200 border border-blue-500/20 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Buscar en el perfil..."
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 overflow-x-auto">
        {[
          { id: 'all', label: 'Todos', count: stats.articles + stats.research + stats.events + stats.posts, icon: FileText },
          { id: 'articles', label: 'Artículos', count: stats.articles, icon: BookOpen },
          { id: 'research', label: 'Investigaciones', count: stats.research, icon: FileText },
          { id: 'events', label: 'Eventos', count: stats.events, icon: Calendar },
          { id: 'posts', label: 'Posts', count: stats.posts, icon: MessageSquare }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-500 hover:text-white'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {(() => {
          let itemsToDisplay = [];
          let contentType = '';

          if (activeTab === 'all') {
            // Combine all content types and sort by date
            const allArticles = (content.articles || []).map(item => ({ ...item, type: 'article' }));
            const allResearch = (content.research || []).map(item => ({ ...item, type: 'research' }));
            const allEvents = (content.events || []).map(item => ({ ...item, type: 'event' }));
            const allPosts = (content.posts || []).map(item => ({ ...item, type: 'post' }));

            itemsToDisplay = [
              ...allArticles,
              ...allResearch,
              ...allEvents,
              ...allPosts
            ].filter(item => item && item.id).sort((a, b) => {
              const dateA = new Date(a.createdAt || a.date || 0);
              const dateB = new Date(b.createdAt || b.date || 0);
              return dateB - dateA;
            });

            console.log('Displaying items:', {
              total: itemsToDisplay.length,
              articles: allArticles.length,
              research: allResearch.length,
              events: allEvents.length,
              posts: allPosts.length,
              contentState: content
            });
          } else {
            itemsToDisplay = (content[activeTab] || []).map(item => ({ ...item, type: activeTab }));
            contentType = activeTab;
          }

          if (!contentLoaded && activeTab === 'all') {
            return (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-4">Cargando contenido...</p>
              </div>
            );
          }

          if (itemsToDisplay.length === 0) {
            return (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">
                  {activeTab === 'all'
                    ? 'No hay contenido publicado aún.'
                    : `No hay ${activeTab} publicados aún.`}
                </p>
              </div>
            );
          }

          return itemsToDisplay.map((item) => {
            if (item.type === 'post') {
              // PREMIUM POST CARD RENDER FOR PROFILE
              const isLiked = reactions[item.id]?.['love']?.count > 0 || false; // Simplified check, ideally check user specifics
              // Actually standard reaction logic handles "my reaction". 
              // Let's assume we toggle "love". 

              const handlePostReaction = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isAuthenticated()) return;

                try {
                  // For this specific request: "nada mas sea el me encanta"
                  // We will toggle 'love'.
                  const response = await fetch(`${BACKEND_URL}/api/blog/${item.id}/react`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ type: 'love' })
                  });
                  const data = await response.json();
                  if (data.ok) {
                    setReactions(prev => ({ ...prev, [item.id]: data.reactions }));
                  }
                } catch (err) { console.error(err); }
              };

              return (
                <div key={`post-${item.id}`} className="glass-card mb-6 overflow-hidden border border-white/5 bg-[#0A0A0B]/60 backdrop-blur-md">
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden">
                        {item.author?.avatar ? (
                          <img src={item.author.avatar} alt={item.author.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold">{item.author?.name?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-gray-200 font-bold text-sm">{item.author?.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-4">
                    {item.title && <h2 className="text-xl font-bold text-white mb-3">{item.title}</h2>}
                    <div
                      className="text-gray-300 text-sm leading-relaxed mb-4 prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                    {/* Media */}
                    {(item.imageUrl || item.videoUrl || item.coverUrl) && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/5 bg-black/40">
                        {item.videoUrl ? (
                          <video src={item.videoUrl} controls className="w-full aspect-video object-cover" />
                        ) : (
                          <img src={item.imageUrl || item.coverUrl} alt="Post media" className="w-full max-h-[400px] object-cover" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 flex items-center gap-6">
                    {/* Love Button Only */}
                    <button
                      onClick={handlePostReaction}
                      className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                        // Check if current user reacted 'love' - this logic is simplified
                        // We'd ideally check the array of user ids in reactions, but the backend returns counts usually
                        // For now visual toggle based on interaction or just showing the count and generic color
                        'text-pink-500 hover:text-pink-400'
                        }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                      </svg>
                      <span>{reactions[item.id]?.love?.count || 0}</span>
                    </button>

                    <button
                      onClick={() => setExpandedComments(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span>{item._count?.comments || 0}</span>
                    </button>
                  </div>

                  {/* Comments */}
                  {expandedComments[item.id] && (
                    <div className="border-t border-white/5 bg-black/20 p-4">
                      <CommentSection postId={item.id} />
                    </div>
                  )}
                </div>
              );
            }

            const getTypeLabel = (type) => {
              const labels = {
                article: 'Artículo',
                research: 'Investigación',
                event: 'Evento',
                post: 'Post'
              };
              return labels[type] || '';
            };

            const getTypeIcon = (type) => {
              if (type === 'article') return BookOpen;
              if (type === 'research') return FileText;
              if (type === 'event') return Calendar;
              if (type === 'post') return MessageSquare;
              return FileText;
            };

            const getRoute = (type, id) => {
              if (type === 'post') return `/blog`; // Fallback if clicking the card title
              if (type === 'event') return `/events/${id}`;
              if (type === 'research') return `/research/${id}`;
              return `/articles/${id}`;
            };

            const TypeIcon = getTypeIcon(item.type);

            return (
              <Link
                key={`${item.type}-${item.id}`}
                to={getRoute(item.type, item.id)}
                className="glass-card p-6 hover:shadow-xl transition-all duration-300 block mb-4 border border-white/5 bg-[#0A0A0B]/40"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <TypeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                    {(item.coverUrl || item.bannerUrl) && (
                      <div className="mb-4 rounded-xl overflow-hidden h-48 w-full">
                        <img
                          src={item.coverUrl || item.bannerUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-white mb-2">
                      {item.title || 'Sin título'}
                    </h3>
                    {(item.description || item.content) && (
                      <p className="text-gray-400 mb-4 line-clamp-2">
                        {item.description || (item.content ? item.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : '')}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.location && (
                        <>
                          <span>•</span>
                          <span>{item.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          });
        })()}
      </div>
    </div>
  );
};

export default UserProfile;

