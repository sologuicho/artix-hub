import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Upload, Video, X, Building2, User, ToggleLeft, ToggleRight, Sparkles, ArrowLeft, Image } from 'lucide-react';
import RichTextEditorWithMentions from '../components/RichTextEditorWithMentions';
import TagSelector from '../components/TagSelector';
import CategorySelector from '../components/CategorySelector';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';
import AIAssistantOverlay from '../components/AIAssistantOverlay';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;700&display=swap');
  .artix-editor-blog .ql-toolbar {
    background-color: var(--surface);
    border: none;
    border-bottom: 1px solid var(--border);
    padding: 0.375rem 0;
  }
  .artix-editor-blog .ql-container {
    border: none;
    background: transparent;
    font-size: 1.0625rem;
  }
  .artix-editor-blog .ql-editor {
    padding: 1.25rem 0;
    min-height: 280px;
    line-height: 1.85;
    color: var(--text);
    font-family: 'IBM Plex Sans', sans-serif;
  }
  .artix-editor-blog .ql-stroke { stroke: var(--muted) !important; }
  .artix-editor-blog .ql-fill { fill: var(--muted) !important; }
  .artix-editor-blog .ql-picker-label { color: var(--muted) !important; }
  .artix-editor-blog .ql-editor.ql-blank::before { color: var(--muted); font-style: normal; left: 0; }
  .artix-editor-blog .ql-toolbar button:hover .ql-stroke,
  .artix-editor-blog .ql-toolbar button.ql-active .ql-stroke { stroke: var(--accent) !important; }
  .artix-editor-blog .ql-toolbar button:hover .ql-fill,
  .artix-editor-blog .ql-toolbar button.ql-active .ql-fill { fill: var(--accent) !important; }
  .artix-editor-blog .ql-picker-options {
    background-color: var(--surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
  }
  .artix-editor-blog .ql-picker-item:hover { color: var(--accent) !important; }
  .artix-create-input::placeholder { color: var(--muted); opacity: 1; }
`;

const CreateBlogPost = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  const isAdmin = user?.username === 'luisflores01';
  const [publishAsArtixResearch, setPublishAsArtixResearch] = useState(
    searchParams.get('asArtixResearch') === 'true'
  );
  const [validationMessage, setValidationMessage] = useState('');
  const blogValidation = useAIValidation('blog');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [hoverCover, setHoverCover] = useState(false);
  const [hoverImage, setHoverImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    tags: [],
  });
  const [coverUrl, setCoverUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (isEditMode && id) {
      const fetchPost = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/blog/${id}`, { credentials: 'include' });
          const data = await response.json();
          if (data.ok && data.post) {
            const post = data.post;
            setFormData({
              title: post.title || '',
              category: post.category || '',
              content: post.content || '',
              tags: post.tags || [],
            });
            setCoverUrl(post.coverUrl || '');
            setImageUrl(post.imageUrl || '');
            setVideoUrl(post.videoUrl || '');
            setDocuments(post.documents ? post.documents.map(url => ({ url })) : []);
          }
        } catch (error) { console.error('Error loading post:', error); }
      };
      fetchPost();
    }
  }, [isEditMode, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { compressImage } = await import('../utils/imageCompression');
      const compressed = await compressImage(file, 1200, 1200, 0.85);
      setCoverUrl(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setCoverUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { compressImage } = await import('../utils/imageCompression');
      const compressed = await compressImage(file, 1200, 1200, 0.85);
      setImageUrl(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result);
      reader.readAsDataURL(file);
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
    if (!formData.content.trim() && !coverUrl && !imageUrl && !videoUrl && documents.length === 0) {
      setValidationMessage('Debes agregar contenido o al menos un archivo');
      return;
    }
    setValidationMessage('');
    setIsSubmitting(true);

    try {
      const getCsrfToken = () => {
        for (let cookie of document.cookie.split(';')) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const documentUrls = documents.map(doc => doc.url);
      const url = isEditMode ? `${BACKEND_URL}/api/blog/${id}` : `${BACKEND_URL}/api/blog`;

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title || null,
          content: formData.content.trim(),
          category: formData.category || 'General',
          tags: formData.tags || [],
          coverUrl: coverUrl || null,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          documents: documentUrls,
          mentions: extractMentions(formData.content),
          publishAsArtixResearch: publishAsArtixResearch && !isEditMode,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        navigate('/blog');
      } else {
        setValidationMessage(data.message || 'Error al crear el post');
      }
    } catch (error) {
      setValidationMessage(error.message || 'Error al guardar el post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = formData.content
    .replace(/<[^>]*>/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <style>{PAGE_STYLES}</style>

      {/* Slim nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: '44px', display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', gap: '0.75rem',
        backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={() => navigate('/blog')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', display: 'flex' }}
        >
          <ArrowLeft size={16} />
        </button>

        <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {isEditMode ? 'Editar post' : 'Nuevo post'}
        </span>

        {wordCount > 0 && (
          <span style={{ fontFamily: MONO, fontSize: '0.5625rem', color: 'var(--border)' }}>· {wordCount} palabras</span>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setIsAIPanelOpen(v => !v)}
          title="Asistente IA"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: isAIPanelOpen ? '#C4451A' : 'var(--muted)', padding: '0.25rem', display: 'flex', transition: 'color 0.15s' }}
        >
          <Sparkles size={15} />
        </button>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: '#C4451A', color: '#fff', border: 'none',
            fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '0.5rem 1.25rem', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          {isSubmitting ? 'Publicando…' : 'Publicar'}
        </button>
      </nav>

      {/* Cover zone */}
      {coverUrl ? (
        <div style={{ width: '100%', aspectRatio: '16/5', position: 'relative' }}>
          <img src={coverUrl} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            onClick={() => setCoverUrl('')}
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
            borderBottom: `1px solid ${hoverCover ? '#C4451A' : 'var(--border)'}`,
            cursor: 'pointer', transition: 'border-color 0.15s',
          }}
        >
          <Upload size={12} style={{ color: 'var(--muted)' }} />
          <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Subir portada
          </span>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
        </label>
      )}

      {/* Writing area */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 1.5rem 10rem' }}>

        {/* Admin author toggle */}
        {isAdmin && !isEditMode && (
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1rem', marginBottom: '2rem',
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {publishAsArtixResearch
                ? <Building2 size={14} style={{ color: 'var(--muted)' }} />
                : <User size={14} style={{ color: 'var(--muted)' }} />
              }
              <span style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)' }}>
                Publicando como {publishAsArtixResearch ? 'Artix Research' : (user?.name || user?.username)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPublishAsArtixResearch(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex' }}
            >
              {publishAsArtixResearch
                ? <ToggleRight size={18} style={{ color: '#C4451A' }} />
                : <ToggleLeft size={18} style={{ color: 'var(--muted)' }} />
              }
            </button>
          </div>
        )}

        {/* Title */}
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Título (opcional)…"
          className="artix-create-input"
          style={{
            display: 'block', width: '100%',
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: 'clamp(1.625rem, 4vw, 2.25rem)', lineHeight: 1.2,
            fontFamily: SANS, fontWeight: 700,
            color: 'var(--text)', marginBottom: '1.75rem',
          }}
        />

        {/* Rich text editor */}
        <div className="artix-editor-blog" style={{ marginBottom: '2rem' }}>
          <RichTextEditorWithMentions
            value={formData.content}
            onChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
            placeholder="Escribe algo increíble…"
          />
        </div>

        {/* Media row */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {/* Inline image */}
          <label
            onMouseEnter={() => setHoverImage(true)}
            onMouseLeave={() => setHoverImage(false)}
            style={{ cursor: 'pointer', display: 'block', position: 'relative' }}
          >
            <div
              style={{
                aspectRatio: '4/3',
                border: `1.5px dashed ${hoverImage ? '#C4451A' : 'var(--border)'}`,
                backgroundColor: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', transition: 'border-color 0.15s', position: 'relative',
              }}
            >
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Imagen" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={(e) => { e.preventDefault(); setImageUrl(''); }}
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', padding: '0.25rem', color: 'var(--muted)', display: 'flex' }}
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <Image size={20} style={{ color: 'var(--muted)', margin: '0 auto 0.375rem' }} />
                  <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Imagen</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
          </label>

          {/* Video URL */}
          <div
            style={{
              aspectRatio: '4/3', backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)', padding: '1rem',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={14} style={{ color: 'var(--muted)' }} />
              <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>URL de video</span>
            </div>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://…"
              className="input-field"
              style={{ fontSize: '0.8125rem', fontFamily: SANS }}
            />
          </div>
        </div>

        {/* Category + Tags */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem',
            marginBottom: '2rem', padding: '1rem',
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          }}
        >
          <div>
            <label style={{ display: 'block', fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Categoría
            </label>
            <CategorySelector
              category={formData.category}
              onChange={(category) => setFormData(prev => ({ ...prev, category }))}
              contentType="blog"
              placeholder="Seleccionar…"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Etiquetas
            </label>
            <TagSelector
              tags={formData.tags}
              onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
              context="posts"
              placeholder="Agregar etiquetas…"
            />
          </div>
        </div>

        {/* AI Validation */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            Verificación de calidad
          </p>
          <AIValidationPanel
            status={blogValidation.status}
            result={blogValidation.result}
            error={blogValidation.error}
          />
        </div>

        {validationMessage && (
          <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: '#C4451A', marginBottom: '1rem' }}>{validationMessage}</p>
        )}

        {/* Publish button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            width: '100%', backgroundColor: '#C4451A', color: '#fff', border: 'none',
            fontFamily: SANS, fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '0.02em',
            padding: '0.875rem 2rem', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1,
          }}
        >
          {isSubmitting ? 'Publicando…' : 'Publicar post'}
        </button>
      </div>

      <AIAssistantOverlay
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        onInsertText={handleInsertText}
        contextData={{ title: formData.title, contentType: 'blog', category: formData.category }}
      />
    </div>
  );
};

export default CreateBlogPost;
