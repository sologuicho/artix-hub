const rateLimit = require('express-rate-limit');

// Auth endpoints: login, register — 20 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many attempts. Please try again in 15 minutes.' }
});

// Username check — prevent enumeration: 30 per minute
const checkUsernameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests.' }
});

// General API limiter — 500 per 15 min, for public endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests. Please slow down.' }
});

module.exports = { authLimiter, checkUsernameLimiter, generalLimiter };
