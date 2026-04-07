import { useState, useEffect } from 'react';
import { UserPlus, Check, XCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

import { BACKEND_URL } from '../config/client';

const CollaborationInvitation = ({ type, itemId, onUpdate }) => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvitations();
  }, [type, itemId]);

  const fetchInvitations = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/${type === 'article' ? 'articles' : 'events'}/${itemId}/collaborations`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        // Filter invitations for current user
        const userInvitations = (data.collaborations || []).filter(
          collab => collab.userId === user?.id && collab.status === 'pending'
        );
        setInvitations(userInvitations);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (collaborationId, accept) => {
    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const response = await fetch(`${BACKEND_URL}/api/${type === 'article' ? 'articles' : 'events'}/${itemId}/collaborations/${collaborationId}/respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include',
        body: JSON.stringify({ accept })
      });

      const data = await response.json();
      if (data.ok) {
        setInvitations(prev => prev.filter(inv => inv.id !== collaborationId));
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
    }
  };

  if (loading || invitations.length === 0) return null;

  return (
    <div className="glass-card p-4 mb-6 border-l-4 border-blue-500">
      <div className="flex items-start gap-3">
        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Invitaciones de colaboración
          </h3>
          {invitations.map((invitation) => (
            <div key={invitation.id} className="mb-3 last:mb-0 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Has sido invitado a colaborar en este {type === 'article' ? 'artículo' : 'evento'} como <strong>{invitation.role}</strong>.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResponse(invitation.id, true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Check className="w-4 h-4" />
                  Aceptar
                </button>
                <button
                  onClick={() => handleResponse(invitation.id, false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollaborationInvitation;





