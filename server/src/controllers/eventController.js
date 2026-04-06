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

// Register for event
exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if event exists
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    // Check if already registered
    const existing = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId: id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ ok: false, message: 'Already registered for this event' });
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        userId,
        eventId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
      },
    });

    res.status(201).json({ ok: true, registration });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ ok: false, message: 'Failed to register for event' });
  }
};

