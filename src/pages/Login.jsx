import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DarkModeToggle from '../components/DarkModeToggle';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const Login = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>

        {/* Top nav */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="flex items-center gap-2"
            style={{
              fontFamily: MONO,
              fontSize: '0.5625rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#C4451A'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            <ArrowLeft size={13} /> Volver al inicio
          </Link>
          <DarkModeToggle />
        </div>

        {/* Heading */}
        <p style={{
          fontFamily: MONO,
          fontSize: '0.5625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#C4451A',
          marginBottom: '0.5rem',
        }}>
          Acceso
        </p>
        <h2 style={{ fontFamily: MONO, fontSize: '2rem', color: 'var(--text)', lineHeight: 1.15, fontWeight: 600, marginBottom: '0.25rem' }}>
          Iniciar sesión
        </h2>
        <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '2rem' }}>
          Accede a artículos y contenido exclusivo
        </p>

        {/* Form card */}
        <form
          className="flex flex-col gap-5"
          style={{ padding: '2rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <label
              htmlFor="email"
              className="input-label"
              style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field"
              placeholder="tu@correo.com"
              style={{ fontFamily: SANS }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="input-label"
              style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input-field"
              placeholder="••••••••"
              style={{ fontFamily: SANS }}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2" style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer' }}>
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                style={{ accentColor: '#C4451A' }}
              />
              Recordarme
            </label>
            <a
              href="#"
              style={{
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
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: '#C4451A',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: '0.9375rem',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Iniciar sesión
          </button>

          <p style={{ fontFamily: SANS, fontSize: '0.75rem', textAlign: 'center', color: 'var(--muted)' }}>
            ¿No tienes cuenta?{' '}
            <Link
              to="/"
              style={{ color: '#C4451A', textDecoration: 'none', fontFamily: SANS, fontSize: '0.75rem' }}
            >
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
