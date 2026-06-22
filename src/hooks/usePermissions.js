import { useAuth } from '../context/AuthContext';

export const TIER_PERMISSIONS = {
  OBSERVER:   { canPublish: true,  canPublishArticles: false, canAccessResearch: false, canCollaborate: false, canPublishEvents: false, canCreateTeams: false },
  STUDENT:    { canPublish: true,  canPublishArticles: true,  canAccessResearch: true,  canCollaborate: false, canPublishEvents: false, canCreateTeams: false },
  RESEARCHER: { canPublish: true,  canPublishArticles: true,  canAccessResearch: true,  canCollaborate: true,  canPublishEvents: true,  canCreateTeams: false },
  TEAM:       { canPublish: true,  canPublishArticles: true,  canAccessResearch: true,  canCollaborate: true,  canPublishEvents: true,  canCreateTeams: true  },
  VISIONARY:  { canPublish: true,  canPublishArticles: true,  canAccessResearch: true,  canCollaborate: true,  canPublishEvents: true,  canCreateTeams: true  },
};

export const usePermissions = () => {
  const { user } = useAuth();

  const checkPermission = (permission) => {
    if (!user) return false;
    
    // Los administradores tienen acceso total
    if (user.role === 'ADMIN' || user.role === 'admin') return true;

    const tier = user.subscriptionTier || 'OBSERVER';
    const perms = TIER_PERMISSIONS[tier] || TIER_PERMISSIONS.OBSERVER;

    return !!perms[permission];
  };

  return {
    checkPermission,
    canPublishArticles: checkPermission('canPublishArticles'),
    canPublish: checkPermission('canPublish'),
    canAccessResearch: checkPermission('canAccessResearch'),
    canCollaborate: checkPermission('canCollaborate'),
    canPublishEvents: checkPermission('canPublishEvents'),
    canCreateTeams: checkPermission('canCreateTeams'),
    tier: user?.subscriptionTier || 'OBSERVER',
  };
};

export default usePermissions;
