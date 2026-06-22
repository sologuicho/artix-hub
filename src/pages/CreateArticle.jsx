import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { X, Sparkles, ToggleLeft, ToggleRight, ArrowLeft, SlidersHorizontal, Upload } from 'lucide-react';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';
import AIAssistantOverlay from '../components/AIAssistantOverlay';
import RichTextEditorWithMentions from '../components/RichTextEditorWithMentions';
import TagSelector from '../components/TagSelector';
import CategorySelector from '../components/CategorySelector';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const PAGE_STYLES = `
  .artix-editor .ql-toolbar {
    background-color: var(--surface);
    border: none;
    border-bottom: 1px solid var(--border);
    padding: 0.375rem 0;
    position: sticky;
    top: 44px;
    z-index: 15;
  }
  .artix-editor .ql-container {
    border: none;
    background: transparent;
    font-size: 1.0625rem;
  }
  .artix-editor .ql-editor {
    padding: 2rem 0;
    min-height: 420px;
    line-height: 1.85;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
  }
  .artix-editor .ql-stroke { stroke: var(--muted) !important; }
  .artix-editor .ql-fill { fill: var(--muted) !important; }
  .artix-editor .ql-picker-label { color: var(--muted) !important; }
  .artix-editor .ql-editor.ql-blank::before { color: var(--muted); font-style: normal; left: 0; }
  .artix-editor .ql-toolbar button:hover .ql-stroke,
  .artix-editor .ql-toolbar button.ql-active .ql-stroke { stroke: var(--accent) !important; }
  .artix-editor .ql-toolbar button:hover .ql-fill,
  .artix-editor .ql-toolbar button.ql-active .ql-fill { fill: var(--accent) !important; }
  .artix-editor .ql-picker-options {
    background-color: var(--surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
  }
  .artix-editor .ql-picker-item:hover { color: var(--accent) !important; }
  @keyframes artixDrawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .artix-settings-drawer { animation: artixDrawerIn 0.2s ease; }
  .artix-create-input::placeholder { color: var(--muted); opacity: 1; }
`;

