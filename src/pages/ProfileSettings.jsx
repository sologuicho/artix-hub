import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { compressImage, getFileSizeMB, formatFileSize } from '../utils/imageCompression';
import CountrySelector from '../components/CountrySelector';
import OccupationSelector from '../components/OccupationSelector';
import TagSelector from '../components/TagSelector';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

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
    interests: []
  });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      // Split name into first and last name using heuristic
      const nameParts = (user.name || '').trim().split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts.pop() : '';
      const firstName = nameParts.join(' ');

      setFormData({
        firstName: firstName,
        lastName: lastName,
        username: user.username || '',
        bio: user.bio || '',
        occupation: user.occupation || '',
        country: user.country || '',
        interests: user.interests || []
      });
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileSizeMB = getFileSizeMB(file);

    // Show warning for very large files
    if (fileSizeMB > 10) {
      alert(`La imagen es muy grande (${formatFileSize(fileSizeMB)}). Por favor, selecciona una imagen más pequeña (recomendado: 2-3 MB o menos).`);
      return;
    }

    setAvatar(file);

    try {
      // Always compress image to optimize size (max 800x800 for avatars)
      const compressedDataUrl = await compressImage(file, 800, 800, 0.85);
      const compressedSizeMB = getFileSizeMB(compressedDataUrl);

      // Show info if compression was significant
      if (fileSizeMB > 3 && compressedSizeMB < fileSizeMB * 0.7) {
        console.log(`Imagen comprimida: ${formatFileSize(fileSizeMB)} → ${formatFileSize(compressedSizeMB)}`);
      }

      setAvatarPreview(compressedDataUrl);
    } catch (error) {
      console.error('Error compressing image:', error);
      // Fallback to original if compression fails
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      // Prepare avatar - only send if it changed
      let avatarToSend = undefined;
      if (avatarPreview && avatarPreview !== user?.avatar) {
        // Only send if it's a new image (data URL) or if it's different
        avatarToSend = avatarPreview;
      } else if (!avatarPreview && user?.avatar) {
        // Keep existing avatar if no new one is selected
        avatarToSend = user.avatar;
      }

      const payload = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        username: formData.username,
        bio: formData.bio,
        occupation: formData.occupation,
        country: formData.country,
        interests: formData.interests,
        profileComplete: true
      };

      // Only include avatar if it's defined
      if (avatarToSend !== undefined) {
        payload.avatar = avatarToSend;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = 'Error al actualizar el perfil';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.ok) {
        if (updateUser) {
          updateUser(data.user);
        }
        alert('Perfil actualizado correctamente');
        navigate('/profile');
      } else {
        throw new Error(data.message || 'Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Error al actualizar el perfil. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Configuración de Perfil
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Foto de Perfil
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              💡 Recomendado: Imágenes de 2-3 MB o menos. La imagen se comprimirá automáticamente si es muy grande.
            </p>
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {formData.firstName?.charAt(0) || 'U'}
                </div>
              )}
              <label className="glass-button-outline flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
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
                  onClick={() => {
                    setAvatar(null);
                    setAvatarPreview('');
                  }}
                  className="px-3 py-2 text-red-600 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Name Fields - Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre(s)
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full glass-input text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Apellido(s)
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full glass-input text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre de Usuario
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full glass-input text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Biografía
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full glass-input text-gray-900 dark:text-gray-100"
              placeholder="Cuéntanos sobre ti..."
            />
          </div>

          {/* Occupation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ocupación
            </label>
            <OccupationSelector
              value={formData.occupation}
              onChange={(value) => setFormData({ ...formData, occupation: value })}
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              País
            </label>
            <CountrySelector
              value={formData.country}
              onChange={(value) => setFormData({ ...formData, country: value })}
            />
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Intereses
            </label>
            <TagSelector
              tags={formData.interests}
              onChange={(tags) => setFormData({ ...formData, interests: tags })}
              context="interests"
              placeholder="Buscar o escribir interés..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="glass-button flex items-center gap-2 text-gray-900 dark:text-gray-100 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
};

export default ProfileSettings;

