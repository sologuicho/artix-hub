/**
 * AI Validation API Service
 * 
 * NOTE: This is a separate service from the main Express server (src/index.js).
 * This file uses ES6 modules and requires Node.js 14+ with ES modules support.
 * 
 * To run this service:
 * 1. Either add "type": "module" to package.json (will break CommonJS main server)
 * 2. Or run with: node --experimental-modules index.js
 * 3. Or convert this file to CommonJS
 * 
 * Default port: 4001 (to avoid conflict with main server on 4000)
 * Set API_PORT in .env to change
 */

import express from 'express';
import dotenv from 'dotenv';
import articleHandler from '../pages/api/validate/article.js';
import blogHandler from '../pages/api/validate/blog.js';
import eventHandler from '../pages/api/validate/event.js';
import profileHandler from '../pages/api/validate/profile.js';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(express.json({ limit: '2mb' }));

const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

app.post('/api/validate/article', wrap(articleHandler));
app.post('/api/validate/blog', wrap(blogHandler));
app.post('/api/validate/event', wrap(eventHandler));
app.post('/api/validate/profile', wrap(profileHandler));

// Use different port to avoid conflict with main server (src/index.js)
const PORT = process.env.API_PORT || 4001;

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('AI Validation API error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    details: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`✅ AI validation API running on http://localhost:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

