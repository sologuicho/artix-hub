import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { BACKEND_URL } from '../config/client';
import { useAuth } from '../context/AuthContext';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const getCsrfToken = () => {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === 'csrf') return v;
  }
  return null;
};

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorType, setErrorType] = useState(null);
  const [resendState, setResendState] = useState('idle'); // idle | loading | sent

  const token = searchParams.get('token');
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (errorParam) {
      setStatus('error');
      setErrorType(errorParam);
      return;
    }
    if (!token) {
      setStatus('idle');
      return;
    }
    setStatus('loading');
    // The backend redirects, so a direct token on this page means the redirect didn't happen.
    // We display a helpful fallback — actual verification happens via the GET redirect.
    window.location.href = `${BACKEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
  }, [token, errorParam]);

  const handleResend = async () => {
    if (!isAuthenticated()) return;
    setResendState('loading');
    try {
      const res = await fetch(`${BACKEND_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await res.json();
      setResendState(data.ok ? 'sent' : 'idle');
    } catch {
      setResendState('idle');
    }
  };

  const errorMessages = {
    missing_token: 'El link no contiene un token de verificación.',
    invalid_token: 'El link es inválido o ha expirado.',
    server_error: 'Error interno del servidor. Intenta de nuevo.',
  };

  // Shared outline button style
  const outlineBtn = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontFamily: MONO,
    fontSize: '0.5625rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    transition: 'color 0.15s, border-color 0.15s',
  };

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 440, width: '100%', padding: '2.5rem', textAlign: 'center' }}>

        {/* Loading state */}
        {status === 'loading' && (
          <>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <Loader
              size={36}
              style={{ color: '#C4451A', margin: '0 auto 1.5rem', animation: 'spin 0.8s linear infinite' }}
            />
            <p style={{
              fontFamily: MONO,
              fontSize: '0.5625rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}>
              Verificando tu correo…
            </p>
          </>
        )}

        {/* Error state */}
        {status === 'error' && (
          <>
            <XCircle size={36} style={{ color: '#ef4444', margin: '0 auto 1.5rem' }} />
            <p style={{
              fontFamily: MONO,
              fontSize: '0.5625rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#ef4444',
              marginBottom: '0.75rem',
            }}>
              Error de verificación
            </p>
            <h1 style={{ fontFamily: MONO, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 600, marginBottom: '0.75rem' }}>
              Link inválido
            </h1>
            <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {errorMessages[errorType] || 'El link de verificación no es válido.'}
            </p>
            {isAuthenticated() && (
              <button
                onClick={handleResend}
                disabled={resendState !== 'idle'}
                style={{
                  ...outlineBtn,
                  ...(resendState !== 'idle' ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
                onMouseEnter={e => { if (resendState === 'idle') { e.currentTarget.style.color = '#C4451A'; e.currentTarget.style.borderColor = '#C4451A'; } }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                {resendState === 'loading'
                  ? 'Enviando…'
                  : resendState === 'sent'
                  ? 'Email enviado'
                  : 'Reenviar email de verificación'}
              </button>
            )}
            <Link
              to="/"
              style={{
                display: 'block',
                marginTop: '1.5rem',
                fontFamily: MONO,
                fontSize: '0.5625rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#C4451A'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              Volver al inicio
            </Link>
          </>
        )}

        {/* Idle / no token state — waiting for user to click email link */}
        {status === 'idle' && !token && (
          <>
            <p style={{
              fontFamily: MONO,
              fontSize: '0.5625rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#C4451A',
              marginBottom: '0.75rem',
            }}>
              Verificación de correo
            </p>
            <h1 style={{ fontFamily: MONO, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 600, marginBottom: '0.75rem' }}>
              Verifica tu correo
            </h1>
            <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Te enviamos un link de verificación a tu correo. Haz clic en él para activar tu cuenta.
            </p>
            {isAuthenticated() && (
              <button
                onClick={handleResend}
                disabled={resendState !== 'idle'}
                style={{
                  ...outlineBtn,
                  ...(resendState !== 'idle' ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
                onMouseEnter={e => { if (resendState === 'idle') { e.currentTarget.style.color = '#C4451A'; e.currentTarget.style.borderColor = '#C4451A'; } }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                {resendState === 'loading'
                  ? 'Enviando…'
                  : resendState === 'sent'
                  ? 'Email enviado'
                  : 'Reenviar email'}
              </button>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default VerifyEmail;
