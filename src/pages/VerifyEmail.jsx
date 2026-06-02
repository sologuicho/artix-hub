import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { BACKEND_URL } from '../config/client';
import { useAuth } from '../context/AuthContext';

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

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 440, width: '100%', padding: '2.5rem', textAlign: 'center' }}>

        {status === 'loading' && (
          <>
            <Loader size={40} style={{ color: 'var(--accent)', margin: '0 auto 1.5rem', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p className="font-sans" style={{ color: 'var(--muted)' }}>Verificando tu correo…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} style={{ color: '#ef4444', margin: '0 auto 1.5rem' }} />
            <h1 className="font-display mb-3" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
              Link inválido
            </h1>
            <p className="font-sans mb-6" style={{ color: 'var(--muted)' }}>
              {errorMessages[errorType] || 'El link de verificación no es válido.'}
            </p>
            {isAuthenticated() && (
              <button
                onClick={handleResend}
                disabled={resendState !== 'idle'}
                className="btn btn-outline"
                style={{ width: '100%' }}
              >
                {resendState === 'loading' ? 'Enviando…' : resendState === 'sent' ? 'Email enviado' : 'Reenviar email de verificación'}
              </button>
            )}
            <Link
              to="/"
              className="font-sans text-sm"
              style={{ display: 'block', marginTop: '1.5rem', color: 'var(--muted)' }}
            >
              Volver al inicio
            </Link>
          </>
        )}

        {status === 'idle' && !token && (
          <>
            <h1 className="font-display mb-3" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
              Verifica tu correo
            </h1>
            <p className="font-sans mb-6" style={{ color: 'var(--muted)' }}>
              Te enviamos un link de verificación a tu correo. Haz clic en él para activar tu cuenta.
            </p>
            {isAuthenticated() && (
              <button
                onClick={handleResend}
                disabled={resendState !== 'idle'}
                className="btn btn-outline"
                style={{ width: '100%' }}
              >
                {resendState === 'loading' ? 'Enviando…' : resendState === 'sent' ? 'Email enviado' : 'Reenviar email'}
              </button>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default VerifyEmail;
