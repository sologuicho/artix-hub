import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Plus, Clock, User, ChevronRight, Search, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

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
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);

  // Create form state
  const [form, setForm] = useState({ title: '', content: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const fetchDiscussions = async () => {
    try {
      // Discussions endpoint — falls back gracefully if not implemented
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
        body: JSON.stringify(form)
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
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <PremiumPageLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Discusiones</h1>
          </div>
          <p className="text-gray-400 text-sm ml-12">Debates académicos y científicos de la comunidad</p>
        </div>

        {user && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" />
            Nueva Discusión
          </button>
        )}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreate}
            className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4"
          >
            <h2 className="font-semibold text-white">Nueva Discusión</h2>
            <input
              type="text"
              placeholder="Título de la discusión..."
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm"
              maxLength={120}
            />
            <textarea
              placeholder="Describe el tema de la discusión..."
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm resize-none"
            />
            {createError && <p className="text-red-400 text-xs">{createError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
              >
                {creating ? 'Publicando...' : 'Publicar'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(''); setForm({ title: '', content: '' }); }}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-medium text-sm transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar discusión..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
            <MessageSquare className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-white">
            {search ? 'No se encontraron discusiones' : 'Sé el primero en abrir una discusión'}
          </h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            {search ? 'Intenta con otros términos de búsqueda.' : 'Comparte una pregunta, idea o debate científico con la comunidad.'}
          </p>
          {!search && user && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Iniciar discusión
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((discussion, i) => (
            <motion.div
              key={discussion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group"
            >
              <div
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedDiscussion?.id === discussion.id
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                }`}
                onClick={() => setSelectedDiscussion(
                  selectedDiscussion?.id === discussion.id ? null : discussion
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <h3 className="font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                        {discussion.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 ml-6">{discussion.content}</p>
                    <div className="flex items-center gap-3 mt-3 ml-6 text-xs text-gray-500">
                      <Link
                        to={`/profile/${discussion.author?.id}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 hover:text-white transition-colors"
                      >
                        {discussion.author?.avatar ? (
                          <img src={discussion.author.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                        {discussion.author?.name || 'Anónimo'}
                      </Link>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(discussion.createdAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {discussion._count?.comments ?? discussion.comments?.length ?? 0} comentarios
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                    selectedDiscussion?.id === discussion.id ? 'rotate-90 text-purple-400' : ''
                  }`} />
                </div>
              </div>

              {/* Inline comments */}
              <AnimatePresence>
                {selectedDiscussion?.id === discussion.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-4 p-5 rounded-b-2xl bg-white/3 border border-t-0 border-white/10 space-y-4">
                      <p className="text-sm text-gray-300 leading-relaxed">{discussion.content}</p>
                      <div className="border-t border-white/5 pt-4">
                        <CommentSection discussionId={discussion.id} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </PremiumPageLayout>
  );
};

export default Discussions;
