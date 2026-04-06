/**
 * articleController — HTTP layer only.
 *
 * No Prisma, no business logic, no AI calls.
 * Each handler: parse → call service → respond.
 */
const articleService = require('../services/article/articleService');

// ——————————————————————————————————————————
// Error response helper
// ——————————————————————————————————————————
const handleError = (res, error, context) => {
  if (error.code === 'NOT_FOUND') return res.status(404).json({ ok: false, message: error.message });
  if (error.code === 'UNAUTHORIZED') return res.status(403).json({ ok: false, message: error.message });
  console.error(`[articleController] ${context}:`, error);
  res.status(500).json({ ok: false, message: `Failed to ${context}` });
};

// GET /api/articles/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await articleService.getCategories();
    res.json({ ok: true, categories });
  } catch (error) { handleError(res, error, 'fetch categories'); }
};

// GET /api/articles
exports.getAllArticles = async (req, res) => {
  try {
    const result = await articleService.getAllArticles(req.query);
    res.json({ ok: true, ...result });
  } catch (error) { handleError(res, error, 'fetch articles'); }
};

// GET /api/articles/:id
exports.getArticle = async (req, res) => {
  try {
    const article = await articleService.getArticle(req.params.id, req.user);
    res.json({ ok: true, article });
  } catch (error) { handleError(res, error, 'fetch article'); }
};

// POST /api/articles
exports.createArticle = async (req, res) => {
  try {
    const article = await articleService.createArticle(req.body, req.user);
    res.status(201).json({ ok: true, article });
  } catch (error) { handleError(res, error, 'create article'); }
};

// PUT /api/articles/:id
exports.updateArticle = async (req, res) => {
  try {
    const article = await articleService.updateArticle(req.params.id, req.body, req.user);
    res.json({ ok: true, article });
  } catch (error) { handleError(res, error, 'update article'); }
};

// DELETE /api/articles/:id
exports.deleteArticle = async (req, res) => {
  try {
    await articleService.deleteArticle(req.params.id, req.user);
    res.json({ ok: true, message: 'Article deleted successfully' });
  } catch (error) { handleError(res, error, 'delete article'); }
};

// POST /api/articles/:id/archive
exports.archiveArticle = async (req, res) => {
  try {
    const article = await articleService.setArchived(req.params.id, true, req.user);
    res.json({ ok: true, article });
  } catch (error) { handleError(res, error, 'archive article'); }
};

// POST /api/articles/:id/unarchive
exports.unarchiveArticle = async (req, res) => {
  try {
    const article = await articleService.setArchived(req.params.id, false, req.user);
    res.json({ ok: true, article });
  } catch (error) { handleError(res, error, 'unarchive article'); }
};

// POST /api/articles/:id/comments
exports.addComment = async (req, res) => {
  try {
    const comment = await articleService.addComment(req.params.id, req.body.content, req.user);
    res.status(201).json({ ok: true, comment });
  } catch (error) { handleError(res, error, 'add comment'); }
};
