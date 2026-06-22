import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { MapPin, Briefcase, FileText, Settings } from 'lucide-react';
import { BACKEND_URL } from '../config/client';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (user?.id) fetchFollowStats();
  }, [user]);

  const fetchFollowStats = async () => {
    try {
      const [fwrs, fwng] = await Promise.all([
        fetch(`${BACKEND_URL}/api/follow/${user.id}/followers`, { credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/follow/${user.id}/following`, { credentials: 'include' }),
      ]);
      const [fdrs, fdng] = await Promise.all([fwrs.json(), fwng.json()]);
      if (fdrs.ok) setFollowersCount(fdrs.followers?.length || 0);
      if (fdng.ok) setFollowingCount(fdng.following?.length || 0);
    } catch (_) {}
  };

  const tierLabel = {
    OBSERVER: 'Lector',
    STUDENT: 'Miembro',
    RESEARCHER: 'Pro',
    VISIONARY: 'Visionary',
    TEAM: 'Team',
  };

  const tierBadgeClass = {
    OBSERVER: 'badge badge-observer',
    STUDENT: 'badge badge-observer',
    RESEARCHER: 'badge badge-researcher',
    VISIONARY: 'badge badge-visionary',
    TEAM: 'badge badge-team',
  };

  return (
    <ProtectedRoute>
      <div className="site-container py-16" style={{ minHeight: '100vh' }}>

        {/* Profile header */}
        <div
          className="pb-10 mb-10"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || user.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span
                    className="font-display"
                    style={{ fontSize: '1.75rem', color: 'var(--muted)' }}
                  >
                    {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name + tier */}
              <div>
                <h1
                  className="font-display"
                  style={{ fontSize: '2rem', color: 'var(--text)', lineHeight: 1.1 }}
                >
                  {user?.name || user?.username || 'Usuario'}
                </h1>
                <p className="font-sans text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  @{user?.username || 'usuario'}
                </p>
                {user?.subscriptionTier && (
                  <span className={`${tierBadgeClass[user.subscriptionTier] || 'badge badge-observer'} mt-2 inline-block`}>
                    {tierLabel[user.subscriptionTier] || user.subscriptionTier}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/profile/settings')}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Settings size={13} /> Configuración
            </button>
          </div>

          {/* Stats row */}
          <div
            className="flex items-center gap-8 mt-8 pt-6"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              onClick={() => navigate(`/profile/${user?.id}/followers`)}
              className="text-left"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)', lineHeight: 1 }}>
                {followersCount}
              </p>
              <p className="font-sans text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--muted)' }}>
                Seguidores
              </p>
            </button>
            <div style={{ width: 1, height: 36, backgroundColor: 'var(--border)' }} />
            <button
              onClick={() => navigate(`/profile/${user?.id}/following`)}
              className="text-left"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <p className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)', lineHeight: 1 }}>
                {followingCount}
              </p>
              <p className="font-sans text-xs uppercase tracking-wider mt-1" style={{ color: 'var(--muted)' }}>
                Siguiendo
              </p>
            </button>
          </div>
        </div>

        {/* Profile details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="flex flex-col gap-5">
            {user?.country && (
              <div className="flex items-center gap-3">
                <MapPin size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span className="font-sans text-sm" style={{ color: 'var(--text)' }}>{user.country}</span>
              </div>
            )}
            {user?.occupation && (
              <div className="flex items-center gap-3">
                <Briefcase size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span className="font-sans text-sm" style={{ color: 'var(--text)' }}>{user.occupation}</span>
              </div>
            )}
            {user?.bio && (
              <div className="flex items-start gap-3">
                <FileText size={14} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 3 }} />
                <p className="font-sans text-sm" style={{ color: 'var(--text)', lineHeight: 1.7 }}>{user.bio}</p>
              </div>
            )}
          </div>

          {user?.interests?.length > 0 && (
            <div>
              <p
                className="font-sans text-xs uppercase tracking-wider mb-4"
                style={{ color: 'var(--muted)' }}
              >
                Intereses
              </p>
              <div className="flex flex-wrap gap-2">
                {user.interests.map((interest, i) => (
                  <span key={i} className="badge badge-observer">{interest}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;
