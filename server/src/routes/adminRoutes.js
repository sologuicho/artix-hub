const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { protect } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/checkAdmin');
const { verifyCsrf } = require('../middleware/csrfMiddleware');
const emailService = require('../services/emailService');

// Base middlewares for all admin routes: protect + checkAdmin
router.use(protect);
router.use(checkAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    
    // Group by subscription Tier
    const tierStats = await prisma.user.groupBy({
      by: ['subscriptionTier'],
      _count: {
        _all: true
      }
    });

    const totalArticles = await prisma.article.count();
    const totalBlogs = await prisma.blogPost.count();
    
    // Format tiers nicely
    const usersByTier = {};
    tierStats.forEach(stat => {
      usersByTier[stat.subscriptionTier] = stat._count._all;
    });

    res.json({
      ok: true,
      stats: {
        totalUsers,
        totalArticles,
        totalBlogs,
        usersByTier
      }
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ ok: false, message: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
          role: true,
          subscriptionTier: true,
          banned: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      ok: true,
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ ok: false, message: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id/tier
// Remember: For POST/PUT/PATCH we invoke verifyCsrf
router.patch('/users/:id/tier', verifyCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    const { tier } = req.body;

    const validTiers = ['OBSERVER', 'STUDENT', 'RESEARCHER', 'VISIONARY', 'TEAM'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ ok: false, message: 'Invalid subscription tier' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { subscriptionTier: tier },
      select: { id: true, subscriptionTier: true, name: true }
    });

    res.json({ ok: true, user: updatedUser });
  } catch (err) {
    console.error('Error updating user tier:', err);
    res.status(500).json({ ok: false, message: 'Failed to update user tier' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', verifyCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ ok: false, message: 'Invalid role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, role: true, name: true }
    });

    res.json({ ok: true, user: updatedUser });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ ok: false, message: 'Failed to update user role' });
  }
});

// PATCH /api/admin/users/:id/ban
router.patch('/users/:id/ban', verifyCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    const { banned } = req.body;

    if (typeof banned !== 'boolean') {
      return res.status(400).json({ ok: false, message: 'Banned flag must be a boolean' });
    }
    
    // Prevent admin from banning themselves accidentally
    if (id === req.user.id) {
       return res.status(400).json({ ok: false, message: 'No puedes banearte a ti mismo' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { banned },
      select: { id: true, banned: true, name: true }
    });

    res.json({ ok: true, user: updatedUser });
  } catch (err) {
    console.error('Error updating user ban status:', err);
    res.status(500).json({ ok: false, message: 'Failed to update user ban status' });
  }
});

// GET /api/admin/content
router.get('/content', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const type  = req.query.type; // article | research | event | blogpost

    const AUTHOR_SEL = { select: { id: true, name: true, email: true } };

    const fetchArticles  = () => prisma.article.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, title: true, status: true, createdAt: true, authorId: true, author: AUTHOR_SEL } }).then(rs => rs.map(r => ({ ...r, type: 'article' })));
    const fetchResearch  = () => prisma.research.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, title: true, status: true, createdAt: true, authorId: true, author: AUTHOR_SEL } }).then(rs => rs.map(r => ({ ...r, type: 'research' })));
    const fetchEvents    = () => prisma.event.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, title: true, createdAt: true, creatorId: true, creator: AUTHOR_SEL } }).then(rs => rs.map(r => ({ ...r, status: 'published', authorId: r.creatorId, author: r.creator, type: 'event' })));
    const fetchBlogPosts = () => prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, title: true, createdAt: true, authorId: true, author: AUTHOR_SEL } }).then(rs => rs.map(r => ({ ...r, status: 'published', type: 'blogpost' })));

    let items = [];
    if (!type || type === 'article')  items.push(...await fetchArticles());
    if (!type || type === 'research') items.push(...await fetchResearch());
    if (!type || type === 'event')    items.push(...await fetchEvents());
    if (!type || type === 'blogpost') items.push(...await fetchBlogPosts());

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total   = items.length;
    const offset  = (page - 1) * limit;
    const content = items.slice(offset, offset + limit).map(({ authorId, creatorId, creator, ...rest }) => rest);

    res.json({ ok: true, content, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching admin content:', err);
    res.status(500).json({ ok: false, message: 'Failed to fetch content' });
  }
});

// DELETE /api/admin/content/:type/:id
router.delete('/content/:type/:id', verifyCsrf, async (req, res) => {
  const { type, id } = req.params;
  const adminId = req.user.id;

  const MODELS = {
    article:  { model: 'article',  authorField: 'authorId' },
    research: { model: 'research', authorField: 'authorId' },
    event:    { model: 'event',    authorField: 'creatorId' },
    blogpost: { model: 'blogPost', authorField: 'authorId' },
  };

  const def = MODELS[type];
  if (!def) return res.status(400).json({ ok: false, message: 'Tipo de contenido inválido' });

  try {
    const item = await prisma[def.model].findUnique({ where: { id }, select: { [def.authorField]: true } });
    if (!item) return res.status(404).json({ ok: false, message: 'Contenido no encontrado' });

    if (item[def.authorField] === adminId) {
      return res.status(400).json({ ok: false, message: 'No puedes eliminar tu propio contenido desde el panel admin' });
    }

    await prisma[def.model].delete({ where: { id } });
    res.json({ ok: true, message: 'Contenido eliminado correctamente' });
  } catch (err) {
    console.error('Error deleting content:', err);
    res.status(500).json({ ok: false, message: 'Failed to delete content' });
  }
});

// GET /api/admin/student-verifications
router.get('/student-verifications', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [verifications, total] = await Promise.all([
      prisma.studentVerification.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.studentVerification.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      ok: true,
      verifications,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    console.error('Error fetching student verifications:', err);
    res.status(500).json({ ok: false, message: 'Failed to fetch student verifications' });
  }
});

// POST /api/admin/student-verifications/:id/approve
router.post('/student-verifications/:id/approve', verifyCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    const verification = await prisma.studentVerification.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!verification) return res.status(404).json({ ok: false, message: 'Verificación no encontrada.' });

    await prisma.$transaction([
      prisma.studentVerification.update({ where: { id }, data: { status: 'APPROVED' } }),
      prisma.user.update({ where: { id: verification.userId }, data: { subscriptionTier: 'STUDENT' } }),
    ]);

    try { await emailService.sendStudentApproved(verification.user); } catch (_) {}

    res.json({ ok: true, message: 'Verificación aprobada.' });
  } catch (err) {
    console.error('Error approving student verification:', err);
    res.status(500).json({ ok: false, message: 'Failed to approve verification' });
  }
});

// POST /api/admin/student-verifications/:id/reject
router.post('/student-verifications/:id/reject', verifyCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const verification = await prisma.studentVerification.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!verification) return res.status(404).json({ ok: false, message: 'Verificación no encontrada.' });

    await prisma.studentVerification.update({
      where: { id },
      data: { status: 'REJECTED', reviewNote: reason || '' },
    });

    try { await emailService.sendStudentRejected(verification.user, reason); } catch (_) {}

    res.json({ ok: true, message: 'Verificación rechazada.' });
  } catch (err) {
    console.error('Error rejecting student verification:', err);
    res.status(500).json({ ok: false, message: 'Failed to reject verification' });
  }
});

module.exports = router;
