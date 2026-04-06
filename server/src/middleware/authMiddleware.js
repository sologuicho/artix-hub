const { verifyToken } = require('../utils/jwt');
const { verifyAuthToken, AuthTokenErrorCodes } = require('../core/auth/policy');

async function protect(req, res, next) {
  try {
    const token = req.cookies && req.cookies.session;
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const { user } = await verifyAuthToken(token);
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    if (err.code === AuthTokenErrorCodes.USER_NOT_FOUND) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (err.code === AuthTokenErrorCodes.SESSION_REVOKED) {
      return res.status(401).json({ message: err.message });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { protect, verifyToken };
