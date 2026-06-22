'use strict';

const TIER_PERMISSIONS = {
  OBSERVER:   { canPublish: true,  canPublishArticles: false, canAccessResearch: false, canCollaborate: false, canPublishEvents: false, canCreateTeams: false },
  STUDENT:    { canPublish: true,  canPublishArticles: true,  canAccessResearch: true,  canCollaborate: false, canPublishEvents: false, canCreateTeams: false },
  RESEARCHER: { canPublish: true,  canPublishArticles: true,  canAccessResearch: true,  canCollaborate: true,  canPublishEvents: true,  canCreateTeams: false },
  TEAM:       { canPublish: true,  canPublishArticles: true,  canAccessResearch: true,  canCollaborate: true,  canPublishEvents: true,  canCreateTeams: true  },
  VISIONARY:  { canPublish: true,  canPublishArticles: true,  canAccessResearch: true,  canCollaborate: true,  canPublishEvents: true,  canCreateTeams: true  },
};

/**
 * checkPermission(permission)
 *
 * Returns an Express middleware that:
 *  - Passes always if user.role === 'ADMIN'
 *  - Passes if the user's subscriptionTier grants the requested permission
 *  - Responds 403 with { error: 'PLAN_REQUIRED', requiredPermission, currentTier } otherwise
 *
 * Must be used after the `protect` middleware (req.user must be set).
 *
 * @param {keyof typeof TIER_PERMISSIONS['OBSERVER']} permission
 */
function checkPermission(permission) {
  return (req, res, next) => {
    const user = req.user;

    // ADMIN bypasses all tier checks
    if (user.role === 'ADMIN') return next();

    const tier = user.subscriptionTier || 'OBSERVER';
    const perms = TIER_PERMISSIONS[tier] ?? TIER_PERMISSIONS.OBSERVER;

    if (perms[permission]) return next();

    return res.status(403).json({
      ok: false,
      error: 'PLAN_REQUIRED',
      requiredPermission: permission,
      currentTier: tier,
      message: `Tu plan actual (${tier}) no incluye este permiso. Actualiza tu suscripción para continuar.`,
    });
  };
}

module.exports = { checkPermission, TIER_PERMISSIONS };
