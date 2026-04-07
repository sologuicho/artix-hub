import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bookmark, FileText, Calendar, MessageSquare, Search, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import SearchBar from '../components/SearchBar';
import ProfileSidebar from '../components/ProfileSidebar';

import { BACKEND_URL } from '../config/client';

const SavedItems = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated()) {
      fetchSavedItems();
    }
  }, [isAuthenticated, activeTab, searchQuery]);

  const fetchSavedItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/saved`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        let items = data.savedItems || [];
        
        // Filter by type
        if (activeTab !== 'all') {
          items = items.filter(item => {
            if (activeTab === 'articles') return !!item.article;
            if (activeTab === 'research') return !!item.research;
            if (activeTab === 'events') return !!item.event;
            if (activeTab === 'posts') return !!item.post;
            return true;
          });
        }
        
        // Filter by search
        if (searchQuery) {
          items = items.filter(item => {
            const content = item.article || item.research || item.post || item.event;
            const searchLower = searchQuery.toLowerCase();
            return (
              content?.title?.toLowerCase().includes(searchLower) ||
              content?.description?.toLowerCase().includes(searchLower)
            );
          });
        }
        
        setSavedItems(items);
      }
    } catch (error) {
      console.error('Error fetching saved items:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const filteredItems = savedItems.filter(item => {
    const content = item.article || item.research || item.post || item.event;
    if (!content) return false;
    if (activeTab === 'all') return true;
    if (activeTab === 'articles') return !!item.article;
    if (activeTab === 'research') return !!item.research;
    if (activeTab === 'events') return !!item.event;
    if (activeTab === 'posts') return !!item.post;
    return true;
  });

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="hidden lg:block">
            <ProfileSidebar />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-3">
                <Bookmark className="w-8 h-8" />
                Contenido Guardado
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Tus artículos, investigaciones, posts y eventos guardados
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <SearchBar 
                onSearch={setSearchQuery} 
                placeholder="Buscar en guardados..." 
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
              {[
                { id: 'all', label: 'Todos', count: savedItems.length },
                { id: 'articles', label: 'Artículos', count: savedItems.filter(i => i.article).length },
                { id: 'research', label: 'Investigaciones', count: savedItems.filter(i => i.research).length },
                { id: 'events', label: 'Eventos', count: savedItems.filter(i => i.event).length },
                { id: 'posts', label: 'Posts', count: savedItems.filter(i => i.post).length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No hay contenido guardado {activeTab !== 'all' ? `en ${activeTab}` : ''}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const content = item.article || item.research || item.post || item.event;
                  const type = item.article ? 'article' : item.research ? 'research' : item.post ? 'post' : 'event';
                  const author = content?.author || content?.creator;
                  const linkPath = type === 'article' ? `/articles/${content.id}` :
                                 type === 'research' ? `/research/${content.id}` :
                                 type === 'post' ? `/blog` :
                                 `/events/${content.id}`;

                  return (
                    <Link
                      key={item.id}
                      to={linkPath}
                      className="glass-card p-6 hover:shadow-xl transition-all block"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {type === 'article' && <FileText className="w-8 h-8 text-blue-600" />}
                          {type === 'research' && <BookOpen className="w-8 h-8 text-indigo-600" />}
                          {type === 'post' && <MessageSquare className="w-8 h-8 text-purple-600" />}
                          {type === 'event' && <Calendar className="w-8 h-8 text-green-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {type === 'article' ? 'Artículo' : type === 'research' ? 'Investigación' : type === 'post' ? 'Post' : 'Evento'}
                            </span>
                            {content?.category && (
                              <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {content.category}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {content?.title || 'Sin título'}
                          </h3>
                          {content?.description && (
                            <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {content.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            {author && (
                              <span>{author.name || author.username || 'Usuario'}</span>
                            )}
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SavedItems;


