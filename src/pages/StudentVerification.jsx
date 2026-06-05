import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const StudentVerification = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // null | 'auto' | 'pending'
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (user?.subscriptionTier === 'STUDENT') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const getCsrf = () =>
    document.cookie.split('; ').find(r => r.startsWith('csrf='))?.split('=')[1] || '';

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/student/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        credentials: 'include',
        body: JSON.stringify({ institutionalEmail: email }),
      });
      const data = await res.json();
      if (res.ok && data.autoApproved) {
        await refreshUser?.();
        setDone('auto');
      } else {
        setError(data.message || 'Error al verificar el email.');
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (f) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('El archivo no puede superar 5 MB.'); return; }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(f.type)) {
      setError('Solo se aceptan JPG, PNG o PDF.');
      return;
    }
    setFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Selecciona un archivo.'); return; }
    setError('');
    setLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (ev) => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/student/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
          credentials: 'include',
          body: JSON.stringify({ documentBase64: ev.target.result, documentMimeType: file.type }),
        });
        const data = await res.json();
        if (res.ok) {
          setDone('pending');
        } else {
          setError(data.message || 'Error al enviar la solicitud.');
        }
      } catch {
        setError('Error de conexión.');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setError('Error al leer el archivo.'); setLoading(false); };
  };

  if (done === 'auto') {
    return (
      <div className="site-container py-24" style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 480 }}>
          <span className="category-tag">Verificación</span>
          <h1 className="font-display mt-2" style={{ fontSize: '2rem', color: 'var(--text)' }}>
            Plan Estudiante activo
          </h1>
          <p className="font-sans mt-4" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            Tu email institucional fue verificado. Ya tienes acceso completo para publicar artículos,
            investigaciones y usar el asistente de escritura con IA.
          </p>
          <Link to="/" className="btn btn-primary mt-8 inline-block">
            Ir al Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  if (done === 'pending') {
    return (
      <div className="site-container py-24" style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 480 }}>
          <span className="category-tag">Verificación</span>
          <h1 className="font-display mt-2" style={{ fontSize: '2rem', color: 'var(--text)' }}>
            Solicitud enviada
          </h1>
          <p className="font-sans mt-4" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            Revisaremos tu documento en 24–48 horas. Te notificaremos por email cuando tu plan Estudiante esté activo.
          </p>
          <Link to="/" className="btn btn-outline mt-8 inline-block">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="site-container py-16" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 520 }}>
        <span className="category-tag">Plan Estudiante</span>
        <h1 className="font-display mt-2" style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1.15 }}>
          Verifica que eres estudiante
        </h1>
        <p className="font-sans mt-3 mb-12" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
          Obtén acceso gratuito para publicar y colaborar.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-10">
          {[1, 2].map(n => (
            <div key={n} className="flex items-center gap-3">
              <div
                style={{
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${step === n ? 'var(--accent)' : 'var(--border)'}`,
                  color: step === n ? 'var(--accent)' : 'var(--muted)',
                  fontSize: '0.75rem', fontFamily: 'var(--font-mono)',
                }}
              >
                {n}
              </div>
              <span className="font-sans text-xs uppercase tracking-wider" style={{ color: step === n ? 'var(--text)' : 'var(--muted)' }}>
                {n === 1 ? 'Email institucional' : 'Credencial'}
              </span>
              {n < 2 && <span style={{ color: 'var(--border)', margin: '0 0.25rem' }}>—</span>}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 font-sans text-sm" style={{ color: 'var(--accent)', padding: '0.75rem', border: '1px solid var(--accent)' }}>
            {error}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5">
            <div>
              <label className="input-label">Email institucional</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@universidad.edu.mx"
                className="input-field mt-1"
                autoFocus
              />
              <p className="font-sans text-xs mt-2" style={{ color: 'var(--muted)' }}>
                Dominios aceptados: .edu, .edu.mx, .unam.mx, .ipn.mx, .itesm.mx, .tecnm.mx y más.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="btn btn-primary w-full"
            >
              {loading ? 'Verificando…' : 'Verificar email'}
            </button>

            <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0.5rem 0' }} />

            <button
              type="button"
              onClick={() => { setStep(2); setError(''); }}
              className="font-sans text-sm text-left transition-colors"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
            >
              No tengo email institucional →
            </button>
          </form>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <form onSubmit={handleDocumentSubmit} className="flex flex-col gap-5">
            <p className="font-sans text-sm" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
              Sube una foto de tu credencial estudiantil o constancia de estudios vigente.
            </p>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById('sv-file').click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                aspectRatio: '4/3',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--surface)',
                overflow: 'hidden',
                position: 'relative',
                transition: 'border-color 0.15s',
              }}
            >
              {preview && file?.type.startsWith('image/') ? (
                <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : file ? (
                <div className="text-center p-6">
                  <p className="font-mono text-xs uppercase" style={{ color: 'var(--accent)' }}>PDF</p>
                  <p className="font-sans text-sm mt-2" style={{ color: 'var(--text)' }}>{file.name}</p>
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="font-sans text-sm" style={{ color: 'var(--muted)' }}>
                    Arrastra aquí o haz clic para seleccionar
                  </p>
                  <p className="font-sans text-xs mt-2" style={{ color: 'var(--muted)' }}>
                    JPG, PNG o PDF · Máx. 5 MB
                  </p>
                </div>
              )}
              <input
                id="sv-file"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                style={{ display: 'none' }}
                onChange={e => handleFileSelect(e.target.files[0])}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="btn btn-primary w-full"
            >
              {loading ? 'Enviando…' : 'Enviar solicitud'}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setError(''); setFile(null); setPreview(null); }}
              className="font-sans text-sm text-left transition-colors"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
            >
              ← Tengo email institucional
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default StudentVerification;
