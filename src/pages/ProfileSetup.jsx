import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, User, MapPin, Briefcase, FileText, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import useAIValidation from '../hooks/useAIValidation';
import AIValidationPanel from '../components/AIValidationPanel';
import { BACKEND_URL } from '../config/client';

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
        try {
          const validation = await profileValidation.validate(buildPayload());
          if (!validation.safeToPublish) {
            setValidationMessage(
              validation.criticalIssues?.[0] || 'Please refine your profile details before saving.'
            );
            setIsSubmitting(false);
            return;
          }
        } catch (valErr) {
          console.warn('AI Validation is currently unavailable, bypassing validation:', valErr);
          // Permitimos continuar el flujo incluso si la API de IA falla
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
        navigate('/?pricing=true');
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
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h1 className="font-display mb-1" style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1.15 }}>
          Completa tu Perfil
        </h1>
        <p className="font-sans text-sm mb-8" style={{ color: 'var(--muted)' }}>
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
          <p className="font-sans text-sm mb-6" style={{ color: '#ef4444' }}>{validationMessage}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Profile Picture */}
          <div>
            <label className="input-label">Foto de Perfil</label>
            <div className="flex items-center gap-4">
              <div style={{
                width: 72, height: 72,
                borderRadius: 4,
                border: '1px solid var(--border)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--surface)',
              }}>
                {preview ? (
                  <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={24} style={{ color: 'var(--muted)' }} />
                )}
              </div>
              <label className="btn btn-outline flex items-center gap-2 cursor-pointer">
                <Upload size={13} /> Subir foto
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="input-label">Nombre Completo</label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Juan Pérez"
            />
          </div>

          {/* Country */}
          <div>
            <label className="input-label">País</label>
            <select
              name="country"
              required
              value={formData.country}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="">Selecciona un país</option>
              <option value="MX">México</option>
              <option value="US">Estados Unidos</option>
              <option value="ES">España</option>
              <option value="AR">Argentina</option>
              <option value="CO">Colombia</option>
              <option value="CL">Chile</option>
              <option value="PE">Perú</option>
              <option value="BR">Brasil</option>
            </select>
          </div>

          {/* Occupation */}
          <div>
            <label className="input-label">Ocupación</label>
            <select
              name="occupation"
              required
              value={formData.occupation}
              onChange={handleInputChange}
              className="input-field"
            >
              <option value="">Selecciona una ocupación</option>
              <option value="student">Estudiante</option>
              <option value="engineer">Ingeniero</option>
              <option value="researcher">Investigador</option>
              <option value="professor">Profesor</option>
              <option value="scientist">Científico</option>
              <option value="developer">Desarrollador</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="input-label">Biografía (máx. 160 caracteres)</label>
            <textarea
              name="bio"
              required
              maxLength={160}
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="input-field"
              style={{ resize: 'none' }}
              placeholder="Cuéntanos sobre ti…"
            />
            <p className="font-sans text-xs text-right mt-1" style={{ color: 'var(--muted)' }}>
              {formData.bio.length}/160
            </p>
          </div>

          {/* Interests */}
          <div>
            <label className="input-label">Intereses (selecciona varios)</label>
            <div className="flex flex-wrap gap-2">
              {interestsOptions.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleInterestToggle(interest)}
                  className="font-sans text-xs uppercase tracking-wider"
                  style={{
                    background: 'none',
                    border: formData.interests.includes(interest) ? '1px solid var(--text)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    padding: '0.375rem 0.75rem',
                    color: formData.interests.includes(interest) ? 'var(--text)' : 'var(--muted)',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ opacity: isSubmitting ? 0.5 : 1 }}
          >
            {isSubmitting ? 'Guardando…' : 'Guardar Perfil'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;

