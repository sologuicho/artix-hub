// OAuth authentication handlers
// Redirect to backend OAuth endpoints

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const handleGoogleAuth = async () => {
  try {
    window.location.href = `${BACKEND_URL}/auth/google`;
  } catch (error) {
    console.error('Google OAuth error:', error);
    alert('Error al intentar iniciar sesión con Google. Por favor, intenta de nuevo.');
  }
};

export const handleMicrosoftAuth = async () => {
  try {
    window.location.href = `${BACKEND_URL}/auth/microsoft`;
  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    alert('Error al intentar iniciar sesión con Microsoft. Por favor, intenta de nuevo.');
  }
};

export const handleGitHubAuth = async () => {
  try {
    window.location.href = `${BACKEND_URL}/auth/github`;
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    alert('Error al intentar iniciar sesión con GitHub. Por favor, intenta de nuevo.');
  }
};

