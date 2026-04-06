// Double Submit Cookie CSRF protection
// Server sets a 'csrf' cookie readable by JS; client must send that value in header 'x-csrf-token'
function verifyCsrf(req, res, next) {
  try {
    const csrfCookie = req.cookies && req.cookies.csrf;
    const csrfHeader = req.get('x-csrf-token') || req.body._csrf || req.query._csrf;
    if (!csrfCookie || !csrfHeader) return res.status(403).json({ message: 'CSRF token missing' });
    if (csrfCookie !== csrfHeader) return res.status(403).json({ message: 'CSRF token invalid' });
    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ message: 'CSRF error' });
  }
}

module.exports = { verifyCsrf };
