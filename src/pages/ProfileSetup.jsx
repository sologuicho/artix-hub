import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, User, MapPin, Briefcase, FileText, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';

const interestsOptions = [
  'Tecnología',
  'Investigación',
  'Programación',
  'Ciencia',
  'IA',
  'Quantum Computing',
  'Biología',
  'Química',
  'Física',
  'Matemáticas',
];

const ProfileSetup = () => {
  const { user, updateUser, checkAuth } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const profileValidation = useAIValidation('profile');
  const fileInputRef = useRef(null);

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

  const [formData, setFormData] = useState({
    profilePicture: null,
    fullName: user?.name || '',
    country: user?.country || '',
    occupation: user?.occupation || '',
    bio: user?.bio || '',
    interests: user?.interests || [],
  });

  const [preview, setPreview] = useState(user?.avatar || null);
  const [validationMessage, setValidationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, profilePicture: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInterestToggle = (interest) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const buildPayload = () => ({
    text: `Name: ${formData.fullName}\nLocation: ${formData.country}\nOccupation: ${formData.occupation}\nBio: ${formData.bio}\nInterests: ${formData.interests.join(', ')}`,
    metadata: {
      fullName: formData.fullName,
      country: formData.country,
      occupation: formData.occupation,
      interests: formData.interests,
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationMessage('');
    setIsSubmitting(true);
    
    try {
      if (formData.bio.length > 0) {
        const validation = await profileValidation.validate(buildPayload());
        if (!validation.safeToPublish) {
          setValidationMessage(
            validation.criticalIssues?.[0] || 'Please refine your profile details before saving.'
          );
          setIsSubmitting(false);
          return;
        }
      }

      const csrfToken = getCsrfToken();
      if (!csrfToken) {
        throw new Error('No se encontró el token de seguridad (CSRF). Por favor, intenta iniciar sesión de nuevo.');
      }

      // TODO: Handle profile picture upload properly (e.g. to S3/Cloudinary)
      // For now, if we have a new preview (data URL), we'll send that directly (less ideal for large files)
      const payloadData = {
        name: formData.fullName,
        country: formData.country,
        occupation: formData.occupation,
        bio: formData.bio,
        interests: formData.interests,
        profileComplete: true,
      };

      if (preview && preview.startsWith('data:')) {
        payloadData.avatar = preview;
      }

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(payloadData)
      });

      const data = await response.json();

      if (data.ok) {
        await checkAuth(); // Sync AuthContext
        navigate('/');
      } else {
        setValidationMessage(data.message || 'Error al guardar el perfil');
      }
    } catch (err) {
      console.error('Profile setup error:', err);
      setValidationMessage('Error de conexión al guardar el perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-2">
            Completa tu Perfil
          </h1>
          <p className="text-gray-400 mb-8">
            Cuéntanos un poco sobre ti para personalizar tu experiencia
          </p>

          <div className="mb-6">
            <AIValidationPanel
              status={profileValidation.status}
              result={profileValidation.result}
              error={profileValidation.error}
              onApplyImprovements={async () => {
                try {
                  const improved = await profileValidation.applyImprovements(buildPayload());
                  if (improved?.improvedText) {
                    setFormData((prev) => ({ ...prev, bio: improved.improvedText }));
                  }
                } catch (err) {
                  setValidationMessage(err.message);
                }
              }}
              isImproving={profileValidation.isImproving}
            />
          </div>
          {validationMessage && (
            <p className="text-sm text-red-400 mb-4 bg-red-900/20 p-2 rounded-lg border border-red-800">{validationMessage}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Foto de Perfil
              </label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                    {preview ? (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-gray-500" />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Subir Foto
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nombre Completo
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Juan Pérez"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                País
              </label>
              <select
                name="country"
                required
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/60 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
              >
                <option value="" className="bg-gray-900">Selecciona un país</option>
                <option value="MX" className="bg-gray-900">México</option>
                <option value="US" className="bg-gray-900">Estados Unidos</option>
                <option value="ES" className="bg-gray-900">España</option>
                <option value="AR" className="bg-gray-900">Argentina</option>
                <option value="CO" className="bg-gray-900">Colombia</option>
                <option value="CL" className="bg-gray-900">Chile</option>
                <option value="PE" className="bg-gray-900">Perú</option>
                <option value="BR" className="bg-gray-900">Brasil</option>
              </select>
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Briefcase className="w-4 h-4 inline mr-2" />
                Ocupación
              </label>
              <select
                name="occupation"
                required
                value={formData.occupation}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/60 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
              >
                <option value="" className="bg-gray-900">Selecciona una ocupación</option>
                <option value="student" className="bg-gray-900">Estudiante</option>
                <option value="engineer" className="bg-gray-900">Ingeniero</option>
                <option value="researcher" className="bg-gray-900">Investigador</option>
                <option value="professor" className="bg-gray-900">Profesor</option>
                <option value="scientist" className="bg-gray-900">Científico</option>
                <option value="developer" className="bg-gray-900">Desarrollador</option>
                <option value="other" className="bg-gray-900">Otro</option>
              </select>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Biografía (máx. 160 caracteres)
              </label>
              <textarea
                name="bio"
                required
                maxLength={160}
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                placeholder="Cuéntanos sobre ti..."
              />
              <p className="mt-1 text-sm text-gray-500 text-right">
                {formData.bio.length}/160
              </p>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Intereses (selecciona varios)
              </label>
              <div className="flex flex-wrap gap-2">
                {interestsOptions.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formData.interests.includes(interest)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Perfil'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;

