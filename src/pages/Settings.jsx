import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Trash2, Eye, EyeOff, Shield, AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PremiumPageLayout from '../components/layout/PremiumPageLayout';
import { motion, AnimatePresence } from 'framer-motion';

import { BACKEND_URL } from '../config/client';

const getCsrfToken = () => {
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    const [name, value] = c.trim().split('=');
    if (name === 'csrf') return value;
  }
  return null;
};

const Toast = ({ message, type }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 20, scale: 0.95 }}
    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium ${
      type === 'success'
        ? 'bg-green-500/10 border-green-500/20 text-green-400'
        : 'bg-red-500/10 border-red-500/20 text-red-400'
    }`}
  >
    {type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
    {message}
  </motion.div>
);

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Password change state
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      showToast('Las contraseñas nuevas no coinciden', 'error');
      return;
    }
    if (passwords.newPass.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Contraseña actualizada correctamente');
        setPasswords({ current: '', newPass: '', confirm: '' });
      } else {
        showToast(data.message || 'Error al cambiar la contraseña', 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.username) {
      showToast('El nombre de usuario no coincide', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.ok) {
        await logout();
        navigate('/');
      } else {
        showToast(data.message || 'Error al eliminar la cuenta', 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const toggleShow = (field) =>
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));

  const fieldClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all text-sm";

  const isOAuthUser = user?.provider && user.provider !== 'local';

  return (
    <PremiumPageLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Configuración de Cuenta</h1>
          <p className="text-gray-400 mt-1.5 text-sm">Gestiona la seguridad y privacidad de tu cuenta</p>
        </div>

        {/* Change Password */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Lock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Cambiar Contraseña</h2>
              <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
            </div>
          </div>

          {isOAuthUser ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
              <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-300/80">
                Tu cuenta usa <strong>{user.provider}</strong> para autenticación. El cambio de contraseña se gestiona a través de ese proveedor.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {[
                { key: 'current', label: 'Contraseña actual', placeholder: '••••••••' },
                { key: 'newPass', label: 'Nueva contraseña', placeholder: '••••••••' },
                { key: 'confirm', label: 'Confirmar nueva contraseña', placeholder: '••••••••' }
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
                  <div className="relative">
                    <input
                      type={showPasswords[key] ? 'text' : 'password'}
                      className={fieldClass + ' pr-11'}
                      placeholder={placeholder}
                      value={passwords[key]}
                      onChange={e => setPasswords(prev => ({ ...prev, [key]: e.target.value }))}
                      required
                    />
                    <button type="button" onClick={() => toggleShow(key)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                      {showPasswords[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
              >
                {passwordLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          )}
        </motion.section>

        {/* Delete Account */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Eliminar Cuenta</h2>
              <p className="text-xs text-gray-500">Esta acción es permanente e irreversible</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Al eliminar tu cuenta se borrarán permanentemente todos tus datos, incluyendo artículos, investigaciones, comentarios y conexiones.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 font-medium text-sm transition-all"
          >
            Eliminar mi cuenta
          </button>
        </motion.section>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f17] border border-white/10 rounded-2xl p-8 max-w-md w-full space-y-5"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-xl font-bold text-white">¿Eliminar cuenta?</h3>
              </div>
              <p className="text-sm text-gray-400">
                Para confirmar, escribe tu nombre de usuario: <strong className="text-white">@{user?.username}</strong>
              </p>
              <input
                type="text"
                className={fieldClass}
                placeholder={user?.username}
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirm !== user?.username}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-all disabled:opacity-40"
                >
                  {deleteLoading ? 'Eliminando...' : 'Eliminar permanentemente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </PremiumPageLayout>
  );
};

export default Settings;
