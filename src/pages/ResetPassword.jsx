import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { BACKEND_URL } from '../config/client';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Link inválido. Solicita un nuevo link de restablecimiento.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      return setError('La contraseña debe tener al menos 8 caracteres.');
    }
    if (form.password !== form.confirm) {
      return setError('Las contraseñas no coinciden.');
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: form.password }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/auth'), 3000);
      } else {
        setError(data.message || 'El link es inválido o ha expirado.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full" style={{ maxWidth: 400 }}>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-wider mb-10 transition-colors duration-150"
          style={{ color: 'var(--muted)' }}
        >
          ← Volver al inicio de sesión
        </Link>

        <h1 className="font-display mb-2" style={{ fontSize: '1.75rem', color: 'var(--text)' }}>
          Nueva contraseña
        </h1>

        {success ? (
          <div>
            <p className="font-sans text-sm mt-4 mb-6" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              Contraseña actualizada correctamente. Redirigiendo al inicio de sesión…
            </p>
            <Link to="/auth" className="btn btn-primary w-full" style={{ display: 'block', textAlign: 'center' }}>
              Ir al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
            {error && (
              <div
                className="font-sans text-sm"
                style={{ padding: '0.75rem 1rem', border: '1px solid var(--accent)', color: 'var(--accent)' }}
              >
                {error}
              </div>
            )}

            <div>
              <label className="input-label">Nueva contraseña</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field"
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                disabled={!token}
              />
            </div>

            <div>
              <label className="input-label">Confirmar contraseña</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="input-field"
                placeholder="Repite tu contraseña"
                minLength={8}
                disabled={!token}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="btn btn-primary w-full"
              style={(loading || !token) ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
            >
              {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
