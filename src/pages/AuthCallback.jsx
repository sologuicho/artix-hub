import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const success = new URLSearchParams(window.location.search).get('success');

      if (success !== 'true') {
        navigate('/auth?error=oauth_cancelled');
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/me`, { credentials: 'include' });
        const data = await res.json();

        if (res.ok && data.ok && data.user) {
          await checkAuth();
          navigate(data.user.profileComplete ? '/' : '/profile/setup');
        } else {
          navigate('/auth?error=authentication_failed');
        }
      } catch {
        navigate('/auth?error=authentication_failed');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 28,
          height: 28,
          border: '2px solid var(--border)',
          borderTopColor: '#C4451A',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />

      {/* Wordmark */}
      <p style={{
        fontFamily: MONO,
        fontSize: '0.625rem',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
        marginTop: '0.25rem',
      }}>
        ARTIX
      </p>

      {/* Status */}
      <p style={{
        fontFamily: MONO,
        fontSize: '0.5625rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
      }}>
        Verificando sesión…
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AuthCallback;
