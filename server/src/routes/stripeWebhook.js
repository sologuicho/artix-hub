'use strict';

const prisma = require('../prismaClient');
const { stripe } = require('../config/payments');
const emailService = require('../services/emailService');

const VALID_TIERS = ['STUDENT', 'VISIONARY'];

/**
 * Stripe Webhook Handler
 *
 * Montado en index.js ANTES de express.json() con express.raw({ type: 'application/json' })
 * para preservar el raw body que necesita stripe.webhooks.constructEvent().
 */
module.exports = async function stripeWebhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe Webhook] Firma inválida:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Procesar internamente sin bloquear la respuesta a Stripe
  try {
    // ── IDEMPOTENCIA: saltar eventos ya procesados ────────────────────────────
    const existing = await prisma.stripeEvent.findUnique({
      where: { id: event.id }
    });
    if (existing) {
      console.log(`[Stripe Webhook] Evento duplicado ignorado: ${event.id}`);
      return res.json({ received: true });
    }

    // Registrar como procesado ANTES del switch para que cualquier evento
    // quede marcado aunque falle un paso posterior (ej: envío de email)
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type }
    });
    // ── FIN IDEMPOTENCIA ──────────────────────────────────────────────────────

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { userId, tier } = session.metadata || {};

        if (userId && VALID_TIERS.includes(tier)) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionTier: tier,
              stripeCustomerId:     session.customer     || undefined,
              stripeSubscriptionId: session.subscription || undefined
            }
          });
          console.log(`[Stripe Webhook] Usuario ${userId} → tier=${tier}, customer=${session.customer}, sub=${session.subscription}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        if (customerId) {
          const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
          if (!user) {
            console.error('[Stripe Webhook] sub.deleted: no user found for customerId', customerId);
            break;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { subscriptionTier: 'OBSERVER' }
          });
          console.log(`[Stripe Webhook] Suscripción cancelada — Usuario ${user.id} bajado a OBSERVER`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (!customerId) break;

        // Buscar usuario por stripeCustomerId
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true, email: true, name: true, subscriptionTier: true }
        });

        if (!user) break;

        // Contar facturas abiertas (intentos fallidos pendientes de cobro)
        const failedInvoices = await stripe.invoices.list({
          customer: customerId,
          status: 'open',
          limit: 10
        });
        const failCount = failedInvoices.data.length;

        // Bajar a OBSERVER después de 3 fallos acumulados
        let downgraded = false;
        if (failCount >= 3) {
          await prisma.user.update({
            where: { id: user.id },
            data: { subscriptionTier: 'OBSERVER' }
          });
          downgraded = true;
          console.log(`[Stripe Webhook] Usuario ${user.id} bajado a OBSERVER por ${failCount} pagos fallidos`);
        }

        // Notificar al usuario — en su propio try/catch para no bloquear el 200
        if (user.email) {
          try {
            const userName = user.name || 'Usuario';
            const subject = 'Problema con tu pago en Artix Hub';

            const suspendedBlock = downgraded
              ? `<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:16px;border-radius:6px;margin:20px 0;">
                   <strong>⚠️ Tu acceso ha sido suspendido temporalmente</strong><br>
                   Debido a ${failCount} intentos fallidos de cobro, tu cuenta ha sido cambiada al plan Lector (gratuito).
                   Una vez que actualices tu método de pago, podrás reactivar tu suscripción.
                 </div>`
              : `<p>Intentaremos cobrar de nuevo en los próximos días. Si el problema persiste,
                 tu cuenta puede ser suspendida temporalmente.</p>`;

            const html = `
              <!DOCTYPE html>
              <html>
              <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
              <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
                <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
                  <h1 style="color:white;margin:0;">Artix Hub</h1>
                </div>
                <div style="background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px;">
                  <h2 style="color:#333;margin-top:0;">Problema con tu pago</h2>
                  <p>Hola <strong>${userName}</strong>,</p>
                  <p>No pudimos procesar el pago de tu suscripción. Por favor actualiza tu método de pago
                     para mantener el acceso a todas las funcionalidades de Artix Hub.</p>
                  ${suspendedBlock}
                  <div style="text-align:center;margin:30px 0;">
                    <a href="${process.env.FRONTEND_URL}/subscription"
                       style="background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">
                      Actualizar método de pago
                    </a>
                  </div>
                  <p>Si tienes alguna pregunta, responde a este email o contáctanos en soporte.</p>
                  <p>Saludos,<br><strong>El equipo de Artix Hub</strong></p>
                  <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
                  <p style="font-size:12px;color:#999;text-align:center;">
                    Este es un email automático relacionado con tu suscripción.
                  </p>
                </div>
              </body>
              </html>
            `;

            await emailService.sendEmail(user.email, subject, html);
            console.log(`[Stripe Webhook] Email de pago fallido enviado a ${user.email}`);
          } catch (emailErr) {
            // El email no debe bloquear el flujo principal
            console.error('[Stripe Webhook] Error enviando email de pago fallido:', emailErr.message);
          }
        }
        break;
      }

      default:
        // Ignorar eventos no manejados
        break;
    }
  } catch (processingErr) {
    // No relanzar — Stripe ya recibirá el 200
    console.error('[Stripe Webhook] Error procesando evento:', processingErr);
  }

  // Siempre responder 200 a Stripe
  res.json({ received: true });
};
