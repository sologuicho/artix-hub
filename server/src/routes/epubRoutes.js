const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { generateEpub } = require('../utils/epubGenerator');

const toSlug = (str) => (str || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 60);

router.get('/articles/:id/epub', async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { name: true, username: true } } },
    });
    if (!article) return res.status(404).json({ ok: false, message: 'Not found' });

    const buffer = await generateEpub({
      title: article.title,
      author: article.author?.name || article.author?.username || 'Anónimo',
      content: article.content,
      description: article.description,
      date: article.createdAt,
    });

    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${toSlug(article.title)}.epub"`);
    res.send(buffer);
  } catch (err) {
    console.error('EPUB error:', err);
    res.status(500).json({ ok: false, message: 'Error generating EPUB' });
  }
});

router.get('/research/:id/epub', async (req, res) => {
  try {
    const research = await prisma.research.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { name: true, username: true } } },
    });
    if (!research) return res.status(404).json({ ok: false, message: 'Not found' });

    const buffer = await generateEpub({
      title: research.title,
      author: research.author?.name || research.author?.username || 'Anónimo',
      content: research.content,
      description: research.description,
      date: research.createdAt,
    });

    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${toSlug(research.title)}.epub"`);
    res.send(buffer);
  } catch (err) {
    console.error('EPUB error:', err);
    res.status(500).json({ ok: false, message: 'Error generating EPUB' });
  }
});

module.exports = router;
