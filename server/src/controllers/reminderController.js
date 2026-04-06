const prisma = require('../prismaClient');

// Create or update event reminder
exports.setEventReminder = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reminderType } = req.body; // "day_before" or "morning_of"
    const userId = req.user.id;

    // Check if event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    // Check if user is registered
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: { userId, eventId }
      }
    });

    if (!registration) {
      return res.status(400).json({ ok: false, message: 'You must be registered for this event' });
    }

    // Calculate scheduled time
    const eventDate = new Date(event.date);
    let scheduledFor;
    
    if (reminderType === 'day_before') {
      scheduledFor = new Date(eventDate);
      scheduledFor.setDate(scheduledFor.getDate() - 1);
      scheduledFor.setHours(9, 0, 0, 0); // 9 AM the day before
    } else if (reminderType === 'morning_of') {
      scheduledFor = new Date(eventDate);
      scheduledFor.setHours(8, 0, 0, 0); // 8 AM the day of
    } else {
      return res.status(400).json({ ok: false, message: 'Invalid reminder type' });
    }

    // Check if reminder already exists
    const existing = await prisma.eventReminder.findFirst({
      where: {
        userId,
        eventId,
        reminderType
      }
    });

    if (existing) {
      // Update existing reminder
      const reminder = await prisma.eventReminder.update({
        where: { id: existing.id },
        data: {
          scheduledFor,
          sent: false
        }
      });
      return res.json({ ok: true, reminder });
    } else {
      // Create new reminder
      const reminder = await prisma.eventReminder.create({
        data: {
          userId,
          eventId,
          reminderType,
          scheduledFor
        }
      });
      return res.json({ ok: true, reminder });
    }
  } catch (error) {
    console.error('Error setting reminder:', error);
    res.status(500).json({ ok: false, message: 'Failed to set reminder' });
  }
};

// Remove event reminder
exports.removeEventReminder = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reminderType } = req.body;
    const userId = req.user.id;

    const reminder = await prisma.eventReminder.findFirst({
      where: {
        userId,
        eventId,
        reminderType
      }
    });

    if (!reminder) {
      return res.status(404).json({ ok: false, message: 'Reminder not found' });
    }

    await prisma.eventReminder.delete({ where: { id: reminder.id } });
    res.json({ ok: true, message: 'Reminder removed' });
  } catch (error) {
    console.error('Error removing reminder:', error);
    res.status(500).json({ ok: false, message: 'Failed to remove reminder' });
  }
};

// Get user's reminders for an event
exports.getEventReminders = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const reminders = await prisma.eventReminder.findMany({
      where: {
        userId,
        eventId
      }
    });

    res.json({ ok: true, reminders });
  } catch (error) {
    console.error('Error getting reminders:', error);
    res.status(500).json({ ok: false, message: 'Failed to get reminders' });
  }
};






