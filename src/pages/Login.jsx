import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DarkModeToggle from '../components/DarkModeToggle';

const Login = () => {
  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider"
            style={{ color: 'var(--muted)', textDecoration: 'none' }}
          >
            <ArrowLeft size={13} /> Volver al inicio
          </Link>
          <DarkModeToggle />
        </div>

        <h2 className="font-display mb-1" style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1.15 }}>
          Iniciar sesión
        </h2>
        <p className="font-sans text-sm mb-8" style={{ color: 'var(--muted)' }}>
          Accede a artículos y contenido exclusivo
        </p>

        <form className="flex flex-col gap-5" style={{ padding: '2rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div>
            <label htmlFor="email" className="input-label">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field"
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="input-label">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 font-sans text-sm" style={{ color: 'var(--muted)', cursor: 'pointer' }}>
              <input id="remember-me" name="remember-me" type="checkbox" />
              Recordarme
            </label>
            <a href="#" className="font-sans text-sm" style={{ color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Iniciar sesión
          </button>

          <p className="font-sans text-sm text-center" style={{ color: 'var(--muted)' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/" style={{ color: 'var(--text)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;

