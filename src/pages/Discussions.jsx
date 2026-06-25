import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Plus, User, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

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
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}
        >
          <div>
            <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Comunidad
            </p>
            <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--text)', lineHeight: 1.1 }}>
              Discusiones
            </h1>
            <p style={{ fontFamily: SANS, color: 'var(--muted)', fontSize: '1rem', marginTop: '0.75rem', maxWidth: '520px' }}>
              Debates académicos y científicos de la comunidad.
            </p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end', fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
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
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <h2 style={{ fontFamily: SANS, fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>
              Nueva Discusión
            </h2>
            <div>
              <label style={{ fontFamily: MONO, fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: '0.375rem' }}>
                Título
              </label>
              <input
                type="text"
                className="input-field"
                style={{ fontFamily: SANS }}
                placeholder="Título de la discusión..."
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div>
              <label style={{ fontFamily: MONO, fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', display: 'block', marginBottom: '0.375rem' }}>
                Descripción
              </label>
              <textarea
                className="input-field"
                style={{ fontFamily: SANS, resize: 'none' }}
                placeholder="Describe el tema de la discusión..."
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
            </div>
            {createError && (
              <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: '#C4451A' }}>{createError}</p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" disabled={creating} className="btn btn-primary" style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {creating ? 'Publicando…' : 'Publicar'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(''); setForm({ title: '', content: '' }); }}
                className="btn btn-ghost"
                style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid var(--border)', padding: '0.75rem 1.5rem' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: '480px', marginBottom: '2rem' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
          />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '2.25rem', fontFamily: SANS }}
            placeholder="Buscar discusión..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Section label */}
        {!loading && filtered.length > 0 && (
          <p style={{ fontFamily: MONO, fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            Discusiones{' '}
            <span style={{ fontFamily: MONO, color: 'var(--muted)' }}>({filtered.length})</span>
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ padding: '5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 28, height: 28,
              border: '2px solid var(--border)',
              borderTopColor: '#C4451A',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '5rem 0', textAlign: 'center' }}>
            <MessageSquare size={32} style={{ color: 'var(--muted)', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              {search ? 'Sin resultados' : 'Sin discusiones'}
            </p>
            <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              {search
                ? 'Intenta con otros términos de búsqueda.'
                : 'Comparte una pregunta, idea o debate científico con la comunidad.'}
            </p>
            {!search && user && (
              <button
                onClick={() => setShowCreate(true)}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                <Plus size={13} /> Iniciar discusión
              </button>
            )}
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {filtered.map(discussion => (
              <div key={discussion.id}>
                <article
                  className="group"
                  style={{ cursor: 'pointer', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}
                  onClick={() => setSelectedId(selectedId === discussion.id ? null : discussion.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        className="group-hover:[color:var(--accent)] transition-colors duration-150"
                        style={{ fontFamily: SANS, fontWeight: 600, fontSize: '1.0625rem', lineHeight: 1.3, color: 'var(--text)', marginBottom: '0.5rem' }}
                      >
                        {discussion.title}
                      </h3>
                      <p
                        style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                      >
                        {discussion.content}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Link
                          to={`/profile/${discussion.author?.id}`}
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', textDecoration: 'none' }}
                        >
                          {discussion.author?.avatar ? (
                            <img src={discussion.author.avatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <User size={12} />
                          )}
                          {discussion.author?.name || 'Anónimo'}
                        </Link>
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
                          {formatDate(discussion.createdAt)}
                        </span>
                        <span style={{ color: 'var(--border)' }}>·</span>
                        <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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
                    <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.7, marginBottom: '1rem' }}>
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
