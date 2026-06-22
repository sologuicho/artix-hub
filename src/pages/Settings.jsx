import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Trash2, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config/client';

const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    const [name, value] = c.trim().split('=');
    if (name === 'csrf') return value;
  }
  return null;
};

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isOAuthUser = user?.provider && user.provider !== 'local';

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (passwords.newPass !== passwords.confirm) {
      setPasswordMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (passwords.newPass.length < 8) {
      setPasswordMsg({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass }),
      });
      const data = await res.json();
      if (data.ok) {
        setPasswordMsg({ type: 'success', text: 'Contraseña actualizada correctamente' });
        setPasswords({ current: '', newPass: '', confirm: '' });
      } else {
        setPasswordMsg({ type: 'error', text: data.message || 'Error al cambiar la contraseña' });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Error de conexión' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.username) {
      setDeleteError('El nombre de usuario no coincide');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        await logout();
        navigate('/');
      } else {
        setDeleteError(data.message || 'Error al eliminar la cuenta');
      }
    } catch {
      setDeleteError('Error de conexión');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleShow = (field) =>
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-16" style={{ maxWidth: '640px' }}>

        {/* Header */}
        <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
          <span className="category-tag">Cuenta</span>
          <h1 className="font-display mt-2" style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1.1 }}>
            Configuración de Cuenta
          </h1>
          <p className="font-sans mt-2" style={{ color: 'var(--muted)', fontSize: '0.9375rem' }}>
            Gestiona la seguridad y privacidad de tu cuenta.
          </p>
        </div>

        {/* ── Cambiar contraseña ── */}
        <section style={{ marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <Lock size={16} style={{ color: 'var(--muted)' }} />
            <h2 className="font-sans font-medium" style={{ fontSize: '1rem', color: 'var(--text)' }}>
              Cambiar Contraseña
            </h2>
          </div>

          {isOAuthUser ? (
            <div className="flex items-start gap-3 p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Shield size={16} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }} />
              <p className="font-sans text-sm" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                Tu cuenta usa <strong style={{ color: 'var(--text)' }}>{user.provider}</strong> para autenticación. El cambio de contraseña se gestiona a través de ese proveedor.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-5">
              {[
                { key: 'current', label: 'Contraseña actual' },
                { key: 'newPass', label: 'Nueva contraseña' },
                { key: 'confirm', label: 'Confirmar nueva contraseña' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="input-label">{label}</label>
                  <div className="relative">
                    <input
                      type={showPasswords[key] ? 'text' : 'password'}
                      className="input-field"
                      style={{ paddingRight: '2.75rem' }}
                      placeholder="••••••••"
                      value={passwords[key]}
                      onChange={e => setPasswords(prev => ({ ...prev, [key]: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(key)}
                      style={{
                        position: 'absolute', right: '0.75rem', top: '50%',
                        transform: 'translateY(-50%)', background: 'none', border: 'none',
                        cursor: 'pointer', color: 'var(--muted)', padding: 0,
                      }}
                    >
                      {showPasswords[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              ))}

              {passwordMsg && (
                <p
                  className="font-sans text-sm"
                  style={{ color: passwordMsg.type === 'success' ? 'var(--muted)' : 'var(--accent)' }}
                >
                  {passwordMsg.text}
                </p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex' }}
                >
                  {passwordLoading ? 'Actualizando…' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ── Eliminar cuenta ── */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Trash2 size={16} style={{ color: 'var(--muted)' }} />
            <h2 className="font-sans font-medium" style={{ fontSize: '1rem', color: 'var(--text)' }}>
              Eliminar Cuenta
            </h2>
          </div>
          <p className="font-sans text-sm mb-4" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            Al eliminar tu cuenta se borrarán permanentemente todos tus datos: artículos, investigaciones, comentarios y conexiones. Esta acción es irreversible.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="font-sans text-sm"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            Eliminar mi cuenta
          </button>
        </section>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
          onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
        >
          <div style={{
            backgroundColor: 'var(--bg)', border: '1px solid var(--border)',
            padding: '2rem', width: '100%', maxWidth: '420px',
          }}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <h3 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--text)' }}>
                ¿Eliminar cuenta?
              </h3>
            </div>
            <p className="font-sans text-sm mb-5" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              Para confirmar, escribe tu nombre de usuario:{' '}
              <strong style={{ color: 'var(--text)' }}>@{user?.username}</strong>
            </p>
            <input
              type="text"
              className="input-field mb-4"
              placeholder={user?.username}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            {deleteError && (
              <p className="font-sans text-sm mb-4" style={{ color: 'var(--accent)' }}>{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError(''); setDeleteConfirm(''); }}
                className="btn btn-ghost"
                style={{ padding: '0.75rem 1.5rem', border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirm !== user?.username}
                className="btn"
                style={{
                  backgroundColor: deleteConfirm === user?.username ? 'var(--accent)' : 'var(--surface)',
                  color: deleteConfirm === user?.username ? '#fff' : 'var(--muted)',
                  opacity: deleteLoading ? 0.5 : 1,
                  cursor: deleteLoading ? 'wait' : deleteConfirm !== user?.username ? 'not-allowed' : 'pointer',
                }}
              >
                {deleteLoading ? 'Eliminando…' : 'Eliminar permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
