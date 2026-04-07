const emailService = require('../services/emailService');

function startEmailReminderJob() {
  if (process.env.NODE_ENV === 'test') return;

  // Run immediately on startup
  emailService.checkAndSendReminders().catch(console.error);

  // Then every hour
  setInterval(() => {
    emailService.checkAndSendReminders().catch(console.error);
  }, 60 * 60 * 1000);
}

module.exports = { startEmailReminderJob };
