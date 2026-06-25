import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, MapPin, Briefcase, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { BACKEND_URL } from '../config/client';

const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

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
        <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: '#C4451A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, marginBottom: '2.5rem', fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          <ArrowLeft size={13} /> Volver al perfil
        </button>

        {/* Header */}
        <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
            {type === 'followers' ? 'Seguidores' : 'Siguiendo'}
          </p>
          <h1 style={{ fontFamily: SANS, fontWeight: 700, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--text)', lineHeight: 1.1 }}>
            {type === 'followers' ? 'Seguidores' : 'Siguiendo'}
            {profileUser && (
              <span style={{ fontFamily: SANS, fontWeight: 400, fontSize: '1rem', color: 'var(--muted)' }}>
                {' '}de {profileUser.name || profileUser.username}
              </span>
            )}
          </h1>
          <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
            {users.length} {type === 'followers' ? 'seguidor' : 'persona'}{users.length !== 1 ? (type === 'followers' ? 'es' : 's') : ''}
          </p>
        </div>

        {/* Users list */}
        {users.length === 0 ? (
          <div style={{ padding: '5rem 0', textAlign: 'center' }}>
            <Users size={32} style={{ color: 'var(--muted)', margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: MONO, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Sin usuarios
            </p>
            <p style={{ fontFamily: SANS, fontSize: '0.9375rem', color: 'var(--muted)' }}>
              {type === 'followers' ? 'Sin seguidores aún' : 'No sigue a nadie aún'}
            </p>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {users.map(user => (
              <div
                key={user.id}
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}
              >
                <Link to={`/profile/${user.id}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, textDecoration: 'none' }}>
                  {/* Avatar */}
                  <div style={{
                    width: 48, height: 48,
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: SANS, fontWeight: 600, color: 'var(--text)', fontSize: '0.9375rem', marginBottom: '0.125rem' }}>
                      {user.name || user.username || 'Usuario'}
                    </p>
                    <p style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                      @{user.username || 'usuario'}
                    </p>
                    {user.bio && (
                      <p style={{ fontFamily: SANS, fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.5rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {user.bio}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>
                      {user.occupation && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Briefcase size={11} /> {user.occupation}
                        </span>
                      )}
                      {user.country && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={11} /> {user.country}
                        </span>
                      )}
                    </div>
                    {user.interests?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                        {user.interests.slice(0, 4).map((interest, idx) => (
                          <span key={idx} style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>#{interest}</span>
                        ))}
                        {user.interests.length > 4 && (
                          <span style={{ fontFamily: MONO, fontSize: '0.6875rem', color: 'var(--muted)' }}>+{user.interests.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Follow button */}
                {isAuthenticated() && currentUser && user.id !== currentUser.id && (
                  <button
                    onClick={() => handleFollow(user.id)}
                    style={{
                      fontFamily: MONO,
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      background: 'none',
                      border: 'none',
                      borderBottom: `1px solid ${following[user.id] ? 'var(--border)' : 'var(--text)'}`,
                      paddingBottom: '0.125rem',
                      cursor: 'pointer',
                      color: following[user.id] ? 'var(--muted)' : 'var(--text)',
                      flexShrink: 0,
                      transition: 'color 0.15s',
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
