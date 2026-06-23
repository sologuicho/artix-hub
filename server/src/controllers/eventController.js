const prisma = require('../prismaClient');

// Get unique event types
exports.getCategories = async (req, res) => {
  try {
    const types = await prisma.event.findMany({
      where: {
        type: { not: null },
        archived: false
      },
      select: { type: true },
      distinct: ['type'],
      orderBy: { type: 'asc' }
    });

    const typeList = types
      .map(t => t.type)
      .filter(t => t && t.trim() !== '')
      .sort();

    res.json({ ok: true, categories: typeList });
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch event types' });
  }
};

// Get all events with pagination and filters
exports.getAllEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search, upcoming, dateFrom, dateTo, creatorId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    // By default, exclude archived events unless explicitly requested
    if (!req.query.includeArchived) {
      where.archived = false;
    }
    if (type) where.type = type;
    if (creatorId) {
      where.creatorId = creatorId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    // Only filter by date if explicitly requested
    if (upcoming === 'true') {
      where.date = { gte: new Date() };
    } else if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59.999Z');
    }
    // If no date filter, show all events

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: { registrations: true },
          },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      ok: true,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch events' });
  }
};

// Get single event
exports.getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    res.json({ ok: true, event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch event' });
  }
};

// Create event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, time, location, type, tags, bannerUrl, publishAsArtixResearch } = req.body;
    const userId = req.user.id;
    
    // Si el usuario es luisflores01 y quiere publicar como Artix Research
    let creatorId = userId;
    if (publishAsArtixResearch && req.user.username === 'luisflores01') {
      // Buscar o crear el usuario Artix Research
      let artixUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: 'artixresearch' },
            { username: 'artix-research' },
            { name: 'Artix Research' }
          ]
        }
      });
      
      if (!artixUser) {
        // Crear el usuario Artix Research si no existe
        artixUser = await prisma.user.create({
          data: {
            provider: 'system',
            providerId: 'artix-research',
            username: 'artixresearch',
            name: 'Artix Research',
            email: 'research@artixhub.com',
            role: 'user',
            profileComplete: true,
            bio: 'Cuenta oficial de investigación de Artix Hub. Publicamos artículos científicos, investigaciones avanzadas y contenido académico de alta calidad sobre física cuántica, inteligencia artificial, química computacional y más.',
            occupation: 'Organización de Investigación',
            country: 'Global',
            interests: ['Quantum Physics', 'AI Research', 'Chemistry', 'Machine Learning', 'Data Science']
          }
        });
      }
      
      creatorId = artixUser.id;
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        time,
        location,
        type,
        tags: tags || [],
        bannerUrl,
        creatorId: creatorId,
        maxAttendees: req.body.maxAttendees ? parseInt(req.body.maxAttendees) : null,
        ticketPrice: req.body.ticketPrice ? parseFloat(req.body.ticketPrice) : null,
        ticketCurrency: req.body.ticketCurrency || 'MXN',
        streamUrl: req.body.streamUrl || null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({ ok: true, event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ ok: false, message: 'Failed to create event' });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, time, location, type, tags, bannerUrl } = req.body;
    const userId = req.user.id;

    // Check if event exists and user owns it
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }
    
    const canEdit = await canManageContent(existing.creatorId, userId, req.user.username, req.user.role);
    if (!canEdit) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(time !== undefined && { time }),
        ...(location !== undefined && { location }),
        ...(type !== undefined && { type }),
        ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(req.body.maxAttendees !== undefined && { maxAttendees: req.body.maxAttendees ? parseInt(req.body.maxAttendees) : null }),
        ...(req.body.ticketPrice !== undefined && { ticketPrice: req.body.ticketPrice ? parseFloat(req.body.ticketPrice) : null }),
        ...(req.body.ticketCurrency !== undefined && { ticketCurrency: req.body.ticketCurrency }),
        ...(req.body.streamUrl !== undefined && { streamUrl: req.body.streamUrl || null }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    res.json({ ok: true, event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ ok: false, message: 'Failed to update event' });
  }
};

// Archive/Unarchive event
exports.archiveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { archived } = req.body;
    const userId = req.user.id;

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }
    
    const canArchive = await canManageContent(existing.creatorId, userId, req.user.username, req.user.role);
    if (!canArchive) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: { archived: archived === true },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    res.json({ ok: true, event, message: archived ? 'Event archived' : 'Event unarchived' });
  } catch (error) {
    console.error('Error archiving event:', error);
    res.status(500).json({ ok: false, message: 'Failed to archive event' });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if event exists and user owns it
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }
    
    const canDelete = await canManageContent(existing.creatorId, userId, req.user.username, req.user.role);
    if (!canDelete) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    await prisma.event.delete({ where: { id } });
    res.json({ ok: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ ok: false, message: 'Failed to delete event' });
  }
};

