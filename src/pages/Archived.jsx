import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Calendar, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const TABS = [
  { id: 'articles', label: 'Artículos' },
  { id: 'research', label: 'Investigaciones' },
  { id: 'events', label: 'Eventos' },
  { id: 'posts', label: 'Posts' },
];

const Archived = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('articles');
  const [content, setContent] = useState({ articles: [], research: [], events: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) fetchArchived();
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
      if (activeTab === 'articles') { params.append('status', 'archived'); endpoint = `${BACKEND_URL}/api/articles?${params}`; }
      else if (activeTab === 'research') { params.append('status', 'archived'); endpoint = `${BACKEND_URL}/api/research?${params}`; }
      else if (activeTab === 'events') { endpoint = `${BACKEND_URL}/api/events?${params}`; }
      else if (activeTab === 'posts') { endpoint = `${BACKEND_URL}/api/blog?${params}`; }

      if (endpoint) {
        const response = await fetch(endpoint, { credentials: 'include' });
        const data = await response.json();
        if (data.ok) {
          let items = [];
          if (activeTab === 'posts') items = (data.posts || []).filter(p => p.archived);
          else if (activeTab === 'events') items = (data.events || []).filter(e => e.archived);
          else items = data[activeTab] || [];
          setContent(prev => ({ ...prev, [activeTab]: items }));
        }
      }
    } catch (error) {
      console.error('Error fetching archived:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="site-container py-16">

          {/* Header */}
          <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Mi contenido
            </p>
            <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text)', lineHeight: 1.1 }}>
              Archivado
            </h1>
            <p style={{ fontFamily: SANS, color: 'var(--muted)', fontSize: '1rem', marginTop: '0.75rem' }}>
              Gestiona tu contenido archivado
            </p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '480px', marginBottom: '2rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '2.25rem', fontFamily: SANS }}
              placeholder="Buscar en archivados…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontFamily: MONO,
                  fontSize: '0.6875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? `2px solid #C4451A` : '2px solid transparent',
                  marginBottom: '-1px',
                  paddingBottom: '0.75rem',
                  cursor: 'pointer',
                  color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                  transition: 'color 0.15s',
                }}
              >
                {tab.label}{' '}
                <span style={{ fontFamily: MONO, color: 'var(--muted)' }}>
                  ({content[tab.id]?.length || 0})
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ padding: '5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: '#C4451A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : content[activeTab]?.length === 0 ? (
            <div style={{ padding: '5rem 0', textAlign: 'center' }}>
              <Archive size={32} style={{ color: 'var(--muted)', margin: '0 auto 1rem' }} />
              <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                Sin resultados
              </p>
              <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--muted)' }}>
                No hay {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} archivados
              </p>
            </div>
          ) : (
            <div>
              {content[activeTab].map(item => (
                <Link
                  key={item.id}
                  to={`/${activeTab === 'posts' ? 'blog' : activeTab}/${item.id}`}
                  className="group"
                  style={{ display: 'block', padding: '1rem 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    {item.coverUrl && (
                      <div style={{ width: 80, height: 60, flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={item.coverUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        className="group-hover:[color:var(--accent)] transition-colors"
                        style={{ fontFamily: SANS, fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginBottom: '0.25rem' }}
                      >
                        {item.title || 'Sin título'}
                      </h3>
                      {item.description && (
                        <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.5rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
                        <Calendar size={11} />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Archived;
