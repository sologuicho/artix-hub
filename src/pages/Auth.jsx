import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Github } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { handleGoogleAuth, handleMicrosoftAuth, handleGitHubAuth } from '../lib/auth/oauth';
import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

// ── OAuth icon buttons ──────────────────────────────────────────────────────
const OAuthButton = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-center gap-3"
    style={{
      padding: '0.75rem 1rem',
      border: '1px solid var(--border)',
      backgroundColor: 'transparent',
      color: 'var(--muted)',
      cursor: 'pointer',
      fontFamily: MONO,
      fontSize: '0.625rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      transition: 'color 0.15s, border-color 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.color = '#C4451A'; e.currentTarget.style.borderColor = '#C4451A'; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
  >
    {children}
  </button>
);

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#F25022" d="M1 1h10v10H1z"/>
    <path fill="#00A4EF" d="M13 1h10v10H13z"/>
    <path fill="#7FBA00" d="M1 13h10v10H1z"/>
    <path fill="#FFB900" d="M13 13h10v10H13z"/>
  </svg>
);

// ── Reusable field ──────────────────────────────────────────────────────────
const Field = ({ label, id, children }) => (
  <div>
    <label
      htmlFor={id}
      className="input-label"
      style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}
    >
      {label}
    </label>
    {children}
  </div>
);

