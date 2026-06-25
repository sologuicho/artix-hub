import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";
const ACCENT = '#C4451A';

const SUPERIOR_TIERS = ['RESEARCHER', 'VISIONARY', 'TEAM'];

const StudentVerification = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const isAlreadyStudent = user?.subscriptionTier === 'STUDENT';
  const isSuperiorTier = user && SUPERIOR_TIERS.includes(user.subscriptionTier);

  useEffect(() => {
    // Redirect away only if it would be confusing — STUDENT goes to dashboard
    if (isAlreadyStudent) {
      sessionStorage.setItem('student_result', 'already_active');
      navigate('/', { replace: true });
    }
  }, [isAlreadyStudent, navigate]);

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
        sessionStorage.setItem('student_result', 'verified');
        navigate('/');
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
          sessionStorage.setItem('student_result', 'pending');
          navigate('/');
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

  const labelStyle = {
    display: 'block',
    fontFamily: MONO,
    fontSize: '0.5625rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: '0.5rem',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: SANS,
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const primaryBtnStyle = (disabled) => ({
    width: '100%',
    backgroundColor: ACCENT,
    color: '#fff',
    border: 'none',
    fontFamily: SANS,
    fontWeight: 700,
    fontSize: '0.9375rem',
    padding: '0.875rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.15s',
  });

  // Already has a superior plan — show message in place of the form
  if (isSuperiorTier) {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '6rem 1.5rem', minHeight: '100vh' }}>
        <span style={{
          fontFamily: MONO,
          fontSize: '0.5625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}>
          Plan Estudiante
        </span>
        <h1 style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: '2rem',
          color: 'var(--text)',
          marginTop: '0.375rem',
          marginBottom: 0,
        }}>
          Ya tienes un plan superior
        </h1>
        <p style={{ fontFamily: SANS, color: 'var(--muted)', lineHeight: 1.7, marginTop: '1rem' }}>
          Tu plan actual incluye todas las funciones del plan Estudiante y más. No necesitas verificar tu estatus estudiantil.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-block',
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--text)',
            fontFamily: SANS,
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Ir al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '4rem 1.5rem', minHeight: '100vh' }}>

      {/* Header */}
      <span style={{
        fontFamily: MONO,
        fontSize: '0.5625rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
      }}>
        Plan Estudiante
      </span>
      <h1 style={{
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: '2rem',
        color: 'var(--text)',
        lineHeight: 1.15,
        marginTop: '0.375rem',
        marginBottom: 0,
      }}>
        Verifica tu estatus estudiantil
      </h1>
      <p style={{ fontFamily: SANS, color: 'var(--muted)', lineHeight: 1.7, marginTop: '0.75rem' }}>
        Una vez verificado, tu cuenta tendrá acceso gratuito a todo lo del plan Miembro — publicar artículos, investigaciones y el asistente de escritura con IA.
      </p>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '2.5rem', marginBottom: '2.5rem' }}>
        {[
          { n: 1, label: 'Email institucional' },
          { n: 2, label: 'Credencial' },
        ].map(({ n, label }, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {i > 0 && (
              <span style={{ color: 'var(--border)', fontFamily: MONO, fontSize: '0.75rem' }}>—</span>
            )}
            <div style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${step === n ? ACCENT : 'var(--border)'}`,
              color: step === n ? ACCENT : 'var(--muted)',
              fontFamily: MONO,
              fontSize: '0.75rem',
              flexShrink: 0,
            }}>
              {n}
            </div>
            <span style={{
              fontFamily: MONO,
              fontSize: '0.5625rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: step === n ? 'var(--text)' : 'var(--muted)',
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          backgroundColor: 'var(--surface)',
          borderLeft: `3px solid ${ACCENT}`,
          padding: '0.875rem 1rem',
          fontFamily: SANS,
          fontSize: '0.875rem',
          color: ACCENT,
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {/* Step 1 — institutional email */}
      {step === 1 && (
        <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Email institucional</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@universidad.edu.mx"
              style={inputStyle}
              autoFocus
            />
            <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
              Dominios aceptados: .edu, .edu.mx, .unam.mx, .ipn.mx, .itesm.mx, .tecnm.mx y más.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            style={primaryBtnStyle(loading || !email)}
          >
            {loading ? 'Verificando…' : 'Verificar email'}
          </button>

          <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0.25rem 0' }} />

          <button
            type="button"
            onClick={() => { setStep(2); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: 0,
              fontFamily: SANS,
              fontSize: '0.875rem',
              textAlign: 'left',
            }}
          >
            No tengo email institucional →
          </button>
        </form>
      )}

      {/* Step 2 — document upload */}
      {step === 2 && (
        <form onSubmit={handleDocumentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            Sube una foto de tu credencial estudiantil o constancia de estudios vigente.
          </p>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('sv-file').click()}
            style={{
              border: `2px dashed ${dragOver ? ACCENT : 'var(--border)'}`,
              aspectRatio: '4/3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: 'var(--surface)',
              overflow: 'hidden',
              transition: 'border-color 0.15s',
            }}
          >
            {preview && file?.type.startsWith('image/') ? (
              <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : file ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ fontFamily: MONO, fontSize: '0.75rem', textTransform: 'uppercase', color: ACCENT }}>PDF</p>
                <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--text)', marginTop: '0.5rem' }}>{file.name}</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)' }}>
                  Arrastra aquí o haz clic para seleccionar
                </p>
                <p style={{ fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: '0.5rem' }}>
                  JPG · PNG · PDF &nbsp;·&nbsp; Máx. 5 MB
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
            style={primaryBtnStyle(loading || !file)}
          >
            {loading ? 'Enviando…' : 'Enviar solicitud'}
          </button>

          <button
            type="button"
            onClick={() => { setStep(1); setError(''); setFile(null); setPreview(null); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: 0,
              fontFamily: SANS,
              fontSize: '0.875rem',
              textAlign: 'left',
            }}
          >
            ← Tengo email institucional
          </button>
        </form>
      )}
    </div>
  );
};

export default StudentVerification;
