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