// Register for event (handles capacity, waitlist, and paid tickets)
exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    });
    if (!event) return res.status(404).json({ ok: false, message: 'Event not found' });

    // Already registered?
    const existing = await prisma.eventRegistration.findUnique({
      where: { userId_eventId: { userId, eventId: id } },
    });
    if (existing) return res.status(400).json({ ok: false, message: 'Ya estás inscrito en este evento' });

    // Paid event — create Stripe checkout session
    if (event.ticketPrice && event.ticketPrice > 0) {
      const { stripe } = require('../config/payments');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: req.user.email,
        line_items: [{
          price_data: {
            currency: (event.ticketCurrency || 'MXN').toLowerCase(),
            product_data: { name: event.title, description: `Entrada para: ${event.title}` },
            unit_amount: Math.round(event.ticketPrice * 100),
          },
          quantity: 1,
        }],
        metadata: { userId, eventId: id, type: 'event_ticket' },
        success_url: `${frontendUrl}/events/${id}?registered=1`,
        cancel_url: `${frontendUrl}/events/${id}`,
      });
      return res.json({ ok: true, checkoutUrl: session.url, paid: true });
    }

    // Check capacity
    if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
      // Add to waitlist
      const onWaitlist = await prisma.eventWaitlist.findUnique({
        where: { userId_eventId: { userId, eventId: id } },
      });
      if (onWaitlist) return res.status(400).json({ ok: false, message: 'Ya estás en la lista de espera' });

      await prisma.eventWaitlist.create({ data: { userId, eventId: id } });
      const position = await prisma.eventWaitlist.count({ where: { eventId: id } });
      return res.status(202).json({ ok: true, waitlisted: true, position });
    }

    // Free event with capacity available — register directly
    const registration = await prisma.eventRegistration.create({
      data: { userId, eventId: id },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        event: { select: { id: true, title: true, date: true, time: true, location: true, type: true } },
      },
    });

    const emailService = require('../services/emailService');
    emailService.sendEventRegistration(registration.user, registration.event).catch(err => {
      console.error('Error sending event registration email:', err);
    });

    res.status(201).json({ ok: true, registration });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ ok: false, message: 'Failed to register for event' });
  }
};

// Unregister from event
exports.unregisterFromEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.eventRegistration.findUnique({
      where: { userId_eventId: { userId, eventId: id } },
    });
    if (!existing) return res.status(404).json({ ok: false, message: 'No estás inscrito' });

    await prisma.eventRegistration.delete({ where: { userId_eventId: { userId, eventId: id } } });

    // Promote first person on waitlist
    const event = await prisma.event.findUnique({
      where: { id }, include: { _count: { select: { registrations: true } } },
    });
    if (event?.maxAttendees) {
      const first = await prisma.eventWaitlist.findFirst({
        where: { eventId: id },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      });
      if (first) {
        await prisma.$transaction([
          prisma.eventWaitlist.delete({ where: { userId_eventId: { userId: first.userId, eventId: id } } }),
          prisma.eventRegistration.create({ data: { userId: first.userId, eventId: id } }),
        ]);
        // Notify promoted user
        const emailService = require('../services/emailService');
        emailService.sendEventRegistration(first.user, { id, title: event.title, date: event.date, time: event.time, location: event.location, type: event.type })
          .catch(() => {});
      }
    }

    res.json({ ok: true, message: 'Registro cancelado' });
  } catch (error) {
    console.error('Error unregistering:', error);
    res.status(500).json({ ok: false, message: 'Failed to unregister' });
  }
};

// Get waitlist status for current user
exports.getWaitlistStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const entry = await prisma.eventWaitlist.findUnique({
      where: { userId_eventId: { userId, eventId: id } },
    });
    if (!entry) return res.json({ ok: true, onWaitlist: false });
    const position = await prisma.eventWaitlist.count({
      where: { eventId: id, createdAt: { lte: entry.createdAt } },
    });
    res.json({ ok: true, onWaitlist: true, position });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error' });
  }
};

// Toggle live status (organizer only)
exports.setLive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isLive, streamUrl } = req.body;
    const userId = req.user.id;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ ok: false, message: 'Event not found' });

    const canManage = await canManageContent(event.creatorId, userId, req.user.username, req.user.role);
    if (!canManage) return res.status(403).json({ ok: false, message: 'Not authorized' });

    const updated = await prisma.event.update({
      where: { id },
      data: {
        isLive: Boolean(isLive),
        ...(streamUrl !== undefined && { streamUrl: streamUrl || null }),
      },
    });

    // Notify registrants via Socket.IO
    const { getIO } = require('../socket/socketServer');
    try {
      getIO().to(`event-lobby:${id}`).emit('lobby:live', { isLive: updated.isLive, streamUrl: updated.streamUrl });
    } catch (_) {}

    res.json({ ok: true, event: updated });
  } catch (err) {
    console.error('Error setting live:', err);
    res.status(500).json({ ok: false, message: 'Error' });
  }
};

// Get lobby messages (last 100)
exports.getLobbyMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await prisma.eventLobbyMessage.findMany({
      where: { eventId: id },
      include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ ok: true, messages });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error' });
  }
};

