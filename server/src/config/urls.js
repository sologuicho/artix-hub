/**
 * Orígenes permitidos para CORS (Express) y Socket.IO.
 * Debe coincidir con la lista que antes vivía en index.js y socketServer.js.
 */
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

module.exports = { ALLOWED_ORIGINS };
