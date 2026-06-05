const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const prisma = require('../prismaClient');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { isInstitutionalEmail } = require('../utils/institutionalDomains');
const emailService = require('../services/emailService');
const logger = require('../lib/logger');

const applyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Máximo 3 solicitudes por día.' },
});

// POST /api/student/apply
router.post('/apply', protect, verifyCsrf, applyLimiter, async (req, res) => {
  try {
    const { institutionalEmail, documentBase64, documentMimeType } = req.body;
    const userId = req.user.id;

    const existing = await prisma.studentVerification.findUnique({ where: { userId } });
    if (existing?.status === 'APPROVED') {
      return res.status(400).json({ ok: false, message: 'Ya tienes el plan Estudiante activo.' });
    }

    if (institutionalEmail) {
      if (!isInstitutionalEmail(institutionalEmail)) {
        return res.status(400).json({
          ok: false,
          message: 'El email no corresponde a una institución educativa reconocida.',
        });
      }

      await prisma.$transaction([
        prisma.studentVerification.upsert({
          where: { userId },
          create: { userId, email: institutionalEmail, status: 'APPROVED' },
          update: { email: institutionalEmail, status: 'APPROVED', reviewNote: null },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: 'STUDENT' },
        }),
      ]);

      try { await emailService.sendStudentApproved(req.user); } catch (_) {}

      return res.json({ ok: true, autoApproved: true, message: 'Tu plan Estudiante está activo.' });
    }

    if (documentBase64) {
      await prisma.studentVerification.upsert({
        where: { userId },
        create: { userId, documentUrl: documentBase64, status: 'PENDING' },
        update: { documentUrl: documentBase64, status: 'PENDING', reviewNote: null },
      });

      logger.info({ userId }, 'New pending student verification submitted');

      return res.json({
        ok: true,
        autoApproved: false,
        message: 'Tu solicitud está en revisión, te notificaremos en 24-48h.',
      });
    }

    return res.status(400).json({
      ok: false,
      message: 'Proporciona un email institucional o sube un documento.',
    });
  } catch (err) {
    logger.error({ err }, 'Error in student apply');
    res.status(500).json({ ok: false, message: 'Error al procesar la solicitud.' });
  }
});

// GET /api/student/status
router.get('/status', protect, async (req, res) => {
  try {
    const verification = await prisma.studentVerification.findUnique({
      where: { userId: req.user.id },
    });
    res.json({ ok: true, verification });
  } catch (err) {
    logger.error({ err }, 'Error fetching student status');
    res.status(500).json({ ok: false, message: 'Error al obtener el estado.' });
  }
});

module.exports = router;
