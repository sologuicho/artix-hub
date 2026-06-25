import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Link inválido. Solicita un nuevo link de restablecimiento.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      return setError('La contraseña debe tener al menos 8 caracteres.');
    }
    if (form.password !== form.confirm) {
      return setError('Las contraseñas no coinciden.');
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: form.password }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/auth'), 3000);
      } else {
        setError(data.message || 'El link es inválido o ha expirado.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="w-full" style={{ maxWidth: 400 }}>

        {/* Back link */}
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 mb-10 transition-colors duration-150"
          style={{
            fontFamily: MONO,
            fontSize: '0.5625rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            textDecoration: 'none',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#C4451A'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          ← Volver al inicio de sesión
        </Link>

        {/* Heading */}
        <p style={{
          fontFamily: MONO,
          fontSize: '0.5625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#C4451A',
          marginBottom: '0.5rem',
        }}>
          Seguridad de cuenta
        </p>
        <h1 style={{ fontFamily: MONO, fontSize: '1.75rem', color: 'var(--text)', fontWeight: 600, marginBottom: '0.25rem' }}>
          Nueva contraseña
        </h1>

        {success ? (
          <div style={{ marginTop: '1.5rem' }}>
            {/* Success indicator */}
            <div style={{
              padding: '0.75rem 1rem',
              borderLeft: '3px solid #22c55e',
              backgroundColor: 'var(--surface)',
              marginBottom: '1.5rem',
            }}>
              <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: '0.25rem' }}>
                Contraseña actualizada
              </p>
              <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                Contraseña actualizada correctamente. Redirigiendo al inicio de sesión…
              </p>
            </div>
            <Link
              to="/auth"
              style={{
                display: 'block',
                textAlign: 'center',
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#C4451A',
                color: '#fff',
                textDecoration: 'none',
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: '0.9375rem',
              }}
            >
              Ir al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" style={{ marginTop: '1.5rem' }}>
            {/* Error banner */}
            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                border: '1px solid #C4451A',
                color: '#C4451A',
                fontFamily: SANS,
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            {/* Password field */}
            <div>
              <label
                className="input-label"
                style={{
                  fontFamily: MONO,
                  fontSize: '0.5625rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field"
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                disabled={!token}
                style={{ fontFamily: SANS }}
              />
            </div>

            {/* Confirm field */}
            <div>
              <label
                className="input-label"
                style={{
                  fontFamily: MONO,
                  fontSize: '0.5625rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="input-field"
                placeholder="Repite tu contraseña"
                minLength={8}
                disabled={!token}
                style={{ fontFamily: SANS }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !token}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#C4451A',
                color: '#fff',
                border: 'none',
                cursor: loading || !token ? 'not-allowed' : 'pointer',
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: '0.9375rem',
                transition: 'opacity 0.15s',
                ...(loading || !token ? { opacity: 0.6 } : {}),
              }}
            >
              {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
