const { verifyAuthToken } = require('../core/auth/policy');

async function optionalAuth(req, res, next) {
  const token = req.cookies && req.cookies.session;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.split(' ')[1];

  const actualToken = token || bearerToken;

  if (!actualToken) {
    return next();
  }

  try {
    const { user } = await verifyAuthToken(actualToken);
    req.user = user;
  } catch {
    // Token inválido, revocado o usuario inexistente: continuar como invitado
  }

  next();
}

module.exports = { optionalAuth };
