// Email service using nodemailer
// Supports Gmail, SendGrid, AWS SES, and other SMTP providers

const nodemailer = require('nodemailer');

// Create transporter based on environment variables
const createTransporter = () => {
  // Check if using SendGrid
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // Check if using AWS SES
  if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
    return nodemailer.createTransport({
      SES: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
        region: process.env.AWS_SES_REGION || 'us-east-1'
      }
    });
  }

  // Default: SMTP (Gmail, custom SMTP, etc.)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendEmail = async (to, subject, html, text = null) => {
  try {
    // If no email config, just log (development mode)
    if (!process.env.SMTP_USER && !process.env.SENDGRID_API_KEY && !process.env.AWS_SES_ACCESS_KEY_ID) {
      console.log(`[EMAIL] Would send to ${to}: ${subject}`);
      console.log(`[EMAIL] Content: ${text || html.substring(0, 100)}...`);
      return true;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@artixhub.com',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error);
    throw error;
  }
};

exports.sendEventReminder = async (user, event, reminderType) => {
  const subject = reminderType === 'day_before' 
    ? `Recordatorio: ${event.title} es mañana`
    : `Recordatorio: ${event.title} es hoy`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Artix Hub</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">${subject}</h2>
        <p>Hola <strong>${user.name || user.username || 'Usuario'}</strong>,</p>
        <p>Este es un recordatorio de que tienes un evento registrado:</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="margin-top: 0; color: #667eea;">${event.title}</h3>
          <p><strong>📅 Fecha:</strong> ${new Date(event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          ${event.time ? `<p><strong>🕐 Hora:</strong> ${event.time}</p>` : ''}
          ${event.location ? `<p><strong>📍 Ubicación:</strong> ${event.location}</p>` : ''}
          ${event.type ? `<p><strong>🏷️ Tipo:</strong> ${event.type}</p>` : ''}
        </div>
        <p style="margin-top: 30px;">¡Te esperamos!</p>
        <p>Saludos,<br><strong>El equipo de Artix Hub</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">
          Este es un email automático. Por favor no respondas a este mensaje.
        </p>
      </div>
    </body>
    </html>
  `;

  if (user.email) {
    await sendEmail(user.email, subject, html);
  }
};

// Send notification email
exports.sendNotificationEmail = async (user, notification) => {
  const subject = notification.title || 'Nueva notificación de Artix Hub';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Artix Hub</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">${subject}</h2>
        <p>Hola <strong>${user.name || user.username || 'Usuario'}</strong>,</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
          <p style="margin: 0;">${notification.message || notification.content}</p>
        </div>
        ${notification.link ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${notification.link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver más</a>
          </div>
        ` : ''}
        <p>Saludos,<br><strong>El equipo de Artix Hub</strong></p>
      </div>
    </body>
    </html>
  `;

  if (user.email) {
    await sendEmail(user.email, subject, html);
  }
};

exports.sendWelcome = async (user) => {
  const name = user.name || user.username || 'Usuario';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;">Artix Hub</h1>
      </div>
      <div style="background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px;">
        <h2 style="color:#333;margin-top:0;">Bienvenido, ${name}</h2>
        <p>Tu cuenta en Artix Hub ha sido creada exitosamente.</p>
        <p>Ahora puedes explorar investigaciones, artículos, eventos y conectar con otros miembros de la comunidad.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${frontendUrl}" style="background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">
            Explorar Artix Hub
          </a>
        </div>
        <p>Saludos,<br><strong>El equipo de Artix Hub</strong></p>
      </div>
    </body>
    </html>
  `;
  if (user.email) await sendEmail(user.email, 'Bienvenido a Artix Hub', html);
};

exports.sendPaymentConfirmation = async (user, tier, renewalDate) => {
  const name = user.name || user.username || 'Usuario';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const tierNames = { STUDENT: 'Estudiante', RESEARCHER: 'Investigador', VISIONARY: 'Visionario', TEAM: 'Equipo' };
  const tierLabel = tierNames[tier] || tier;
  const renewal = renewalDate ? new Date(renewalDate * 1000).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;">Artix Hub</h1>
      </div>
      <div style="background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px;">
        <h2 style="color:#333;margin-top:0;">Tu suscripción ${tierLabel} está activa</h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Tu pago fue procesado exitosamente y tu plan <strong>${tierLabel}</strong> está ahora activo.</p>
        ${renewal ? `<p style="color:#555;">Próxima renovación: <strong>${renewal}</strong></p>` : ''}
        <div style="text-align:center;margin:30px 0;">
          <a href="${frontendUrl}/subscription" style="background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">
            Ver mi suscripción
          </a>
        </div>
        <p>Saludos,<br><strong>El equipo de Artix Hub</strong></p>
      </div>
    </body>
    </html>
  `;
  if (user.email) await sendEmail(user.email, `Tu suscripción ${tierLabel} está activa — Artix Hub`, html);
};

exports.sendEmailVerification = async (user, rawToken) => {
  const name = user.name || user.username || 'Usuario';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyLink = `${frontendUrl}/verify-email?token=${rawToken}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;">Artix Hub</h1>
      </div>
      <div style="background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px;">
        <h2 style="color:#333;margin-top:0;">Verifica tu correo electrónico</h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Haz clic en el botón de abajo para confirmar tu dirección de correo y activar tu cuenta.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${verifyLink}" style="background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">
            Verificar correo
          </a>
        </div>
        <p style="font-size:13px;color:#666;">Este link expira en 24 horas. Si no creaste esta cuenta, ignora este email.</p>
        <p>Saludos,<br><strong>El equipo de Artix Hub</strong></p>
      </div>
    </body>
    </html>
  `;
  if (user.email) await sendEmail(user.email, 'Verifica tu correo — Artix Hub', html);
};

exports.sendStudentApproved = async (user) => {
  const name = user.name || user.username || 'Usuario';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1A1917;padding:30px;text-align:center;">
        <h1 style="color:#FAFAF8;margin:0;font-size:1.5rem;letter-spacing:0.05em;">ARTIX HUB</h1>
      </div>
      <div style="background:#F2F0EC;padding:30px;">
        <h2 style="color:#1A1917;margin-top:0;">Tu plan Estudiante está activo</h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Tu verificación estudiantil fue aprobada. Ahora tienes acceso completo al plan Estudiante: publicar artículos, investigaciones y usar el asistente de escritura con IA.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${frontendUrl}" style="background:#C4451A;color:white;padding:12px 30px;text-decoration:none;display:inline-block;font-family:Arial,sans-serif;font-size:0.875rem;letter-spacing:0.05em;text-transform:uppercase;">
            Ir a Artix Hub
          </a>
        </div>
        <p>Saludos,<br><strong>El equipo de Artix Hub</strong></p>
      </div>
    </body>
    </html>
  `;
  if (user.email) await sendEmail(user.email, 'Tu plan Estudiante está activo — Artix Hub', html);
};

exports.sendStudentRejected = async (user, reason) => {
  const name = user.name || user.username || 'Usuario';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1A1917;padding:30px;text-align:center;">
        <h1 style="color:#FAFAF8;margin:0;font-size:1.5rem;letter-spacing:0.05em;">ARTIX HUB</h1>
      </div>
      <div style="background:#F2F0EC;padding:30px;">
        <h2 style="color:#1A1917;margin-top:0;">Tu solicitud no fue aprobada</h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Revisamos tu solicitud de verificación estudiantil y no pudimos aprobarla en este momento.</p>
        ${reason ? `<div style="background:white;padding:16px;border-left:3px solid #C4451A;margin:20px 0;"><p style="margin:0;color:#555;"><strong>Motivo:</strong> ${reason}</p></div>` : ''}
        <p>Puedes intentarlo de nuevo con un email institucional válido o subiendo un documento actualizado.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${frontendUrl}/student-verification" style="background:#C4451A;color:white;padding:12px 30px;text-decoration:none;display:inline-block;font-family:Arial,sans-serif;font-size:0.875rem;letter-spacing:0.05em;text-transform:uppercase;">
            Intentar de nuevo
          </a>
        </div>
        <p>Saludos,<br><strong>El equipo de Artix Hub</strong></p>
      </div>
    </body>
    </html>
  `;
  if (user.email) await sendEmail(user.email, 'Sobre tu solicitud de verificación — Artix Hub', html);
};

exports.sendPasswordReset = async (user, rawToken) => {
  const name = user.name || user.username || 'Usuario';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:10px 10px 0 0;text-align:center;">
        <h1 style="color:white;margin:0;">Artix Hub</h1>
      </div>
      <div style="background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px;">
        <h2 style="color:#333;margin-top:0;">Restablecer contraseña</h2>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${resetLink}" style="background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;display:inline-block;">
            Crear nueva contraseña
          </a>
        </div>
        <p style="font-size:13px;color:#666;">Este link expira en 1 hora. Si no solicitaste este cambio, ignora este email — tu contraseña no será modificada.</p>
        <p>Saludos,<br><strong>El equipo de Artix Hub</strong></p>
      </div>
    </body>
    </html>
  `;
  if (user.email) await sendEmail(user.email, 'Restablecer contraseña — Artix Hub', html);
};

// Cron job function to check and send reminders
exports.checkAndSendReminders = async () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Find reminders that should be sent
    const reminders = await prisma.eventReminder.findMany({
      where: {
        sent: false,
        scheduledFor: {
          gte: now,
          lte: oneHourFromNow
        }
      },
      include: {
        user: true,
        event: true
      }
    });

    for (const reminder of reminders) {
      try {
        await exports.sendEventReminder(reminder.user, reminder.event, reminder.reminderType);
        
        // Mark as sent
        await prisma.eventReminder.update({
          where: { id: reminder.id },
          data: { sent: true }
        });
      } catch (error) {
        console.error(`Error sending reminder ${reminder.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  } finally {
    await prisma.$disconnect();
  }
};
