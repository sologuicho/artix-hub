const logger = require('../lib/logger')

// Double Submit Cookie CSRF protection
// Server sets a 'csrf' cookie readable by JS; client must send that value in header 'x-csrf-token'
function verifyCsrf(req, res, next) {
  try {
    const csrfFromCookie = req.cookies && req.cookies.csrf
    const csrfFromHeader =
      req.get('x-csrf-token') || req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf
    const csrf = csrfFromCookie || csrfFromHeader
    if (!csrf || !csrfFromHeader) return res.status(403).json({ message: 'CSRF token missing' })
    if (csrfFromCookie && csrfFromCookie !== csrfFromHeader)
      return res.status(403).json({ message: 'CSRF token invalid' })
    next()
  } catch (err) {
    logger.error({ err }, '[csrfMiddleware] CSRF validation error')
    return res.status(403).json({ message: 'CSRF error' })
  }
}

module.exports = { verifyCsrf }