// ── Auth page ───────────────────────────────────────────────────────────────
const Auth = () => {
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { login, checkAuth } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm]   = useState({ email: '', password: '', remember: false });
  const [signupForm, setSignupForm] = useState({ username: '', email: '', password: '' });
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });
  const [usernameTimeout, setUsernameTimeout] = useState(null);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const verifiedParam = searchParams.get('verified');
  const intentParam   = searchParams.get('intent');
  const isStudentIntent = intentParam === 'student';

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const msgs = {
      oauth_failed:    'La autenticación OAuth falló. Por favor, intenta de nuevo.',
      oauth_no_user:   'No se pudo obtener la información del usuario.',
      oauth_error:     'Ocurrió un error durante la autenticación.',
      oauth_cancelled: 'La autenticación fue cancelada.',
    };
    if (errorParam) setError(msgs[errorParam] || 'Ocurrió un error durante la autenticación.');
    if (isStudentIntent) setActiveTab('signup');
  }, [searchParams]);

  const checkUsername = async (username) => {
    if (!username || username.trim().length < 3) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }
    setUsernameStatus({ checking: true, available: null, message: '' });
    try {
      const res = await fetch(`${BACKEND_URL}/auth/check-username?username=${encodeURIComponent(username)}`, { credentials: 'include' });
      const data = await res.json();
      setUsernameStatus({
        checking: false,
        available: data.available ?? false,
        message: data.message || (data.available ? 'Disponible' : 'No disponible'),
      });
    } catch {
      setUsernameStatus({ checking: false, available: false, message: 'Error al verificar' });
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setSignupForm(f => ({ ...f, username: value }));
    setUsernameStatus({ checking: false, available: null, message: '' });
    if (usernameTimeout) clearTimeout(usernameTimeout);
    if (value.length >= 3) setUsernameTimeout(setTimeout(() => checkUsername(value), 300));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password }),
      });
      const data = await res.json();
      if (data.ok) {
        await checkAuth();
        navigate(data.user.profileComplete ? '/' : '/profile/setup');
      } else {
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await fetch(`${BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotSent(true);
    } catch {
      setForgotSent(true); // same message either way — don't reveal errors
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (usernameStatus.available === false || usernameStatus.checking) {
      setError('Elige un nombre de usuario válido y disponible');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();
      if (data.ok) {
        await checkAuth();
        navigate(isStudentIntent ? '/student-verification' : '/profile/setup');
      } else {
        setError(data.message || 'Error al registrar el usuario');
      }
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg)' }}>

      {/* Left panel — editorial message */}
      <div
        className="hidden lg:flex flex-col justify-between p-16 flex-1"
        style={{ backgroundColor: '#111110', borderRight: '1px solid #2E2C2A' }}
      >
        <Link
          to="/"
          style={{
            fontFamily: MONO,
            fontSize: '0.75rem',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#F0EDE8',
            textDecoration: 'none',
          }}
        >
          ARTIX
        </Link>

        <div>
          <p style={{
            fontFamily: MONO,
            fontSize: '0.5625rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#C4451A',
            marginBottom: '1.5rem',
          }}>
            Plataforma Académica
          </p>
          <h2 style={{
            fontFamily: MONO,
            fontSize: 'clamp(1.75rem, 3vw, 2.75rem)',
            color: '#F0EDE8',
            lineHeight: 1.15,
            maxWidth: '440px',
            fontWeight: 600,
          }}>
            El conocimiento que construye el futuro
          </h2>
          <p style={{
            fontFamily: SANS,
            color: '#8C8A86',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            maxWidth: '380px',
            marginTop: '1.5rem',
          }}>
            Únete a investigadores, estudiantes y profesionales de América Latina que comparten
            y construyen conocimiento en Artix Hub.
          </p>
        </div>

        <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: '#2E2C2A' }}>
          © {new Date().getFullYear()} Artix Hub
        </p>
      </div>

      {/* Right panel — form */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12"
        style={{ backgroundColor: 'var(--bg)', maxWidth: '520px', margin: '0 auto' }}
      >
        <div className="w-full" style={{ maxWidth: '400px' }}>

          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-10 transition-colors duration-150"
            style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#C4451A'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            ← Volver al inicio
          </Link>

          {/* Tab selector */}
          <div className="flex gap-0 mb-10" style={{ borderBottom: '1px solid var(--border)' }}>
            {[
              { id: 'login',  label: t('auth.login.title')  || 'Iniciar sesión' },
              { id: 'signup', label: t('auth.signup.title') || 'Crear cuenta'   },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === id ? '2px solid #C4451A' : '2px solid transparent',
                  color: activeTab === id ? 'var(--text)' : 'var(--muted)',
                  cursor: 'pointer',
                  marginBottom: '-1px',
                  paddingBottom: '0.75rem',
                  marginRight: '1.5rem',
                  fontFamily: MONO,
                  fontSize: '0.5625rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  transition: 'color 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Email verified success */}
          {verifiedParam === 'true' && (
            <div
              className="mb-6"
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #22c55e',
                color: '#22c55e',
                backgroundColor: 'transparent',
                fontFamily: SANS,
                fontSize: '0.875rem',
              }}
            >
              Correo verificado correctamente. Ya puedes iniciar sesión.
            </div>
          )}

          {/* Student intent banner */}
          {isStudentIntent && (
            <div
              className="mb-6"
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--surface)',
                borderLeft: '3px solid #C4451A',
                color: 'var(--muted)',
                lineHeight: 1.6,
                fontFamily: SANS,
                fontSize: '0.875rem',
              }}
            >
              Estás creando una cuenta para acceder al{' '}
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>plan Estudiante gratuito</span>.
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mb-6"
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #C4451A',
                color: '#C4451A',
                backgroundColor: 'transparent',
                fontFamily: SANS,
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="flex flex-col gap-2 mb-6">
            <OAuthButton onClick={handleGoogleAuth}>
              <GoogleIcon /> Continuar con Google
            </OAuthButton>
            <OAuthButton onClick={handleMicrosoftAuth}>
              <MicrosoftIcon /> Continuar con Microsoft
            </OAuthButton>
            <OAuthButton onClick={handleGitHubAuth}>
              <Github size={16} /> Continuar con GitHub
            </OAuthButton>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border)' }} />
            <span style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {t('auth.oauth.or') || 'o'}
            </span>
            <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--border)' }} />
          </div>

          {/* Login form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <Field label={t('auth.login.email') || 'Correo electrónico'} id="login-email">
                <input
                  id="login-email"
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field"
                  placeholder="tu@correo.com"
                  style={{ fontFamily: SANS }}
                />
              </Field>

              <Field label={t('auth.login.password') || 'Contraseña'} id="login-password">
                <input
                  id="login-password"
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field"
                  placeholder="••••••••"
                  style={{ fontFamily: SANS }}
                />
              </Field>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2" style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={loginForm.remember}
                    onChange={e => setLoginForm(f => ({ ...f, remember: e.target.checked }))}
                    style={{ accentColor: '#C4451A' }}
                  />
                  {t('auth.login.remember') || 'Recordarme'}
                </label>
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotSent(false); setForgotEmail(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    padding: 0,
                    fontFamily: MONO,
                    fontSize: '0.5625rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#C4451A'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  {t('auth.login.forgot') || '¿Olvidaste tu contraseña?'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
                style={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  backgroundColor: '#C4451A',
                  color: '#fff',
                  border: 'none',
                  ...(loading ? { opacity: 0.6, cursor: 'wait' } : {}),
                }}
              >
                {loading ? 'Iniciando sesión…' : (t('auth.login.submit') || 'Iniciar sesión')}
              </button>

              <p style={{ fontFamily: SANS, fontSize: '0.75rem', textAlign: 'center', color: 'var(--muted)' }}>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  style={{ color: '#C4451A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS, fontSize: '0.75rem' }}
                >
                  Regístrate
                </button>
              </p>
            </form>
          )}

          {/* Signup form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignup} className="flex flex-col gap-6">
              <Field label={t('auth.signup.username') || 'Nombre de usuario'} id="signup-username">
                <input
                  id="signup-username"
                  type="text"
                  required
                  value={signupForm.username}
                  onChange={handleUsernameChange}
                  className="input-field"
                  placeholder="tu_usuario"
                  minLength={3}
                  maxLength={20}
                  style={{
                    fontFamily: MONO,
                    ...(usernameStatus.available === true
                      ? { borderBottomColor: '#6dbf6d' }
                      : usernameStatus.available === false
                      ? { borderBottomColor: '#C4451A' }
                      : {}),
                  }}
                />
                {usernameStatus.message && (
                  <p style={{
                    marginTop: '0.25rem',
                    fontFamily: MONO,
                    fontSize: '0.5625rem',
                    letterSpacing: '0.08em',
                    color: usernameStatus.available ? '#6dbf6d' : '#C4451A',
                  }}>
                    {usernameStatus.message}
                  </p>
                )}
              </Field>

              <Field label={t('auth.signup.email') || 'Correo electrónico'} id="signup-email">
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={signupForm.email}
                  onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field"
                  placeholder="tu@correo.com"
                  style={{ fontFamily: SANS }}
                />
              </Field>

              <Field label={t('auth.signup.password') || 'Contraseña'} id="signup-password">
                <input
                  id="signup-password"
                  type="password"
                  required
                  value={signupForm.password}
                  onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))}
                  className="input-field"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  style={{ fontFamily: SANS }}
                />
              </Field>

              <button
                type="submit"
                disabled={usernameStatus.available === false || usernameStatus.checking || loading}
                className="btn btn-primary w-full"
                style={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  backgroundColor: '#C4451A',
                  color: '#fff',
                  border: 'none',
                  ...((usernameStatus.available === false || loading) ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}
              >
                {loading ? 'Registrando…' : (t('auth.signup.submit') || 'Crear cuenta')}
              </button>

              <p style={{ fontFamily: SANS, fontSize: '0.75rem', textAlign: 'center', color: 'var(--muted)' }}>
                {t('auth.signup.hasAccount') || '¿Ya tienes cuenta?'}{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  style={{ color: '#C4451A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS, fontSize: '0.75rem' }}
                >
                  {t('auth.signup.signIn') || 'Inicia sesión'}
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Forgot password modal */}
      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowForgot(false)}
        >
          <div
            className="w-full"
            style={{ maxWidth: 400, backgroundColor: 'var(--bg)', border: '1px solid var(--border)', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{
              fontFamily: MONO,
              fontSize: '0.5625rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: '0.5rem',
            }}>
              Recuperar acceso
            </p>
            <h3 style={{ fontFamily: MONO, fontSize: '1.25rem', color: 'var(--text)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Restablecer contraseña
            </h3>

            {forgotSent ? (
              <>
                <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Si ese correo está registrado, recibirás un link en los próximos minutos.
                </p>
                <button
                  onClick={() => setShowForgot(false)}
                  style={{
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
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#C4451A'; e.currentTarget.style.borderColor = '#C4451A'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  Cerrar
                </button>
              </>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4 mt-4">
                <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                  Ingresa tu correo y te enviaremos un link para crear una nueva contraseña.
                </p>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="input-field"
                  placeholder="tu@correo.com"
                  style={{ fontFamily: SANS }}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    style={{
                      flex: 1,
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
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      backgroundColor: '#C4451A',
                      color: '#fff',
                      border: 'none',
                      cursor: forgotLoading ? 'wait' : 'pointer',
                      fontFamily: SANS,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      ...(forgotLoading ? { opacity: 0.6 } : {}),
                    }}
                  >
                    {forgotLoading ? 'Enviando…' : 'Enviar link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
