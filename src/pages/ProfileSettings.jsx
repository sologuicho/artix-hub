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

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";
const ACCENT = '#C4451A';

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

  const labelStyle = {
    display: 'block',
    fontFamily: MONO,
    fontSize: '0.5625rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: '0.5rem',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontFamily: SANS,
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '4rem 1.5rem' }}>

          {/* Page header */}
          <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2.5rem' }}>
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
              fontSize: '2rem',
              color: 'var(--text)',
              lineHeight: 1.1,
              marginTop: '0.375rem',
              marginBottom: 0,
            }}>
              Configuración de Perfil
            </h1>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'var(--surface)',
              borderLeft: `3px solid ${ACCENT}`,
              padding: '0.875rem 1rem',
              fontFamily: SANS,
              fontSize: '0.875rem',
              color: ACCENT,
              marginBottom: '1.5rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Avatar */}
            <div>
              <label style={labelStyle}>Foto de Perfil</label>
              <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.875rem' }}>
                Recomendado: imágenes de 2-3 MB o menos. Se comprimirán automáticamente.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 80,
                  height: 80,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Vista previa"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontFamily: MONO, fontSize: '1.5rem', color: 'var(--muted)' }}>
                      {(formData.firstName || user?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1rem',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text)',
                    fontFamily: SANS,
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}>
                    <Upload size={13} />
                    Cambiar foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => setAvatarPreview('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted)',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Nombre(s)</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Apellido(s)</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label style={labelStyle}>Nombre de Usuario</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                style={inputStyle}
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label style={labelStyle}>Biografía</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                style={{ ...inputStyle, resize: 'none' }}
                placeholder="Cuéntanos sobre ti..."
              />
            </div>

            {/* Occupation */}
            <div>
              <label style={labelStyle}>Ocupación</label>
              <OccupationSelector
                value={formData.occupation}
                onChange={(value) => setFormData(prev => ({ ...prev, occupation: value }))}
              />
            </div>

            {/* Country */}
            <div>
              <label style={labelStyle}>País</label>
              <CountrySelector
                value={formData.country}
                onChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
              />
            </div>

            {/* Interests */}
            <div>
              <label style={labelStyle}>Intereses</label>
              <TagSelector
                tags={formData.interests}
                onChange={(tags) => setFormData(prev => ({ ...prev, interests: tags }))}
                context="interests"
                placeholder="Buscar o escribir interés..."
              />
            </div>

            {/* Submit */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: ACCENT,
                  color: '#fff',
                  border: 'none',
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  padding: '0.875rem 1.5rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
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
