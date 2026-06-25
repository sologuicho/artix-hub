import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { X, Sparkles, ToggleLeft, ToggleRight, ArrowLeft, SlidersHorizontal, Upload } from 'lucide-react';
import RichTextEditorWithMentions from '../components/RichTextEditorWithMentions';
import CollaboratorSelector from '../components/CollaboratorSelector';
import TagSelector from '../components/TagSelector';
import CategorySelector from '../components/CategorySelector';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';
import AIAssistantOverlay from '../components/AIAssistantOverlay';
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

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const CreateResearch = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  const isAdmin = user?.username === 'luisflores01';
  const [publishAsArtixResearch, setPublishAsArtixResearch] = useState(
    searchParams.get('asArtixResearch') === 'true'
  );
  const researchValidation = useAIValidation('research');
  const [saving, setSaving] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hoverCover, setHoverCover] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    content: '',
    tags: [],
    documents: [],
    references: [],
    coverUrl: '',
    isCollaborative: false,
  });
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (isEditMode && id) {
      const fetchResearch = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/research/${id}`, { credentials: 'include' });
          const data = await response.json();
          if (data.ok && data.research) {
            const r = data.research;
            setFormData({
              title: r.title || '',
              content: r.content || '',
              description: r.description || '',
              category: r.category || '',
              tags: r.tags || [],
              documents: r.documents || [],
              references: r.references || [],
              coverUrl: r.coverUrl || '',
              isCollaborative: r.isCollaborative || false,
            });
            if (r.collaborators) setCollaborators(r.collaborators);
          }
        } catch (err) { console.error(err); }
      };
      fetchResearch();
    }
  }, [isEditMode, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { compressImage } = await import('../utils/imageCompression');
        const url = await compressImage(file, 1200, 1200, 0.85);
        setFormData(prev => ({ ...prev, coverUrl: url }));
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => setFormData(prev => ({ ...prev, coverUrl: reader.result }));
        reader.readAsDataURL(file);
      }
    }
  };

  const handleInsertText = (text) => {
    setFormData(prev => ({ ...prev, content: prev.content + '\n\n' + text }));
  };

  const extractMentions = (html) => {
    const matches = html.match(/@(\w+)/g);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setValidationMessage('');
    try {
      const getCsrfToken = () => {
        for (let cookie of document.cookie.split(';')) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };
      const url = isEditMode ? `${BACKEND_URL}/api/research/${id}` : `${BACKEND_URL}/api/research`;
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          isCollaborative: formData.isCollaborative || collaborators.length > 0,
          publishAsArtixResearch: publishAsArtixResearch && !isEditMode,
          mentions: extractMentions(formData.content),
        }),
      });
      const data = await response.json();
      if (data.ok) {
        const researchId = isEditMode ? id : data.research?.id;
        if (!isEditMode && collaborators.length > 0 && researchId) {
          const csrfToken = getCsrfToken() || '';
          for (const c of collaborators) {
            await fetch(`${BACKEND_URL}/api/research/${researchId}/collaborators`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
              credentials: 'include',
              body: JSON.stringify({ userId: c.id, role: 'collaborator' }),
            });
          }
        }
        navigate(`/research/${researchId}`);
      } else {
        setValidationMessage(data.message || 'Error al guardar la investigación');
      }
    } catch (err) {
      setValidationMessage(err.message || 'Error al crear la investigación');
    } finally {
      setSaving(false);
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
              <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>Configuración</span>
              <button onClick={() => setSettingsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Campo de investigación</label>
              <CategorySelector
                category={formData.category}
                onChange={(cat) => setFormData(prev => ({ ...prev, category: cat }))}
                contentType="research"
                placeholder="Seleccionar campo…"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Etiquetas</label>
              <TagSelector
                tags={formData.tags}
                onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                context="research"
                placeholder="Agregar etiquetas…"
              />
            </div>

            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isCollaborative: !prev.isCollaborative }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, fontFamily: SANS, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
              >
                Investigación colaborativa
                {formData.isCollaborative
                  ? <ToggleRight size={18} style={{ color: 'var(--accent)' }} />
                  : <ToggleLeft size={18} style={{ color: 'var(--muted)' }} />}
              </button>

              {formData.isCollaborative && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>Colaboradores</label>
                  <CollaboratorSelector
                    selectedCollaborators={collaborators}
                    onSelect={(u) => setCollaborators(prev => [...prev, u])}
                    onRemove={(uid) => setCollaborators(prev => prev.filter(c => c.id !== uid))}
                    placeholder="Agregar investigadores…"
                  />
                </div>
              )}
            </div>

            {isAdmin && !isEditMode && (
              <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPublishAsArtixResearch(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, fontFamily: SANS, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                >
                  {publishAsArtixResearch ? 'Publicando como Artix' : 'Publicando como tú'}
                  {publishAsArtixResearch
                    ? <ToggleRight size={18} style={{ color: 'var(--accent)' }} />
                    : <ToggleLeft size={18} style={{ color: 'var(--muted)' }} />}
                </button>
              </div>
            )}

            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                Verificación de calidad
              </p>
              <AIValidationPanel
                status={researchValidation.status}
                result={researchValidation.result}
                error={researchValidation.error}
              />
            </div>

            {validationMessage && (
              <p style={{ fontFamily: SANS, fontSize: '0.875rem', marginTop: '1rem', color: '#C4451A' }}>{validationMessage}</p>
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
          onClick={() => navigate('/research')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', display: 'flex' }}
        >
          <ArrowLeft size={16} />
        </button>

        <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {isEditMode ? 'Editar investigación' : 'Nueva investigación'}
        </span>

        {wordCount > 0 && (
          <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--border)' }}>· {wordCount} palabras</span>
        )}

        <div style={{ flex: 1 }} />

        <div className="flex items-center gap-1.5">
          {[
            { done: progress.title, label: 'Título' },
            { done: progress.cover, label: 'Portada' },
            { done: progress.category, label: 'Campo' },
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
          disabled={saving}
          style={{
            fontFamily: SANS, fontSize: '0.6875rem', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            backgroundColor: '#C4451A', color: '#fff',
            border: 'none', padding: '0.5rem 1.25rem',
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.5 : 1, transition: 'opacity 0.15s',
          }}
        >
          {saving ? 'Publicando…' : 'Publicar'}
        </button>
      </nav>

      {/* Cover */}
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
          <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
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
          placeholder="Título de la investigación…"
          className="artix-create-input"
          style={{
            display: 'block', width: '100%',
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: SANS, fontWeight: 700,
            fontSize: 'clamp(1.875rem, 4vw, 2.625rem)', lineHeight: 1.2,
            color: 'var(--text)', marginBottom: '1rem',
          }}
        />

        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.375rem' }}>
            Resumen
          </p>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe el objetivo, metodología y hallazgos principales…"
            rows={4}
            className="artix-create-input"
            style={{
              display: 'block', width: '100%',
              background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem',
              fontSize: '1.0625rem', fontFamily: '"DM Sans", sans-serif',
              color: 'var(--muted)', lineHeight: 1.7,
            }}
          />
        </div>

        <div className="artix-editor">
          <RichTextEditorWithMentions
            value={formData.content}
            onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
            placeholder="Escribe el cuerpo de tu investigación…"
          />
        </div>
      </div>

      <AIAssistantOverlay
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        onInsertText={handleInsertText}
        contextData={{ title: formData.title, contentType: 'research', category: formData.category }}
      />
    </div>
  );
};

export default CreateResearch;
