import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FloatingActionButton from '../components/FloatingActionButton';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const getCsrfToken = () => {
  for (const c of document.cookie.split(';')) {
    const [k, v] = c.trim().split('=');
    if (k === 'csrf') return v;
  }
  return null;
};

const UnverifiedBanner = () => {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="font-sans text-xs text-center"
      style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0.5rem 1rem',
        color: 'var(--muted)',
      }}
    >
      {sent ? (
        'Email de verificación enviado. Revisa tu bandeja de entrada.'
      ) : (
        <>
          Verifica tu correo electrónico para acceder a todas las funciones.{' '}
          <button
            onClick={resend}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, font: 'inherit' }}
          >
            {loading ? 'Enviando…' : 'Reenviar email'}
          </button>
        </>
      )}
    </div>
  );
};

const Layout = () => {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const showBanner = isAuthenticated() && user && user.emailVerified === false;
  // Hide Layout chrome on the public home page so it can render its own full-page design
  const isPublicHome = pathname === '/' && !isAuthenticated();

  return (
    <div className="min-h-screen transition-colors duration-300 flex flex-col">
      {!isPublicHome && <Header />}
      {!isPublicHome && showBanner && <UnverifiedBanner />}
      <main className="flex-grow relative">
        <Outlet />
        {!isPublicHome && <FloatingActionButton />}
      </main>
      {!isPublicHome && <Footer />}
    </div>
  );
};

export default Layout;

