// Basic validation middleware
const validateArticle = (req, res, next) => {
  const { title, content, category } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  }
  if (!content || content.trim().length === 0) {
    errors.push('Content is required');
  }
  if (!category || category.trim().length === 0) {
    errors.push('Category is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  next();
};

const validateEvent = (req, res, next) => {
  const { title, description, date, location, type } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  }
  if (!description || description.trim().length === 0) {
    errors.push('Description is required');
  }
  if (!date) {
    errors.push('Date is required');
  }
  if (!location || location.trim().length === 0) {
    errors.push('Location is required');
  }
  if (!type || type.trim().length === 0) {
    errors.push('Type is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  next();
};

const validateBlogPost = (req, res, next) => {
  const { title, content, category } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  }
  if (!content || content.trim().length === 0) {
    errors.push('Content is required');
  }
  if (!category || category.trim().length === 0) {
    errors.push('Category is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  next();
};

const validateComment = (req, res, next) => {
  const { content } = req.body;
  const errors = [];

  if (!content || content.trim().length === 0) {
    errors.push('Content is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  next();
};

module.exports = {
  validateArticle,
  validateEvent,
  validateBlogPost,
  validateComment,
};

