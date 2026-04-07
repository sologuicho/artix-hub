import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Archive, BookOpen, FileText, Calendar, MessageSquare, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import SearchBar from '../components/SearchBar';
import ProfileSidebar from '../components/ProfileSidebar';

import { BACKEND_URL } from '../config/client';

const Archived = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('articles');
  const [content, setContent] = useState({
    articles: [],
    research: [],
    events: [],
    posts: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchArchived();
    }
  }, [user, activeTab, searchQuery]);

  const fetchArchived = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('author', user.id);
      params.append('includeArchived', 'true');
      if (searchQuery) params.append('search', searchQuery);

      let endpoint = '';
      if (activeTab === 'articles') {
        params.append('status', 'archived');
        endpoint = `${BACKEND_URL}/api/articles?${params.toString()}`;
      } else if (activeTab === 'research') {
        params.append('status', 'archived');
        endpoint = `${BACKEND_URL}/api/research?${params.toString()}`;
      } else if (activeTab === 'events') {
        endpoint = `${BACKEND_URL}/api/events?${params.toString()}`;
      } else if (activeTab === 'posts') {
        endpoint = `${BACKEND_URL}/api/blog?${params.toString()}`;
      }

      if (endpoint) {
        const response = await fetch(endpoint, { credentials: 'include' });
        const data = await response.json();
        if (data.ok) {
          let items = [];
          if (activeTab === 'posts') {
            items = (data.posts || []).filter(p => p.archived);
          } else if (activeTab === 'events') {
            items = (data.events || []).filter(e => e.archived);
          } else {
            items = data[activeTab] || [];
          }
          setContent(prev => ({ ...prev, [activeTab]: items }));
        }
      }
    } catch (error) {
      console.error('Error fetching archived:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && content[activeTab].length === 0) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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
                <Archive className="w-8 h-8" />
                Contenido Archivado
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestiona tu contenido archivado
              </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <SearchBar 
                onSearch={setSearchQuery} 
                placeholder="Buscar en archivados..." 
              />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
              {[
                { id: 'articles', label: 'Artículos', icon: BookOpen },
                { id: 'research', label: 'Investigaciones', icon: FileText },
                { id: 'events', label: 'Eventos', icon: Calendar },
                { id: 'posts', label: 'Posts', icon: MessageSquare }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium transition-colors border-b-2 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label} ({content[tab.id]?.length || 0})
                </button>
              ))}
            </div>

            {/* Content List */}
            <div className="space-y-6">
              {content[activeTab]?.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No hay {activeTab} archivados.
                  </p>
                </div>
              ) : (
                content[activeTab]?.map((item) => (
                  <Link
                    key={item.id}
                    to={`/${activeTab === 'posts' ? 'blog' : activeTab}/${item.id}`}
                    className="glass-card p-6 hover:shadow-xl transition-all duration-300 block"
                  >
                    {item.coverUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden">
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-64 object-cover"
                        />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Archived;




