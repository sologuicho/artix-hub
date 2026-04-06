const prisma = require('../prismaClient');
const { createNotification } = require('./notificationController');

// Helper function to check if user can manage content (including Artix Research content for luisflores01)
const canManageContent = async (authorId, userId, userUsername, userRole) => {
  // If user is the author, allow
  if (authorId === userId) return true;
  
  // If user is admin, allow
  if (userRole === 'admin') return true;
  
  // If user is luisflores01 and content was published by Artix Research, allow
  if (userUsername === 'luisflores01') {
    const artixUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'artixresearch' },
          { username: 'artix-research' },
          { name: 'Artix Research' }
        ]
      }
    });
    if (artixUser && authorId === artixUser.id) {
      return true;
    }
  }
  
  return false;
};

// Invite collaborator to article
exports.inviteArticleCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = 'collaborator' } = req.body;
    const inviterId = req.user.id;

    // Check if article exists and user is the author
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return res.status(404).json({ ok: false, message: 'Article not found' });
    }

    const canInvite = await canManageContent(article.authorId, inviterId, req.user.username, req.user.role);
    if (!canInvite) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    // Check if already invited
    const existing = await prisma.articleCollaborator.findUnique({
      where: {
        articleId_userId: { articleId: id, userId }
      }
    });

    if (existing) {
      return res.status(400).json({ ok: false, message: 'User already invited' });
    }

    const collaboration = await prisma.articleCollaborator.create({
      data: {
        articleId: id,
        userId,
        role,
        invitedBy: inviterId,
        status: 'pending'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // Send notification
    await createNotification(
      userId,
      'collaboration_invite',
      'Invitación a colaborar',
      `${req.user.name || req.user.username} te invitó a colaborar en el artículo "${article.title}"`,
      `/articles/${id}`
    );

    res.status(201).json({ ok: true, collaboration });
  } catch (error) {
    console.error('Error inviting collaborator:', error);
    res.status(500).json({ ok: false, message: 'Failed to invite collaborator' });
  }
};

// Respond to collaboration invitation
exports.respondToArticleInvitation = async (req, res) => {
  try {
    const { id, collaborationId } = req.params;
    const { accept } = req.body;
    const userId = req.user.id;

    const collaboration = await prisma.articleCollaborator.findUnique({
      where: { id: collaborationId },
      include: { article: true }
    });

    if (!collaboration || collaboration.userId !== userId || collaboration.articleId !== id) {
      return res.status(404).json({ ok: false, message: 'Invitation not found' });
    }

    if (collaboration.status !== 'pending') {
      return res.status(400).json({ ok: false, message: 'Invitation already responded' });
    }

    await prisma.articleCollaborator.update({
      where: { id: collaborationId },
      data: {
        status: accept ? 'accepted' : 'rejected'
      }
    });

    // Notify article author
    if (accept) {
      await createNotification(
        collaboration.article.authorId,
        'collaboration_accepted',
        'Colaboración aceptada',
        `${req.user.name || req.user.username} aceptó colaborar en tu artículo "${collaboration.article.title}"`,
        `/articles/${id}`
      );
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ ok: false, message: 'Failed to respond to invitation' });
  }
};

// Get article collaborations
exports.getArticleCollaborations = async (req, res) => {
  try {
    const { id } = req.params;

    const collaborations = await prisma.articleCollaborator.findMany({
      where: { articleId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    res.json({ ok: true, collaborations });
  } catch (error) {
    console.error('Error fetching collaborations:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch collaborations' });
  }
};

// Invite collaborator to event
exports.inviteEventCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = 'collaborator' } = req.body;
    const inviterId = req.user.id;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({ ok: false, message: 'Event not found' });
    }

    const canInvite = await canManageContent(event.creatorId, inviterId, req.user.username, req.user.role);
    if (!canInvite) {
      return res.status(403).json({ ok: false, message: 'Not authorized' });
    }

    const existing = await prisma.eventCollaborator.findUnique({
      where: {
        eventId_userId: { eventId: id, userId }
      }
    });

    if (existing) {
      return res.status(400).json({ ok: false, message: 'User already invited' });
    }

    const collaboration = await prisma.eventCollaborator.create({
      data: {
        eventId: id,
        userId,
        role,
        invitedBy: inviterId,
        status: 'pending'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    await createNotification(
      userId,
      'collaboration_invite',
      'Invitación a colaborar',
      `${req.user.name || req.user.username} te invitó a colaborar en el evento "${event.title}"`,
      `/events/${id}`
    );

    res.status(201).json({ ok: true, collaboration });
  } catch (error) {
    console.error('Error inviting collaborator:', error);
    res.status(500).json({ ok: false, message: 'Failed to invite collaborator' });
  }
};

// Respond to event collaboration invitation
exports.respondToEventInvitation = async (req, res) => {
  try {
    const { id, collaborationId } = req.params;
    const { accept } = req.body;
    const userId = req.user.id;

    const collaboration = await prisma.eventCollaborator.findUnique({
      where: { id: collaborationId },
      include: { event: true }
    });

    if (!collaboration || collaboration.userId !== userId || collaboration.eventId !== id) {
      return res.status(404).json({ ok: false, message: 'Invitation not found' });
    }

    if (collaboration.status !== 'pending') {
      return res.status(400).json({ ok: false, message: 'Invitation already responded' });
    }

    await prisma.eventCollaborator.update({
      where: { id: collaborationId },
      data: {
        status: accept ? 'accepted' : 'rejected'
      }
    });

    if (accept) {
      await createNotification(
        collaboration.event.creatorId,
        'collaboration_accepted',
        'Colaboración aceptada',
        `${req.user.name || req.user.username} aceptó colaborar en tu evento "${collaboration.event.title}"`,
        `/events/${id}`
      );
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ ok: false, message: 'Failed to respond to invitation' });
  }
};

// Get event collaborations
exports.getEventCollaborations = async (req, res) => {
  try {
    const { id } = req.params;

    const collaborations = await prisma.eventCollaborator.findMany({
      where: { eventId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    res.json({ ok: true, collaborations });
  } catch (error) {
    console.error('Error fetching collaborations:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch collaborations' });
  }
};



