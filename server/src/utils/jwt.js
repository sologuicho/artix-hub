const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function signToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    // tokenVersion enables instant revocation: if DB version > token version, token is rejected
    tv: user.tokenVersion ?? 0
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/** Short-lived JWT for Socket.IO (1h) — session cookie is HttpOnly and unreadable by the browser. */
function signSocketToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    tv: user.tokenVersion ?? 0,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

module.exports = { signToken, signSocketToken, verifyToken };
