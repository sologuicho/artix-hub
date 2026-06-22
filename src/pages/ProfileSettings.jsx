import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { compressImage, getFileSizeMB, formatFileSize } from '../utils/imageCompression';
import CountrySelector from '../components/CountrySelector';
import OccupationSelector from '../components/OccupationSelector';
import TagSelector from '../components/TagSelector';
import { BACKEND_URL } from '../config/client';

const ProfileSettings = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    bio: '',
    occupation: '',
    country: '',
    interests: [],
  });
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const nameParts = (user.name || '').trim().split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts.pop() : '';
      const firstName = nameParts.join(' ');
      setFormData({
        firstName,
        lastName,
        username: user.username || '',
        bio: user.bio || '',
        occupation: user.occupation || '',
        country: user.country || '',
        interests: user.interests || [],
      });
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileSizeMB = getFileSizeMB(file);
    if (fileSizeMB > 10) {
      alert(`La imagen es muy grande (${formatFileSize(fileSizeMB)}). Selecciona una imagen más pequeña.`);
      return;
    }
    try {
      const compressed = await compressImage(file, 800, 800, 0.85);
      setAvatarPreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const getCsrfToken = () => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf') return value;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let avatarToSend;
      if (avatarPreview && avatarPreview !== user?.avatar) {
        avatarToSend = avatarPreview;
      } else if (!avatarPreview && user?.avatar) {
        avatarToSend = user.avatar;
      }

      const payload = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        username: formData.username,
        bio: formData.bio,
        occupation: formData.occupation,
        country: formData.country,
        interests: formData.interests,
        profileComplete: true,
      };
      if (avatarToSend !== undefined) payload.avatar = avatarToSend;

      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || '',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        if (updateUser) updateUser(data.user);
        navigate('/profile');
      } else {
        throw new Error(data.message || 'Error al actualizar el perfil');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div className="site-container py-16" style={{ maxWidth: '680px' }}>
          <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
            <span className="category-tag">Cuenta</span>
            <h1 className="font-display mt-2" style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1.1 }}>
              Configuración de Perfil
            </h1>
          </div>

          {error && (
            <p className="font-sans text-sm mb-6" style={{ color: 'var(--accent)' }}>{error}</p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">

            {/* Avatar */}
            <div>
              <label className="input-label">Foto de Perfil</label>
              <p className="font-sans text-xs mb-3" style={{ color: 'var(--muted)' }}>
                Recomendado: imágenes de 2-3 MB o menos. Se comprimirán automáticamente.
              </p>
              <div className="flex items-center gap-4">
                <div style={{
                  width: 80, height: 80,
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Vista previa"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="font-display" style={{ fontSize: '1.5rem', color: 'var(--muted)' }}>
                      {(formData.firstName || user?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={13} />
                    Cambiar foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => setAvatarPreview('')}
                      className="btn btn-ghost"
                      style={{ color: 'var(--muted)', padding: '0.5rem' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="input-label">Nombre(s)</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="input-label">Apellido(s)</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="input-label">Nombre de Usuario</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="input-field"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label className="input-label">Biografía</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                className="input-field"
                style={{ resize: 'none' }}
                placeholder="Cuéntanos sobre ti..."
              />
            </div>

            {/* Occupation */}
            <div>
              <label className="input-label">Ocupación</label>
              <OccupationSelector
                value={formData.occupation}
                onChange={(value) => setFormData(prev => ({ ...prev, occupation: value }))}
              />
            </div>

            {/* Country */}
            <div>
              <label className="input-label">País</label>
              <CountrySelector
                value={formData.country}
                onChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
              />
            </div>

            {/* Interests */}
            <div>
              <label className="input-label">Intereses</label>
              <TagSelector
                tags={formData.interests}
                onChange={(tags) => setFormData(prev => ({ ...prev, interests: tags }))}
                context="interests"
                placeholder="Buscar o escribir interés..."
              />
            </div>

            {/* Submit */}
            <div
              className="flex justify-end pt-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Save size={13} />
                {saving ? 'Guardando…' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ProfileSettings;
