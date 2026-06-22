import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bookmark, FileText, Calendar, MessageSquare, BookOpen, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

import { BACKEND_URL } from '../config/client';

const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'articles', label: 'Artículos' },
  { id: 'research', label: 'Investigaciones' },
  { id: 'events', label: 'Eventos' },
  { id: 'posts', label: 'Posts' },
];

const TYPE_LABEL = { article: 'Artículo', research: 'Investigación', post: 'Post', event: 'Evento' };
const TYPE_ICON = { article: FileText, research: BookOpen, post: MessageSquare, event: Calendar };

const SavedItems = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated()) fetchSavedItems();
  }, [isAuthenticated, activeTab, searchQuery]);

  const fetchSavedItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/saved`, { credentials: 'include' });
      const data = await response.json();
      if (data.ok) {
        let items = data.savedItems || [];
        if (activeTab !== 'all') {
          items = items.filter(item => {
            if (activeTab === 'articles') return !!item.article;
            if (activeTab === 'research') return !!item.research;
            if (activeTab === 'events') return !!item.event;
            if (activeTab === 'posts') return !!item.post;
            return true;
          });
        }
        if (searchQuery) {
          items = items.filter(item => {
            const content = item.article || item.research || item.post || item.event;
            const q = searchQuery.toLowerCase();
            return content?.title?.toLowerCase().includes(q) || content?.description?.toLowerCase().includes(q);
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

  const formatDate = (d) => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

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

  const tabCount = (id) => {
    if (id === 'all') return savedItems.length;
    return savedItems.filter(i => {
      if (id === 'articles') return !!i.article;
      if (id === 'research') return !!i.research;
      if (id === 'events') return !!i.event;
      if (id === 'posts') return !!i.post;
      return false;
    }).length;
  };

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="site-container py-16">
          {/* Header */}
          <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
            <span className="category-tag">Mi contenido</span>
            <h1 className="font-display mt-2" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text)', lineHeight: 1.1 }}>
              Guardados
            </h1>
            <p className="font-sans mt-3" style={{ color: 'var(--muted)', fontSize: '1rem' }}>
              Tus artículos, investigaciones, posts y eventos guardados
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-8" style={{ maxWidth: '480px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Buscar en guardados…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 mb-8" style={{ borderBottom: '1px solid var(--border)' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="font-sans text-xs uppercase tracking-wider pb-3"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '1px solid var(--text)' : '1px solid transparent',
                  marginBottom: '-1px',
                  color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                  transition: 'color 0.15s',
                }}
              >
                {tab.label} ({tabCount(tab.id)})
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center">
              <Bookmark size={32} style={{ color: 'var(--muted)', margin: '0 auto 1rem' }} />
              <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>
                No hay contenido guardado{activeTab !== 'all' ? ` en ${TABS.find(t => t.id === activeTab)?.label.toLowerCase()}` : ''}
              </p>
            </div>
          ) : (
            <div>
              {filteredItems.map(item => {
                const content = item.article || item.research || item.post || item.event;
                const type = item.article ? 'article' : item.research ? 'research' : item.post ? 'post' : 'event';
                const author = content?.author || content?.creator;
                const linkPath = type === 'article' ? `/articles/${content.id}` :
                  type === 'research' ? `/research/${content.id}` :
                  type === 'post' ? `/blog` :
                  `/events/${content.id}`;
                const Icon = TYPE_ICON[type];

                return (
                  <Link
                    key={item.id}
                    to={linkPath}
                    className="group flex items-start gap-4 py-5"
                    style={{ borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
                  >
                    <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>
                      <Icon size={16} style={{ color: 'var(--muted)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="category-tag">{TYPE_LABEL[type]}</span>
                        {content?.category && (
                          <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>{content.category}</span>
                        )}
                      </div>
                      <h3
                        className="font-display group-hover:[color:var(--accent)] transition-colors mb-1"
                        style={{ fontSize: '1.0625rem', color: 'var(--text)', lineHeight: 1.3 }}
                      >
                        {content?.title || 'Sin título'}
                      </h3>
                      {content?.description && (
                        <p className="font-sans text-sm mb-2" style={{ color: 'var(--muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {content.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 font-sans text-xs" style={{ color: 'var(--muted)' }}>
                        {author && <span>{author.name || author.username}</span>}
                        {author && <span style={{ color: 'var(--border)' }}>·</span>}
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SavedItems;
