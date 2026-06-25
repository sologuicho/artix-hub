import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Check, X, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";
const ACCENT = '#C4451A';

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

  const inputBorderColor = isAvailable === true
    ? ACCENT
    : isAvailable === false
    ? '#ef4444'
    : 'var(--border)';

  const isDisabled = isSubmitting || isAvailable !== true || username.length < 3;

  return (
    <div style={{
      backgroundColor: 'var(--bg)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>

        {/* Card */}
        <div style={{
          padding: '2.5rem',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}>
          {/* Section tag */}
          <span style={{
            fontFamily: MONO,
            fontSize: '0.5625rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}>
            Cuenta
          </span>

          <h1 style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: '1.75rem',
            color: 'var(--text)',
            lineHeight: 1.15,
            marginTop: '0.375rem',
            marginBottom: '0.5rem',
          }}>
            Elige tu nombre de usuario
          </h1>
          <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '2rem' }}>
            Este será tu nombre único en Artix Hub
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label
                htmlFor="username"
                style={{
                  display: 'block',
                  fontFamily: MONO,
                  fontSize: '0.5625rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: '0.5rem',
                }}
              >
                Nombre de usuario
              </label>

              <div style={{ position: 'relative' }}>
                <User
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted)',
                  }}
                />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingLeft: '2.25rem',
                    paddingRight: '2.25rem',
                    backgroundColor: 'var(--bg)',
                    border: `1px solid ${inputBorderColor}`,
                    color: 'var(--text)',
                    fontFamily: SANS,
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  placeholder="username"
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_-]{3,20}"
                  required
                />
                <div style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}>
                  {isChecking && (
                    <Loader
                      size={14}
                      style={{ color: 'var(--muted)', animation: 'spin 0.8s linear infinite' }}
                    />
                  )}
                  {!isChecking && isAvailable === true && (
                    <Check size={14} style={{ color: ACCENT }} />
                  )}
                  {!isChecking && isAvailable === false && (
                    <X size={14} style={{ color: '#ef4444' }} />
                  )}
                </div>
              </div>

              {/* Feedback messages */}
              {username.length > 0 && username.length < 3 && (
                <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                  Mínimo 3 caracteres
                </p>
              )}
              {username.length >= 3 && isAvailable === true && (
                <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: ACCENT, marginTop: '0.5rem' }}>
                  Username disponible
                </p>
              )}
              {error && (
                <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: '#ef4444', marginTop: '0.5rem' }}>
                  {error}
                </p>
              )}
              <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                Solo letras, números, guiones y guiones bajos. 3–20 caracteres.
              </p>
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              style={{
                width: '100%',
                backgroundColor: ACCENT,
                color: '#fff',
                border: 'none',
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: '0.9375rem',
                padding: '0.875rem',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {isSubmitting ? 'Configurando…' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SetupUsername;
