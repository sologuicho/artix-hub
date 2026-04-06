import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { User, MapPin, Briefcase, FileText, Settings, Users, UserPlus } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchFollowStats();
    }
  }, [user]);

  const fetchFollowStats = async () => {
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
      const [followersRes, followingRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/follow/${user.id}/followers`, { credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/follow/${user.id}/following`, { credentials: 'include' })
      ]);

      const followersData = await followersRes.json();
      const followingData = await followingRes.json();

      if (followersData.ok) {
        setFollowers(followersData.followers || []);
        setFollowersCount(followersData.followers?.length || 0);
      }
      if (followingData.ok) {
        setFollowing(followingData.following || []);
        setFollowingCount(followingData.following?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching follow stats:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Mi Perfil</h1>
          <button
            onClick={() => navigate('/profile/settings')}
            className="glass-button flex items-center gap-2 text-white"
          >
            <Settings className="w-5 h-5" />
            Configuración
          </button>
        </div>

        <div className="glass-card p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name || user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-semibold">
                  {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                {user?.name || user?.username || 'Usuario'}
              </h2>
              <p className="text-gray-400 mb-4">@{user?.username || 'usuario'}</p>

              {/* Follow Stats */}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => navigate(`/profile/${user.id}/followers`)}
                  className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-white">{followersCount}</span>
                  <span className="text-gray-500">seguidores</span>
                </button>
                <button
                  onClick={() => navigate(`/profile/${user.id}/following`)}
                  className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-white">{followingCount}</span>
                  <span className="text-gray-500">siguiendo</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {user?.country && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-500" />
                <span className="text-gray-300">{user.country}</span>
              </div>
            )}
            {user?.occupation && (
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-gray-500" />
                <span className="text-gray-300">{user.occupation}</span>
              </div>
            )}
            {user?.bio && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-500 mt-1" />
                <p className="text-gray-300">{user.bio}</p>
              </div>
            )}
            {user?.interests && user.interests.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Intereses</h3>
                <div className="flex flex-wrap gap-2">
                  {user.interests.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-900/30 text-blue-200 border border-blue-500/20 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;

