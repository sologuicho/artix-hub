import { useNavigate } from 'react-router-dom';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      backgroundColor: 'var(--bg)', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '0 1.5rem',
    }}>
      <p style={{
        fontFamily: MONO,
        fontSize: 'clamp(5rem, 20vw, 10rem)',
        color: 'var(--muted)', lineHeight: 1, marginBottom: '1.5rem',
      }}>
        404
      </p>

      <h1 style={{
        fontFamily: SANS, fontWeight: 700,
        fontSize: 'clamp(1.25rem, 3vw, 2rem)',
        color: 'var(--text)', marginBottom: '0.75rem',
      }}>
        Esta página no existe
      </h1>

      <p style={{
        fontFamily: SANS, fontSize: '0.9375rem',
        color: 'var(--muted)', maxWidth: 380,
        lineHeight: 1.7, marginBottom: '2.5rem',
      }}>
        El contenido que buscas fue movido o eliminado.
      </p>

      <button
        onClick={() => navigate('/')}
        style={{
          fontFamily: SANS, fontSize: '0.6875rem', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          backgroundColor: '#C4451A', color: '#fff',
          border: 'none', padding: '0.75rem 2rem',
          cursor: 'pointer', transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      >
        Volver al inicio
      </button>
    </div>
  );
};

export default NotFound;