const CreateArticle = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  const isAdmin = user?.username === 'luisflores01';
  const [publishAsArtixResearch, setPublishAsArtixResearch] = useState(
    searchParams.get('asArtixResearch') === 'true'
  );
  const articleValidation = useAIValidation('article');
  const [validationMessage, setValidationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [hoverCover, setHoverCover] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    category: '',
    tags: [],
    references: [],
    coverUrl: '',
    status: 'draft',
    isCollaborative: false,
  });

  useEffect(() => {
    if (isEditMode && id) {
      const fetchArticle = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/articles/${id}`, { credentials: 'include' });
          const data = await response.json();
          if (data.ok && data.article) {
            const a = data.article;
            setFormData({
              title: a.title || '',
              content: a.content || '',
              description: a.description || '',
              category: a.category || '',
              tags: a.tags || [],
              references: a.references || [],
              coverUrl: a.coverUrl || '',
              status: a.status || 'draft',
              isCollaborative: a.isCollaborative || false,
            });
          }
        } catch (err) { console.error(err); }
      };
      fetchArticle();
    }
  }, [isEditMode, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, coverUrl: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleInsertText = (text) => {
    setFormData(prev => ({ ...prev, content: prev.content + '\n\n' + text }));
    setSelectedText('');
  };

  const handleTextReplace = (newText) => {
    setFormData(prev => ({ ...prev, content: newText }));
    setSelectedText('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setValidationMessage('');
    try {
      const getCsrfToken = () => {
        for (let cookie of document.cookie.split(';')) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };
      const url = isEditMode ? `${BACKEND_URL}/api/articles/${id}` : `${BACKEND_URL}/api/articles`;
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, publishAsArtixResearch, status: isEditMode ? formData.status : 'published' }),
      });
      const data = await response.json();
      if (data.ok) {
        navigate(`/articles/${data.article?.id || id}`);
      } else {
        setValidationMessage(data.message || 'Error al guardar el artículo');
      }
    } catch (err) {
      setValidationMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = formData.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  const progress = {
    title: formData.title.trim().length > 0,
    cover: !!formData.coverUrl,
    category: !!formData.category,
    content: wordCount >= 50,
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <style>{PAGE_STYLES}</style>

      {/* Settings drawer */}
      {settingsOpen && (
        <>
          <div
            onClick={() => setSettingsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.18)' }}
          />
          <div
            className="artix-settings-drawer"
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '340px',
              backgroundColor: 'var(--bg)', borderLeft: '1px solid var(--border)',
              zIndex: 50, overflowY: 'auto', padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <span className="font-sans text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Configuración
              </span>
              <button onClick={() => setSettingsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">Categoría</label>
              <CategorySelector
                category={formData.category}
                onChange={(cat) => setFormData(prev => ({ ...prev, category: cat }))}
                contentType="article"
                placeholder="Seleccionar categoría…"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">Etiquetas</label>
              <TagSelector
                tags={formData.tags}
                onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                context="articles"
                placeholder="Agregar etiquetas…"
              />
            </div>

            {isAdmin && !isEditMode && (
              <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPublishAsArtixResearch(v => !v)}
                  className="flex items-center justify-between w-full font-sans text-sm"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
                >
                  {publishAsArtixResearch ? 'Publicando como Artix' : 'Publicando como tú'}
                  {publishAsArtixResearch
                    ? <ToggleRight size={18} style={{ color: 'var(--accent)' }} />
                    : <ToggleLeft size={18} style={{ color: 'var(--muted)' }} />}
                </button>
              </div>
            )}

            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p className="font-sans text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
                Verificación de calidad
              </p>
              <AIValidationPanel
                status={articleValidation.status}
                result={articleValidation.result}
                error={articleValidation.error}
              />
            </div>

            {validationMessage && (
              <p className="font-sans text-sm mt-4" style={{ color: 'var(--accent)' }}>{validationMessage}</p>
            )}
          </div>
        </>
      )}

      {/* Slim nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: '44px', display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', gap: '0.75rem',
        backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={() => navigate('/articles')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', display: 'flex' }}
        >
          <ArrowLeft size={16} />
        </button>

        <span className="font-sans text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          {isEditMode ? 'Editar artículo' : 'Nuevo artículo'}
        </span>

        {wordCount > 0 && (
          <span className="font-sans text-xs" style={{ color: 'var(--border)' }}>· {wordCount} palabras</span>
        )}

        <div style={{ flex: 1 }} />

        {/* Completion dots: title, cover, category, content */}
        <div className="flex items-center gap-1.5">
          {[
            { done: progress.title, label: 'Título' },
            { done: progress.cover, label: 'Portada' },
            { done: progress.category, label: 'Categoría' },
            { done: progress.content, label: 'Contenido (min. 50 palabras)' },
          ].map(({ done, label }) => (
            <div
              key={label}
              title={label}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                backgroundColor: done ? 'var(--accent)' : 'var(--border)',
                transition: 'background-color 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />

        <button
          onClick={() => setSettingsOpen(v => !v)}
          title="Configuración"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: settingsOpen ? 'var(--accent)' : 'var(--muted)', padding: '0.25rem', display: 'flex', transition: 'color 0.15s' }}
        >
          <SlidersHorizontal size={15} />
        </button>

        <button
          onClick={() => setIsAIPanelOpen(v => !v)}
          title="Asistente IA"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: isAIPanelOpen ? 'var(--accent)' : 'var(--muted)', padding: '0.25rem', display: 'flex', transition: 'color 0.15s' }}
        >
          <Sparkles size={15} />
        </button>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn btn-primary"
          style={{ fontSize: '0.6875rem', padding: '0.5rem 1.25rem', opacity: isSubmitting ? 0.5 : 1 }}
        >
          {isSubmitting ? 'Publicando…' : 'Publicar'}
        </button>
      </nav>

      {/* Cover zone */}
      {formData.coverUrl ? (
        <div style={{ width: '100%', aspectRatio: '16/5', position: 'relative' }}>
          <img src={formData.coverUrl} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            onClick={() => setFormData(prev => ({ ...prev, coverUrl: '' }))}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', padding: '0.375rem', color: 'var(--muted)', display: 'flex' }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          onMouseEnter={() => setHoverCover(true)}
          onMouseLeave={() => setHoverCover(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            width: '100%', padding: '0.625rem 1.5rem',
            borderBottom: `1px solid ${hoverCover ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer', transition: 'border-color 0.15s',
          }}
        >
          <Upload size={12} style={{ color: 'var(--muted)' }} />
          <span className="font-sans text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Agregar portada
          </span>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
        </label>
      )}

      {/* Writing area */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem 8rem' }}>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Título del artículo…"
          className="font-display artix-create-input"
          style={{
            display: 'block', width: '100%',
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: 'clamp(1.875rem, 4vw, 2.625rem)', lineHeight: 1.2,
            color: 'var(--text)', marginBottom: '1rem',
          }}
        />
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Subtítulo o descripción…"
          rows={2}
          className="artix-create-input"
          style={{
            display: 'block', width: '100%',
            background: 'transparent', border: 'none', outline: 'none', resize: 'none',
            borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '2rem',
            fontSize: '1.125rem', fontFamily: '"DM Sans", sans-serif',
            color: 'var(--muted)', lineHeight: 1.6,
          }}
        />
        <div className="artix-editor">
          <RichTextEditorWithMentions
            value={formData.content}
            onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
            placeholder="Escribe tu artículo…"
          />
        </div>
      </div>

      <AIAssistantOverlay
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        onInsertText={handleInsertText}
        contextData={{ selectedText, category: formData.category, contentType: 'article' }}
      />
    </div>
  );
};

export default CreateArticle;
