const emailService = require('../services/emailService')
const logger = require('../lib/logger')

function startEmailReminderJob() {
  if (process.env.NODE_ENV === 'test') return

  // Run immediately on startup
  emailService
    .checkAndSendReminders()
    .catch(err => logger.error({ err }, '[emailReminderJob] failed'))

  // Then every hour
  setInterval(
    () => {
      emailService
        .checkAndSendReminders()
        .catch(err => logger.error({ err }, '[emailReminderJob] failed'))
    },
    60 * 60 * 1000
  )
}

module.exports = { startEmailReminderJob }
