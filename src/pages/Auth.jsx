import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import DarkModeToggle from '../components/DarkModeToggle';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { handleGoogleAuth, handleMicrosoftAuth, handleGitHubAuth } from '../lib/auth/oauth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const Auth = () => {
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { login, checkAuth, needsProfileSetup } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check for error in URL params
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'oauth_failed':
          setError('La autenticación OAuth falló. Por favor, intenta de nuevo.');
          break;
        case 'oauth_no_user':
          setError('No se pudo obtener la información del usuario. Por favor, intenta de nuevo.');
          break;
        case 'oauth_error':
          setError('Ocurrió un error durante la autenticación. Por favor, intenta de nuevo.');
          break;
        case 'oauth_cancelled':
          setError('La autenticación fue cancelada.');
          break;
        default:
          setError('Ocurrió un error durante la autenticación.');
      }
    }
  }, [searchParams]);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    remember: false,
  });

  const [signupForm, setSignupForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    available: null,
    message: '',
  });

  // Check username availability
  const checkUsername = async (username) => {
    if (!username || username.trim().length < 3) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    setUsernameStatus({ checking: true, available: null, message: '' });

    try {
      const response = await fetch(`${BACKEND_URL}/auth/check-username?username=${encodeURIComponent(username)}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.ok) {
        setUsernameStatus({
          checking: false,
          available: data.available,
          message: data.message || (data.available ? 'Nombre de usuario disponible' : 'Este nombre de usuario no está disponible')
        });
      } else {
        setUsernameStatus({
          checking: false,
          available: false,
          message: data.message || 'Error al verificar el username'
        });
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Error al verificar el username'
      });
    }
  };

  // Debounced username check
  const [usernameTimeout, setUsernameTimeout] = useState(null);
  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setSignupForm({ ...signupForm, username: value });
    setUsernameStatus({ checking: false, available: null, message: '' });

    // Clear previous timeout
    if (usernameTimeout) {
      clearTimeout(usernameTimeout);
    }

    // Set new timeout for debounce (300ms)
    if (value.length >= 3) {
      const timeout = setTimeout(() => {
        checkUsername(value);
      }, 300);
      setUsernameTimeout(timeout);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password
        })
      });

      const data = await response.json();

      if (data.ok) {
        await checkAuth(); // Make AuthContext sync with the new session cookies
        if (!data.user.profileComplete) {
          navigate('/profile/setup');
        } else {
          navigate('/');
        }
      } else {
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (usernameStatus.available === false || usernameStatus.checking) {
      setError('Por favor elige un nombre de usuario válido y disponible');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          username: signupForm.username,
          email: signupForm.email,
          password: signupForm.password
        })
      });

      const data = await response.json();

      if (data.ok) {
        await checkAuth(); // Sync AuthContext with the new session cookies
        navigate('/profile/setup');
      } else {
        setError(data.message || 'Error al registrar el usuario');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative">
      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('nav.login') === 'Log In' ? 'Back to Home' : 'Volver al inicio'}
          </Link>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-300 ${activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
            >
              {t('auth.login.title')}
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all duration-300 ${activeTab === 'signup'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
            >
              {t('auth.signup.title')}
            </button>
          </div>
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="mt-8 space-y-6 glass-card p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            <div>
              <h2 className="text-center text-2xl font-bold text-white tracking-tight">
                {t('auth.login.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-400">
                {t('auth.login.subtitle')}
              </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.oauth.google')}
              </button>
              <button
                type="button"
                onClick={handleMicrosoftAuth}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fill="#F25022" d="M1 1h10v10H1z" />
                  <path fill="#00A4EF" d="M13 1h10v10H13z" />
                  <path fill="#7FBA00" d="M1 13h10v10H1z" />
                  <path fill="#FFB900" d="M13 13h10v10H13z" />
                </svg>
                {t('auth.oauth.microsoft')}
              </button>
              <button
                type="button"
                onClick={handleGitHubAuth}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all font-medium"
              >
                <Github className="w-5 h-5" />
                {t('auth.oauth.github')}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-black/40 text-gray-400 backdrop-blur-xl">
                  {t('auth.oauth.or')}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('auth.login.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('auth.login.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={loginForm.remember}
                  onChange={(e) => setLoginForm({ ...loginForm, remember: e.target.checked })}
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-600 rounded bg-white/5"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  {t('auth.login.remember')}
                </label>
              </div>
              <a href="#" className="text-sm font-medium text-blue-400 hover:text-blue-300">
                {t('auth.login.forgot')}
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-900/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : t('auth.login.submit')}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="mt-8 space-y-6 glass-card p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            <div>
              <h2 className="text-center text-2xl font-bold text-white tracking-tight">
                {t('auth.signup.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-400">
                {t('auth.signup.subtitle')}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.oauth.google')}
              </button>
              <button
                type="button"
                onClick={handleMicrosoftAuth}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path fill="#F25022" d="M1 1h10v10H1z" />
                  <path fill="#00A4EF" d="M13 1h10v10H13z" />
                  <path fill="#7FBA00" d="M1 13h10v10H1z" />
                  <path fill="#FFB900" d="M13 13h10v10H13z" />
                </svg>
                {t('auth.oauth.microsoft')}
              </button>
              <button
                type="button"
                onClick={handleGitHubAuth}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all font-medium"
              >
                <Github className="w-5 h-5" />
                {t('auth.oauth.github')}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-black/40 text-gray-400 backdrop-blur-xl">
                  {t('auth.oauth.or')}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="signup-username" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('auth.signup.username')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="signup-username"
                    type="text"
                    required
                    value={signupForm.username}
                    onChange={handleUsernameChange}
                    className={`w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${usernameStatus.available === true ? 'border-green-500/50' :
                      usernameStatus.available === false ? 'border-red-500/50' : 'border-white/10'
                      }`}
                    placeholder="username"
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_-]{3,20}"
                  />
                  {usernameStatus.checking && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {usernameStatus.message && (
                  <p className={`mt-2 text-sm ${usernameStatus.available === true
                    ? 'text-green-400'
                    : 'text-red-400'
                    }`}>
                    {usernameStatus.message}
                  </p>
                )}
                {signupForm.username.length > 0 && signupForm.username.length < 3 && (
                  <p className="mt-2 text-sm text-gray-400">
                    Mínimo 3 caracteres
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('auth.signup.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('auth.signup.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="signup-password"
                    type="password"
                    required
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={usernameStatus.available === false || usernameStatus.checking || loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-900/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : t('auth.signup.submit')}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                {t('auth.signup.hasAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="font-medium text-blue-400 hover:text-blue-300"
                >
                  {t('auth.signup.signIn')}
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
