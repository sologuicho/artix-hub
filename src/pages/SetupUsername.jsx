import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Check, X, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

const SetupUsername = () => {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();

  // Get CSRF token from cookie
  const getCsrfToken = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf') {
        return value;
      }
    }
    return null;
  };

  // Check username availability
  const checkUsername = async (value) => {
    if (!value || value.trim().length < 3) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/auth/check-username?username=${encodeURIComponent(value)}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.ok) {
        setIsAvailable(data.available);
        if (!data.available) {
          setError(data.message || 'Ese nombre de usuario no está disponible');
        } else {
          setError('');
        }
      } else {
        setIsAvailable(false);
        setError(data.message || 'Error al verificar el username');
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setIsAvailable(false);
      setError('Error al verificar el username');
    } finally {
      setIsChecking(false);
    }
  };

  // Handle username input change
  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(value);
    setError('');
    setIsAvailable(null);

    // Debounce check
    if (value.length >= 3) {
      const timeoutId = setTimeout(() => {
        checkUsername(value);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || username.trim().length < 3) {
      setError('El username debe tener al menos 3 caracteres');
      return;
    }

    if (isAvailable === false) {
      setError('Ese nombre de usuario no está disponible');
      return;
    }

    setIsSubmitting(true);

    try {
      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        throw new Error('CSRF token not found');
      }

      const response = await fetch(`${BACKEND_URL}/auth/setup-username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (data.ok) {
        // Refresh auth state
        await checkAuth();
        // Redirect to home or dashboard
        navigate('/');
      } else {
        setError(data.message || 'Error al configurar el username');
      }
    } catch (err) {
      console.error('Error setting up username:', err);
      setError('Error al configurar el username. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="glass-card p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Elige tu nombre de usuario
            </h1>
            <p className="text-gray-400">
              Este será tu nombre único en Artix Hub
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  className={`w-full pl-10 pr-10 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${isAvailable === true ? 'border-green-500/50' :
                      isAvailable === false ? 'border-red-500/50' : 'border-white/10'
                    }`}
                  placeholder="username"
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_-]{3,20}"
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {isChecking && <Loader className="w-5 h-5 text-gray-400 animate-spin" />}
                  {!isChecking && isAvailable === true && <Check className="w-5 h-5 text-green-500" />}
                  {!isChecking && isAvailable === false && <X className="w-5 h-5 text-red-500" />}
                </div>
              </div>

              {username.length > 0 && username.length < 3 && (
                <p className="mt-2 text-sm text-gray-400">
                  Mínimo 3 caracteres
                </p>
              )}

              {username.length >= 3 && isAvailable === true && (
                <p className="mt-2 text-sm text-green-400">
                  ✓ Username disponible
                </p>
              )}

              {error && (
                <p className="mt-2 text-sm text-red-400 bg-red-900/20 p-2 rounded-lg border border-red-800">
                  {error}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-500">
                Solo letras, números, guiones y guiones bajos. 3-20 caracteres.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isAvailable !== true || username.length < 3}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-900/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Configurando...' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupUsername;







