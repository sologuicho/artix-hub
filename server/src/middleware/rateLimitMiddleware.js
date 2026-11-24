const rateLimit = require('express-rate-limit')

// Auth endpoints: login, register — 20 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many attempts. Please try again in 15 minutes.' },
})

// Username check — prevent enumeration: 30 per minute
const checkUsernameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests.' },
})

// General API limiter — 500 per 15 min, for public endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests. Please slow down.' },
})

// Password reset requests — 3 per 15 min per IP to prevent email bombing
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Demasiados intentos. Espera 15 minutos antes de volver a solicitar.',
  },
})

// AI endpoints (/assist, /search) — 20 requests per 15 min per authenticated user (falls back to IP).
// Uses MemoryStore (express-rate-limit default). Safe for a single Render instance; if the app
// ever scales to multiple instances, replace with a shared store (e.g. rate-limit-redis).
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { ok: false, message: 'AI request limit reached. Please wait before trying again.' },
})

module.exports = { authLimiter, checkUsernameLimiter, generalLimiter, passwordResetLimiter, aiLimiter }
