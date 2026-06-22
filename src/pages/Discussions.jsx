import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Plus, Clock, User, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import { BACKEND_URL } from '../config/client';

const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    const [name, value] = c.trim().split('=');
    if (name === 'csrf') return value;
  }
  return null;
};

const Discussions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState({ title: '', content: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const fetchDiscussions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/discussions`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setDiscussions(data.discussions || []);
      }
    } catch (err) {
      console.error('Error fetching discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/auth');
    if (!form.title.trim() || !form.content.trim()) {
      setCreateError('El título y el contenido son obligatorios');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setDiscussions(prev => [data.discussion, ...prev]);
        setForm({ title: '', content: '' });
        setShowCreate(false);
      } else {
        setCreateError(data.message || 'Error al crear la discusión');
      }
    } catch {
      setCreateError('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  const filtered = discussions.filter(d =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.content?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-16">

        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 flex-wrap"
          style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}
        >
          <div>
            <span className="category-tag">Comunidad</span>
            <h1
              className="font-display mt-2"
              style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text)', lineHeight: 1.1 }}
            >
              Discusiones
            </h1>
            <p className="font-sans mt-3" style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: '520px' }}>
              Debates académicos y científicos de la comunidad.
            </p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end' }}
            >
              <Plus size={14} />
              Nueva Discusión
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-4 mb-8 p-6"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h2 className="font-sans font-medium" style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>
              Nueva Discusión
            </h2>
            <div>
              <label className="input-label">Título</label>
              <input
                type="text"
                className="input-field"
                placeholder="Título de la discusión..."
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div>
              <label className="input-label">Descripción</label>
              <textarea
                className="input-field"
                placeholder="Describe el tema de la discusión..."
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                style={{ resize: 'none' }}
              />
            </div>
            {createError && (
              <p className="font-sans text-xs" style={{ color: 'var(--accent)' }}>{createError}</p>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={creating} className="btn btn-primary">
                {creating ? 'Publicando…' : 'Publicar'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(''); setForm({ title: '', content: '' }); }}
                className="btn btn-ghost"
                style={{ border: '1px solid var(--border)', padding: '0.75rem 1.5rem' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="relative mb-8" style={{ maxWidth: '480px' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
          />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Buscar discusión..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <div style={{
              width: 28, height: 28,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <MessageSquare size={32} style={{ color: 'var(--muted)', margin: '0 auto 1rem' }} />
            <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              {search ? 'No se encontraron discusiones' : 'Sé el primero en abrir una discusión'}
            </p>
            <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
              {search
                ? 'Intenta con otros términos de búsqueda.'
                : 'Comparte una pregunta, idea o debate científico con la comunidad.'}
            </p>
            {!search && user && (
              <button onClick={() => setShowCreate(true)} className="btn btn-outline mt-6">
                <Plus size={13} /> Iniciar discusión
              </button>
            )}
          </div>
        ) : (
          <div>
            {filtered.map(discussion => (
              <div key={discussion.id}>
                <article
                  className="cursor-pointer group py-6"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onClick={() => setSelectedId(selectedId === discussion.id ? null : discussion.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-display group-hover:[color:var(--accent)] transition-colors duration-150 mb-2"
                        style={{ fontSize: '1.125rem', lineHeight: 1.3, color: 'var(--text)' }}
                      >
                        {discussion.title}
                      </h3>
                      <p
                        className="font-sans text-sm mb-3"
                        style={{ color: 'var(--muted)', lineHeight: 1.6,
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                      >
                        {discussion.content}
                      </p>
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/profile/${discussion.author?.id}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1.5 font-sans text-xs"
                          style={{ color: 'var(--muted)' }}
                        >
                          {discussion.author?.avatar ? (
                            <img src={discussion.author.avatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <User size={12} />
                          )}
                          {discussion.author?.name || 'Anónimo'}
                        </Link>
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>
                          {formatDate(discussion.createdAt)}
                        </span>
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <span className="font-sans text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                          <MessageSquare size={11} />
                          {discussion._count?.comments ?? discussion.comments?.length ?? 0}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      style={{
                        color: 'var(--muted)', flexShrink: 0,
                        transform: selectedId === discussion.id ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.15s',
                      }}
                    />
                  </div>
                </article>

                {selectedId === discussion.id && (
                  <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <p className="font-sans text-sm mb-4" style={{ color: 'var(--text)', lineHeight: 1.7 }}>
                      {discussion.content}
                    </p>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                      <CommentSection discussionId={discussion.id} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discussions;
