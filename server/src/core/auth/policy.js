const jwt = require('jsonwebtoken');
const prisma = require('../../prismaClient');

const { JWT_SECRET } = process.env;

/** Códigos para que REST/Socket mapeen respuestas sin depender del texto del mensaje. */
const AuthTokenErrorCodes = {
  JWT_INVALID: 'JWT_INVALID',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  SESSION_REVOKED: 'SESSION_REVOKED',
};

function createAuthTokenError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Valida el JWT, carga el usuario y comprueba revocación vía tokenVersion.
 * Misma semántica que antes: inválido si (decoded.tv ?? 0) < (user.tokenVersion ?? 0).
 *
 * @param {string} token
 * @returns {Promise<{ user: object, decoded: object }>}
 */
async function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') {
    throw createAuthTokenError(AuthTokenErrorCodes.JWT_INVALID, 'Invalid token');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    throw createAuthTokenError(AuthTokenErrorCodes.JWT_INVALID, 'Invalid token');
  }

  if (!decoded || !decoded.id) {
    throw createAuthTokenError(AuthTokenErrorCodes.JWT_INVALID, 'Invalid token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) {
    throw createAuthTokenError(AuthTokenErrorCodes.USER_NOT_FOUND, 'User not found');
  }

  if ((decoded.tv ?? 0) < (user.tokenVersion ?? 0)) {
    throw createAuthTokenError(
      AuthTokenErrorCodes.SESSION_REVOKED,
      'Session expired. Please log in again.'
    );
  }

  return { user, decoded };
}

module.exports = {
  verifyAuthToken,
  AuthTokenErrorCodes,
};
