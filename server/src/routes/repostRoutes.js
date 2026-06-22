const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { protect } = require('../middleware/authMiddleware');
const { verifyCsrf } = require('../middleware/csrfMiddleware');

// GET /api/repost/check?articleId=&researchId=&postId=&eventId=
router.get('/check', protect, async (req, res) => {
  try {
    const { articleId, researchId, postId, eventId } = req.query;
    const userId = req.user.id;

    const where = { userId };
    if (articleId) where.articleId = articleId;
    else if (researchId) where.researchId = researchId;
    else if (postId) where.postId = postId;
    else if (eventId) where.eventId = eventId;
    else return res.status(400).json({ ok: false, message: 'Missing content ID' });

    const repost = await prisma.repost.findFirst({ where });
    res.json({ ok: true, reposted: !!repost });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/repost/counts?articleId=&researchId=&postId=&eventId=
router.get('/counts', async (req, res) => {
  try {
    const { articleId, researchId, postId, eventId } = req.query;

    const where = {};
    if (articleId) where.articleId = articleId;
    else if (researchId) where.researchId = researchId;
    else if (postId) where.postId = postId;
    else if (eventId) where.eventId = eventId;
    else return res.status(400).json({ ok: false, message: 'Missing content ID' });

    const count = await prisma.repost.count({ where });
    res.json({ ok: true, count });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// POST /api/repost — toggle repost
router.post('/', protect, verifyCsrf, async (req, res) => {
  try {
    const { articleId, researchId, postId, eventId } = req.body;
    const userId = req.user.id;

    const where = { userId };
    let createData = { userId };

    if (articleId) { where.articleId = articleId; createData.articleId = articleId; }
    else if (researchId) { where.researchId = researchId; createData.researchId = researchId; }
    else if (postId) { where.postId = postId; createData.postId = postId; }
    else if (eventId) { where.eventId = eventId; createData.eventId = eventId; }
    else return res.status(400).json({ ok: false, message: 'Missing content ID' });

    const existing = await prisma.repost.findFirst({ where });
    if (existing) {
      await prisma.repost.delete({ where: { id: existing.id } });
      const count = await prisma.repost.count({ where: { ...where, userId: undefined } });
      return res.json({ ok: true, reposted: false, count });
    }

    await prisma.repost.create({ data: createData });
    const count = await prisma.repost.count({ where: { ...where, userId: undefined } });
    res.json({ ok: true, reposted: true, count });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
