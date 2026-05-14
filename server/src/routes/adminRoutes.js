const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { protect } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/checkAdmin');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

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

module.exports = router;
