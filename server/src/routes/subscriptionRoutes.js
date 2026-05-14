'use strict';

const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { stripe } = require('../config/payments');

// DESHABILITADO POR SEGURIDAD — este endpoint permitía que cualquier usuario autenticado
// cambiara su subscriptionTier a cualquier nivel sin verificar pago.
// El upgrade real ocurre exclusivamente vía webhook de Stripe (stripeWebhook.js)
// o MercadoPago (paymentRoutes.js), ambos con verificación de firma criptográfica.
router.post('/upgrade', protect, verifyCsrf, (req, res) => {
  return res.status(403).json({
    error: 'Los cambios de tier solo se procesan mediante pago. Usa /api/payments/stripe o /api/payments/mercadopago.'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subscription/status
// ─────────────────────────────────────────────────────────────────────────────

router.get('/status', protect, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        subscriptionTier: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true
      }
    });

    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    // Sin suscripción gestionada por Stripe
    if (!user.stripeCustomerId) {
      return res.json({
        ok: true,
        managed: false,
        tier: user.subscriptionTier
      });
    }

    // Consultar estado real en Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      limit: 1,
      status: 'all'
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      return res.json({
        ok: true,
        managed: true,
        tier: user.subscriptionTier,
        status: 'no_subscription',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      });
    }

    res.json({
      ok: true,
      managed: true,
      tier: user.subscriptionTier,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });
  } catch (err) {
    console.error('[Subscription] Error obteniendo status:', err);
    res.status(500).json({ ok: false, message: err.message || 'Error al obtener estado de suscripción' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscription/cancel
// ─────────────────────────────────────────────────────────────────────────────

router.post('/cancel', protect, verifyCsrf, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripeSubscriptionId: true }
    });

    if (!user?.stripeSubscriptionId) {
      return res.status(400).json({ ok: false, message: 'No hay suscripción activa' });
    }

    // Marcar para cancelar al final del período — el tier baja cuando
    // el webhook customer.subscription.deleted llegue de Stripe
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    res.json({
      ok: true,
      message: 'Suscripción cancelada al final del período',
      cancelAtPeriodEnd: true
    });
  } catch (err) {
    console.error('[Subscription] Error cancelando suscripción:', err);
    res.status(500).json({ ok: false, message: err.message || 'Error al cancelar suscripción' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscription/reactivate
// ─────────────────────────────────────────────────────────────────────────────

router.post('/reactivate', protect, verifyCsrf, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripeSubscriptionId: true }
    });

    if (!user?.stripeSubscriptionId) {
      return res.status(400).json({ ok: false, message: 'No hay suscripción activa para reactivar' });
    }

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false
    });

    res.json({
      ok: true,
      message: 'Suscripción reactivada'
    });
  } catch (err) {
    console.error('[Subscription] Error reactivando suscripción:', err);
    res.status(500).json({ ok: false, message: err.message || 'Error al reactivar suscripción' });
  }
});

module.exports = router;
