import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

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
      <div
        style={{
          width: 28,
          height: 28,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p className="font-sans text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        Verificando sesión…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AuthCallback;
