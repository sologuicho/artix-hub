import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, MapPin, Briefcase, FileText, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { BACKEND_URL } from '../config/client';

const FollowersFollowing = () => {
  const { userId, type } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState({});

  useEffect(() => {
    if (userId && type) fetchData();
  }, [userId, type]);

  useEffect(() => {
    if (isAuthenticated() && users.length > 0) checkFollowStatuses();
  }, [users]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, usersRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/users/${userId}`, { credentials: 'include' }),
        fetch(
          type === 'followers'
            ? `${BACKEND_URL}/api/follow/${userId}/followers`
            : `${BACKEND_URL}/api/follow/${userId}/following`,
          { credentials: 'include' }
        ),
      ]);
      const profileData = await profileRes.json();
      const usersData = await usersRes.json();
      if (profileData.ok) setProfileUser(profileData.user);
      if (usersData.ok) setUsers(type === 'followers' ? usersData.followers : usersData.following);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatuses = async () => {
    if (!isAuthenticated() || !currentUser) return;
    const ids = users.map(u => u.id).filter(id => id !== currentUser.id);
    const statuses = {};
    await Promise.all(ids.map(async (id) => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/follow/${id}/check`, { credentials: 'include' });
        const data = await res.json();
        if (data.ok) statuses[id] = data.following || false;
      } catch (_) {}
    }));
    setFollowing(prev => ({ ...prev, ...statuses }));
  };

  const getCsrfToken = () => {
    for (const c of document.cookie.split(';')) {
      const [k, v] = c.trim().split('=');
      if (k === 'csrf') return v;
    }
    return null;
  };

  const handleFollow = async (targetUserId) => {
    if (!isAuthenticated()) { navigate('/auth'); return; }
    const prev = following[targetUserId];
    setFollowing(f => ({ ...f, [targetUserId]: !prev }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/follow/${targetUserId}`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrfToken() || '' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) setFollowing(f => ({ ...f, [targetUserId]: prev }));
    } catch (_) {
      setFollowing(f => ({ ...f, [targetUserId]: prev }));
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="site-container py-12">
        {/* Back */}
        <button
          onClick={() => navigate(`/profile/${userId}`)}
          className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider mb-10"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
        >
          <ArrowLeft size={13} /> Volver al perfil
        </button>

        {/* Header */}
        <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--text)', lineHeight: 1.1 }}>
            {type === 'followers' ? 'Seguidores' : 'Siguiendo'}
            {profileUser && (
              <span className="font-sans font-normal" style={{ fontSize: '1rem', color: 'var(--muted)' }}>
                {' '}de {profileUser.name || profileUser.username}
              </span>
            )}
          </h1>
          <p className="font-sans text-sm mt-2" style={{ color: 'var(--muted)' }}>
            {users.length} {type === 'followers' ? 'seguidor' : 'persona'}{users.length !== 1 ? (type === 'followers' ? 'es' : 's') : ''}
          </p>
        </div>

        {/* Users list */}
        {users.length === 0 ? (
          <div className="py-20 text-center">
            <Users size={32} style={{ color: 'var(--muted)', margin: '0 auto 1rem' }} />
            <p className="font-display" style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>
              {type === 'followers' ? 'Sin seguidores aún' : 'No sigue a nadie aún'}
            </p>
          </div>
        ) : (
          <div>
            {users.map(user => (
              <div
                key={user.id}
                className="flex items-start justify-between gap-4 py-6"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <Link to={`/profile/${user.id}`} className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name || user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={20} style={{ color: 'var(--muted)' }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-medium" style={{ color: 'var(--text)', fontSize: '0.9375rem' }}>
                      {user.name || user.username || 'Usuario'}
                    </p>
                    <p className="font-sans text-xs mb-2" style={{ color: 'var(--muted)' }}>
                      @{user.username || 'usuario'}
                    </p>
                    {user.bio && (
                      <p className="font-sans text-sm mb-2" style={{ color: 'var(--muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {user.bio}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 font-sans text-xs" style={{ color: 'var(--muted)' }}>
                      {user.occupation && (
                        <span className="flex items-center gap-1">
                          <Briefcase size={11} /> {user.occupation}
                        </span>
                      )}
                      {user.country && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {user.country}
                        </span>
                      )}
                    </div>
                    {user.interests?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {user.interests.slice(0, 4).map((interest, idx) => (
                          <span key={idx} className="font-sans text-xs" style={{ color: 'var(--muted)' }}>#{interest}</span>
                        ))}
                        {user.interests.length > 4 && (
                          <span className="font-sans text-xs" style={{ color: 'var(--muted)' }}>+{user.interests.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Follow button */}
                {isAuthenticated() && currentUser && user.id !== currentUser.id && (
                  <button
                    onClick={() => handleFollow(user.id)}
                    className="btn btn-ghost"
                    style={{
                      fontSize: '0.6875rem', padding: '0.375rem 0', flexShrink: 0,
                      borderBottom: `1px solid ${following[user.id] ? 'var(--border)' : 'var(--text)'}`,
                      color: following[user.id] ? 'var(--muted)' : 'var(--text)',
                    }}
                  >
                    {following[user.id] ? 'Siguiendo' : 'Seguir'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowersFollowing;
