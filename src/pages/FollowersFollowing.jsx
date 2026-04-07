import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, MapPin, Briefcase, FileText, Users, UserPlus, ArrowLeft, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { BACKEND_URL } from '../config/client';

const FollowersFollowing = () => {
  const { userId, type } = useParams(); // type: 'followers' or 'following'
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState({});

  useEffect(() => {
    if (userId && type) {
      fetchData();
    }
  }, [userId, type]);

  useEffect(() => {
    if (isAuthenticated() && users.length > 0) {
      checkFollowStatuses();
    }
  }, [users, isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile user info
      const profileResponse = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        credentials: 'include'
      });
      const profileData = await profileResponse.json();
      if (profileData.ok) {
        setProfileUser(profileData.user);
      }

      // Fetch followers or following
      const endpoint = type === 'followers' 
        ? `${BACKEND_URL}/api/follow/${userId}/followers`
        : `${BACKEND_URL}/api/follow/${userId}/following`;
      
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.ok) {
        setUsers(type === 'followers' ? data.followers : data.following);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatuses = async () => {
    if (!isAuthenticated() || !currentUser) return;
    
    const userIds = users.map(u => u.id).filter(id => id !== currentUser.id);
    const initialFollowing = {};
    
    for (const id of userIds) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/follow/${id}/check`, {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.ok) {
          initialFollowing[id] = data.following || false;
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    }
    
    setFollowing(prev => ({ ...prev, ...initialFollowing }));
  };

  const handleFollow = async (targetUserId) => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }

    try {
      const getCsrfToken = () => {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrf') return value;
        }
        return null;
      };

      const response = await fetch(`${BACKEND_URL}/api/follow/${targetUserId}`, {
        method: 'POST',
        headers: {
          'x-csrf-token': getCsrfToken() || ''
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.ok) {
        setFollowing(prev => ({ ...prev, [targetUserId]: data.following }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/profile/${userId}`)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al perfil
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {type === 'followers' ? 'Seguidores' : 'Siguiendo'}
          {profileUser && (
            <span className="text-gray-600 dark:text-gray-400 font-normal">
              {' '}de {profileUser.name || profileUser.username}
            </span>
          )}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {users.length} {type === 'followers' ? 'seguidor' : 'persona'}{users.length !== 1 ? (type === 'followers' ? 'es' : 's') : ''}
        </p>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {type === 'followers' 
                ? 'Este usuario aún no tiene seguidores.' 
                : 'Este usuario aún no sigue a nadie.'}
            </p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="glass-card p-6 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <Link
                  to={`/profile/${user.id}`}
                  className="flex items-start gap-4 flex-1 hover:opacity-80 transition-opacity"
                >
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-semibold">
                        {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {user.name || user.username || 'Usuario'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">@{user.username || 'usuario'}</p>

                    {/* Bio */}
                    {user.bio && (
                      <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                        {user.bio}
                      </p>
                    )}

                    {/* Details */}
                    <div className="space-y-2">
                      {/* Occupation - Most Important */}
                      {user.occupation && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {user.occupation}
                          </span>
                        </div>
                      )}

                      {/* Country */}
                      {user.country && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {user.country}
                          </span>
                        </div>
                      )}

                      {/* Interests */}
                      {user.interests && user.interests.length > 0 && (
                        <div className="flex items-start gap-2 mt-2">
                          <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1">
                            {user.interests.slice(0, 5).map((interest, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                              >
                                {interest}
                              </span>
                            ))}
                            {user.interests.length > 5 && (
                              <span className="px-2 py-0.5 text-gray-500 dark:text-gray-400 text-xs">
                                +{user.interests.length - 5} más
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Follow Button */}
                {isAuthenticated() && currentUser && user.id !== currentUser.id && (
                  <button
                    onClick={() => handleFollow(user.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ml-4 flex-shrink-0 ${
                      following[user.id]
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {following[user.id] ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Siguiendo
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Seguir
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FollowersFollowing;




