import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Upload, X, ToggleLeft, ToggleRight, Sparkles, ArrowLeft, MapPin } from 'lucide-react';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';
import AIAssistantOverlay from '../components/AIAssistantOverlay';
import RichTextEditorWithMentions from '../components/RichTextEditorWithMentions';
import CollaboratorSelector from '../components/CollaboratorSelector';
import TagSelector from '../components/TagSelector';
import CategorySelector from '../components/CategorySelector';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;700&display=swap');
  .artix-editor-event .ql-toolbar {
    background-color: var(--surface);
    border: 1px solid var(--border);
    padding: 0.375rem 0;
  }
  .artix-editor-event .ql-container {
    border: 1px solid var(--border);
    border-top: none;
    background: transparent;
    font-size: 1rem;
  }
  .artix-editor-event .ql-editor {
    padding: 1rem;
    min-height: 180px;
    line-height: 1.75;
    color: var(--text);
    font-family: 'IBM Plex Sans', sans-serif;
  }
  .artix-editor-event .ql-stroke { stroke: var(--muted) !important; }
  .artix-editor-event .ql-fill { fill: var(--muted) !important; }
  .artix-editor-event .ql-picker-label { color: var(--muted) !important; }
  .artix-editor-event .ql-editor.ql-blank::before { color: var(--muted); font-style: normal; }
  .artix-editor-event .ql-toolbar button:hover .ql-stroke,
  .artix-editor-event .ql-toolbar button.ql-active .ql-stroke { stroke: var(--accent) !important; }
  .artix-editor-event .ql-toolbar button:hover .ql-fill,
  .artix-editor-event .ql-toolbar button.ql-active .ql-fill { fill: var(--accent) !important; }
  .artix-editor-event .ql-picker-options {
    background-color: var(--surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
  }
  .artix-create-input::placeholder { color: var(--muted); opacity: 1; }
`;

const STEPS = [
  { n: 1, label: 'Información básica' },
  { n: 2, label: 'Lugar y fecha' },
  { n: 3, label: 'Imagen y configuración' },
];

const CreateEvent = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  const isAdmin = user?.username === 'luisflores01';
  const [publishAsArtixResearch, setPublishAsArtixResearch] = useState(
    searchParams.get('asArtixResearch') === 'true'
  );
  const eventValidation = useAIValidation('event');
  const [validationMessage, setValidationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [hoverBanner, setHoverBanner] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    type: '',
    tags: [],
    bannerUrl: '',
    isCollaborative: false,
    maxAttendees: '',
    ticketPrice: '',
    ticketCurrency: 'MXN',
    streamUrl: '',
  });
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (isEditMode && id) {
      const fetchEvent = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/events/${id}`, { credentials: 'include' });
          const data = await response.json();
          if (data.ok && data.event) {
            const ev = data.event;
            setFormData({
              title: ev.title || '',
              description: ev.description || '',
              date: new Date(ev.date).toISOString().split('T')[0] || '',
              time: ev.time || '',
              location: ev.location || '',
              type: ev.type || '',
              tags: ev.tags || [],
              bannerUrl: ev.bannerUrl || '',
              isCollaborative: ev.isCollaborative || false,
              maxAttendees: ev.maxAttendees || '',
              ticketPrice: ev.ticketPrice || '',
              ticketCurrency: ev.ticketCurrency || 'MXN',
              streamUrl: ev.streamUrl || '',
            });
            if (ev.collaborators) setCollaborators(ev.collaborators);
          }
        } catch (err) { console.error(err); }
      };
      fetchEvent();
    }
  }, [isEditMode, id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const { compressImage } = await import('../utils/imageCompression');
        const url = await compressImage(file, 1200, 1200, 0.85);
        setFormData(prev => ({ ...prev, bannerUrl: url }));
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => setFormData(prev => ({ ...prev, bannerUrl: reader.result }));
        reader.readAsDataURL(file);
      }
    }
  };

  const handleInsertText = (text) => {
    setFormData(prev => ({ ...prev, description: prev.description + '\n\n' + text }));
  };

  const extractMentions = (html) => {
    const matches = html.match(/@(\w+)/g);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const handleNext = () => {
    if (step === 1 && !formData.title.trim()) {
      setValidationMessage('El título del evento es requerido');
      return;
    }
    setValidationMessage('');
    setStep(s => s + 1);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
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
      const url = isEditMode ? `${BACKEND_URL}/api/events/${id}` : `${BACKEND_URL}/api/events`;
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title || '',
          description: formData.description || '',
          date: new Date(formData.date + 'T' + (formData.time || '00:00')).toISOString(),
          time: formData.time || '',
          location: formData.location || '',
          type: formData.type || '',
          tags: formData.tags || [],
          bannerUrl: formData.bannerUrl || null,
          isCollaborative: formData.isCollaborative || collaborators.length > 0,
          maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
          ticketPrice: formData.ticketPrice ? parseFloat(formData.ticketPrice) : null,
          ticketCurrency: formData.ticketCurrency || 'MXN',
          streamUrl: formData.streamUrl || null,
          publishAsArtixResearch: publishAsArtixResearch && !isEditMode,
          mentions: extractMentions(formData.description),
        }),
      });
      const data = await response.json();
      if (data.ok) {
        const eventId = isEditMode ? id : data.event?.id;
        if (!isEditMode && collaborators.length > 0 && eventId) {
          const csrfToken = getCsrfToken() || '';
          for (const c of collaborators) {
            await fetch(`${BACKEND_URL}/api/events/${eventId}/collaborators`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
              credentials: 'include',
              body: JSON.stringify({ userId: c.id, role: 'collaborator' }),
            });
          }
        }
        navigate(`/events/${eventId}`);
      } else {
        setValidationMessage(data.message || 'Error al guardar el evento');
      }
    } catch (err) {
      setValidationMessage(err.message || 'Error al enviar el evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = STEPS.find(s => s.n === step);

  const fieldLabelStyle = {
    display: 'block',
    fontFamily: MONO,
    fontSize: '0.5rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: '0.5rem',
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <style>{PAGE_STYLES}</style>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 30,
        height: '44px', display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', gap: '1rem',
        backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={() => navigate('/events')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem', display: 'flex' }}
        >
          <ArrowLeft size={16} />
        </button>

        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {isEditMode ? 'Editar evento' : `Paso ${step} de 3`}
          </span>
          {!isEditMode && (
            <span style={{ fontFamily: MONO, fontSize: '0.5625rem', color: 'var(--border)', marginLeft: '0.5rem' }}>
              · {currentStep?.label}
            </span>
          )}
        </div>

        <button
          onClick={() => setIsAIPanelOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: isAIPanelOpen ? '#C4451A' : 'var(--muted)', padding: '0.25rem', display: 'flex', transition: 'color 0.15s' }}
        >
          <Sparkles size={15} />
        </button>
      </nav>

      {/* Step content */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 1.5rem 8rem' }}>

        {/* Step indicator line */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '2.5rem' }}>
          {STEPS.map(s => (
            <div
              key={s.n}
              style={{
                height: 2, flex: 1,
                backgroundColor: s.n <= step ? '#C4451A' : 'var(--border)',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>

        {/* ── Step 1: Basic info ── */}
        {step === 1 && (
          <div>
            <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Información básica
            </p>

            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Título del evento…"
              className="artix-create-input"
              style={{
                display: 'block', width: '100%',
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1.2,
                fontFamily: SANS, fontWeight: 700,
                color: 'var(--text)', marginBottom: '2rem',
                borderBottom: '1px solid var(--border)', paddingBottom: '1rem',
              }}
            />

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={fieldLabelStyle}>Tipo de evento</label>
              <CategorySelector
                category={formData.type}
                onChange={(type) => setFormData(prev => ({ ...prev, type }))}
                contentType="event"
                placeholder="Conferencia, taller, webinar…"
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Descripción</label>
              <div className="artix-editor-event">
                <RichTextEditorWithMentions
                  value={formData.description}
                  onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                  placeholder="¿De qué trata este evento? ¿A quién va dirigido?"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Date & location ── */}
        {step === 2 && (
          <div>
            <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Lugar y fecha
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label style={fieldLabelStyle}>Fecha</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="input-field"
                  style={{ fontSize: '1rem', padding: '0.75rem', fontFamily: SANS }}
                />
              </div>
              <div>
                <label style={fieldLabelStyle}>Hora</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="input-field"
                  style={{ fontSize: '1rem', padding: '0.75rem', fontFamily: SANS }}
                />
              </div>
            </div>

            <div>
              <label style={fieldLabelStyle}>Ubicación</label>
              <div style={{ position: 'relative' }}>
                <MapPin
                  size={14}
                  style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
                />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Lugar físico o URL del evento…"
                  className="input-field"
                  style={{ paddingLeft: '2.25rem', fontSize: '1rem', padding: '0.75rem 0.75rem 0.75rem 2.25rem', fontFamily: SANS }}
                />
              </div>
              <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                Puede ser una dirección, ciudad o enlace a videoconferencia
              </p>
            </div>
          </div>
        )}

        {/* ── Step 3: Banner & settings ── */}
        {step === 3 && (
          <div>
            <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              Imagen y configuración
            </p>

            {/* Banner upload */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={fieldLabelStyle}>Banner del evento</label>
              <div
                style={{
                  aspectRatio: '16/6', position: 'relative',
                  backgroundColor: 'var(--surface)', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  border: hoverBanner ? '1.5px dashed #C4451A' : '1.5px dashed var(--border)',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={() => setHoverBanner(true)}
                onMouseLeave={() => setHoverBanner(false)}
              >
                {formData.bannerUrl ? (
                  <>
                    <img src={formData.bannerUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} alt="Banner" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, bannerUrl: '' })); }}
                      style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', padding: '0.375rem', color: 'var(--muted)', display: 'flex' }}
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Upload size={22} style={{ color: 'var(--muted)', margin: '0 auto 0.5rem' }} />
                    <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      Subir portada
                    </span>
                  </div>
                )}
                <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={handleBannerChange} />
              </div>
            </div>

            {/* Capacity & Tickets */}
            <div style={{ marginBottom: '1.5rem', padding: '1.25rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                Capacidad y entradas
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={fieldLabelStyle}>Capacidad máxima</label>
                  <input
                    type="number"
                    name="maxAttendees"
                    value={formData.maxAttendees}
                    onChange={handleInputChange}
                    placeholder="Sin límite"
                    min="1"
                    className="input-field"
                    style={{ fontSize: '0.9375rem', padding: '0.625rem 0.75rem', fontFamily: SANS }}
                  />
                  <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Vacío = sin límite</p>
                </div>
                <div>
                  <label style={fieldLabelStyle}>Precio de entrada</label>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <select
                      value={formData.ticketCurrency}
                      onChange={(e) => setFormData(prev => ({ ...prev, ticketCurrency: e.target.value }))}
                      style={{
                        border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)',
                        padding: '0.625rem 0.5rem', fontSize: '0.875rem', flexShrink: 0,
                        fontFamily: MONO,
                      }}
                    >
                      <option>MXN</option>
                      <option>USD</option>
                      <option>EUR</option>
                    </select>
                    <input
                      type="number"
                      name="ticketPrice"
                      value={formData.ticketPrice}
                      onChange={handleInputChange}
                      placeholder="0 = gratis"
                      min="0"
                      step="0.01"
                      className="input-field"
                      style={{ flex: 1, fontSize: '0.9375rem', padding: '0.625rem 0.75rem', fontFamily: SANS }}
                    />
                  </div>
                  <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Se cobra vía Stripe</p>
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle}>URL del stream (opcional)</label>
                <input
                  type="url"
                  name="streamUrl"
                  value={formData.streamUrl}
                  onChange={handleInputChange}
                  placeholder="https://youtube.com/live/... o zoom link"
                  className="input-field"
                  style={{ fontSize: '0.9375rem', padding: '0.625rem 0.75rem', fontFamily: SANS }}
                />
                <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Se comparte con inscritos cuando marques el evento como EN VIVO</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={fieldLabelStyle}>Etiquetas</label>
              <TagSelector
                tags={formData.tags}
                onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                context="events"
                placeholder="Agregar etiquetas…"
              />
            </div>

            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isCollaborative: !prev.isCollaborative }))}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0,
                  fontFamily: SANS, fontSize: '0.875rem',
                }}
              >
                Evento colaborativo
                {formData.isCollaborative
                  ? <ToggleRight size={18} style={{ color: '#C4451A' }} />
                  : <ToggleLeft size={18} style={{ color: 'var(--muted)' }} />}
              </button>
              {formData.isCollaborative && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={fieldLabelStyle}>Colaboradores</label>
                  <CollaboratorSelector
                    selectedCollaborators={collaborators}
                    onSelect={(u) => setCollaborators(prev => [...prev, u])}
                    onRemove={(uid) => setCollaborators(prev => prev.filter(c => c.id !== uid))}
                    placeholder="Agregar personas…"
                  />
                </div>
              )}
            </div>

            {isAdmin && !isEditMode && (
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setPublishAsArtixResearch(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0,
                    fontFamily: SANS, fontSize: '0.875rem',
                  }}
                >
                  {publishAsArtixResearch ? 'Publicando como Artix' : 'Publicando como tú'}
                  {publishAsArtixResearch
                    ? <ToggleRight size={18} style={{ color: '#C4451A' }} />
                    : <ToggleLeft size={18} style={{ color: 'var(--muted)' }} />}
                </button>
              </div>
            )}

            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                Verificación de calidad
              </p>
              <AIValidationPanel
                status={eventValidation.status}
                result={eventValidation.result}
                error={eventValidation.error}
              />
            </div>
          </div>
        )}

        {validationMessage && (
          <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: '#C4451A', marginTop: '1rem' }}>{validationMessage}</p>
        )}
      </div>

      {/* Fixed bottom navigation */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        backgroundColor: 'var(--bg)', borderTop: '1px solid var(--border)',
      }}>
        {step > 1 ? (
          <button
            onClick={() => { setValidationMessage(''); setStep(s => s - 1); }}
            style={{
              background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
              fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '0.625rem 1.25rem', cursor: 'pointer',
            }}
          >
            ← Anterior
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            onClick={handleNext}
            style={{
              backgroundColor: '#C4451A', color: '#fff', border: 'none',
              fontFamily: SANS, fontWeight: 700, fontSize: '0.9375rem',
              padding: '0.875rem 2rem', cursor: 'pointer',
            }}
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              backgroundColor: '#C4451A', color: '#fff', border: 'none',
              fontFamily: SANS, fontWeight: 700, fontSize: '0.9375rem',
              padding: '0.875rem 2rem', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {isSubmitting ? 'Publicando…' : 'Publicar evento'}
          </button>
        )}
      </div>

      <AIAssistantOverlay
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        onInsertText={handleInsertText}
        contextData={{ title: formData.title, contentType: 'event', type: formData.type }}
      />
    </div>
  );
};

export default CreateEvent;
