'use strict';

/**
 * checkAdmin
 *
 * Express middleware that validates if the authenticated user has the 'ADMIN' role.
 * Responds with a 403 status and a JSON error if the role is not ADMIN.
 *
 * Must be used after the `protect` middleware (req.user must be set).
 */
function checkAdmin(req, res, next) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      message: 'Usuario no autenticado.'
    });
  }

  if (user.role === 'ADMIN') {
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: 'ACCESS_DENIED',
    message: 'Acceso restringido a administradores'
  });
}

module.exports = { checkAdmin };
