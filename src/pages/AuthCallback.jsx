import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');

      if (success === 'true') {
        // OAuth was successful, check auth status
        try {
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
          const response = await fetch(`${BACKEND_URL}/me`, {
            method: 'GET',
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            if (data.ok && data.user) {
              // User is authenticated, redirect to dashboard or profile setup
              if (!data.user.profileComplete) {
                navigate('/profile/setup');
              } else {
                navigate('/');
              }
            } else {
              navigate('/auth?error=authentication_failed');
            }
          } else {
            navigate('/auth?error=authentication_failed');
          }
        } catch (error) {
          console.error('Error checking auth:', error);
          navigate('/auth?error=authentication_failed');
        }
      } else {
        // OAuth failed or was cancelled
        navigate('/auth?error=oauth_cancelled');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

