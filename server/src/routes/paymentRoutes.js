'use strict';

const express = require('express');
const prisma = require('../prismaClient');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const { stripe, mpClient, PRICE_IDS, MP_PLAN_IDS } = require('../config/payments');
const { Preference, Payment } = require('mercadopago');
const logger = require('../lib/logger');

const router = express.Router();

const VALID_TIERS = ['STUDENT', 'VISIONARY'];

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE — Create Checkout Session
// ─────────────────────────────────────────────────────────────────────────────

router.post('/stripe/create-checkout', protect, verifyCsrf, async (req, res) => {
  try {
    const { tier } = req.body;

    if (!VALID_TIERS.includes(tier)) {
      return res.status(400).json({ ok: false, message: 'Tier inválido. Usa STUDENT o VISIONARY.' });
    }

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return res.status(500).json({ ok: false, message: `STRIPE_PRICE_${tier} no está configurado en las variables de entorno.` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: req.user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      metadata: {
        userId: req.user.id,
        tier
      },
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/?pricing=true`
    });

    res.json({ ok: true, url: session.url });
  } catch (err) {
    logger.error({ err }, '[Stripe] Error creando checkout session');
    res.status(500).json({ ok: false, message: err.message || 'Error al crear sesión de pago' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// MERCADOPAGO — Create Subscription Preference
// ─────────────────────────────────────────────────────────────────────────────

router.post('/mercadopago/create-preference', protect, verifyCsrf, async (req, res) => {
  try {
    const { tier } = req.body;

    if (!VALID_TIERS.includes(tier)) {
      return res.status(400).json({ ok: false, message: 'Tier inválido. Usa STUDENT o VISIONARY.' });
    }

    const planId = MP_PLAN_IDS[tier];
    if (!planId) {
      return res.status(500).json({ ok: false, message: `MP_PLAN_${tier} no está configurado en las variables de entorno.` });
    }

    const preferenceClient = new Preference(mpClient);

    const preference = await preferenceClient.create({
      body: {
        items: [
          {
            id: planId,
            title: `Artix Hub — Plan ${tier}`,
            quantity: 1,
            currency_id: 'MXN',
            unit_price: tier === 'STUDENT' ? 79 : 179 // precio referencial; el real viene del plan en MP
          }
        ],
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment/success`,
          failure: `${process.env.FRONTEND_URL}/?pricing=true`,
          pending: `${process.env.FRONTEND_URL}/?pricing=true`
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({ userId: req.user.id, tier }),
        payer: {
          email: req.user.email
        }
      }
    });

    res.json({ ok: true, init_point: preference.init_point });
  } catch (err) {
    logger.error({ err }, '[MercadoPago] Error creando preferencia');
    res.status(500).json({ ok: false, message: err.message || 'Error al crear preferencia de pago' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MERCADOPAGO — Webhook (sin protect ni verifyCsrf)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/mercadopago/webhook', async (req, res) => {
  // ── Verificación de firma HMAC-SHA256 ──────────────────────────────────────
  const crypto = require('crypto');

  const xSignature = req.headers['x-signature'] || '';
  const xRequestId = req.headers['x-request-id'] || '';

  // Parsear "ts=<timestamp>,v1=<hash>"
  const parts = Object.fromEntries(
    xSignature.split(',').flatMap(p => {
      const idx = p.indexOf('=');
      return idx !== -1 ? [[p.slice(0, idx).trim(), p.slice(idx + 1).trim()]] : [];
    })
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) {
    logger.warn('[MP Webhook] Cabecera x-signature ausente o malformada');
    return res.status(401).json({ error: 'Missing signature' });
  }

  const dataId = req.query?.data?.id || req.body?.data?.id || '';
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const mpSecret = process.env.MP_WEBHOOK_SECRET;
  if (!mpSecret) {
    logger.error('[MP Webhook] MP_WEBHOOK_SECRET no configurado — request rechazado');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const expectedHash = crypto
    .createHmac('sha256', mpSecret)
    .update(manifest)
    .digest('hex');

  if (expectedHash !== v1) {
    logger.warn('[MP Webhook] Firma inválida — request rechazado');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  // ── Fin verificación ───────────────────────────────────────────────────────

  // Responder 200 inmediatamente para evitar reintentos por timeout
  res.sendStatus(200);

  try {
    // ── IDEMPOTENCIA: saltar eventos de MP ya procesados ──────────────────────
    const mpEventId = xRequestId || null;  // xRequestId ya fue extraído arriba en la verificación

    if (mpEventId) {
      const existingMp = await prisma.mpEvent.findUnique({ where: { id: mpEventId } });
      if (existingMp) {
        logger.info({ eventId: mpEventId }, '[MP Webhook] Evento duplicado ignorado');
        return;
      }
      await prisma.mpEvent.create({ data: { id: mpEventId } });
    }
    // ── FIN IDEMPOTENCIA ──────────────────────────────────────────────────────

    const { type, data } = req.query;
    const body = req.body;

    let userId, tier, status;

    if (type === 'payment') {
      // Pago único aprobado
      const paymentClient = new Payment(mpClient);
      const payment = await paymentClient.get({ id: data?.id || body?.data?.id });

      status = payment.status;
      if (status !== 'approved') return;

      const ref = payment.external_reference;
      if (!ref) return;

      ({ userId, tier } = JSON.parse(ref));

    } else if (type === 'subscription_preapproval') {
      // Suscripción recurrente aprobada
      const preapprovalId = data?.id || body?.data?.id;
      if (!preapprovalId) return;

      // Fetch del preapproval via API REST de MP (el SDK puede no tener este método)
      const mpResponse = await fetch(
        `https://api.mercadopago.com/preapproval/${preapprovalId}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      const preapproval = await mpResponse.json();

      status = preapproval.status;
      if (status !== 'authorized') return;

      const ref = preapproval.external_reference;
      if (!ref) return;

      ({ userId, tier } = JSON.parse(ref));
    } else {
      return; // Tipo de evento no manejado
    }

    if (userId && VALID_TIERS.includes(tier)) {
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: tier }
      });
      logger.info({ userId, tier }, '[MP Webhook] Usuario actualizado');
    }
  } catch (err) {
    logger.error({ err }, '[MercadoPago Webhook] Error procesando evento');
  }
});

module.exports = router;
