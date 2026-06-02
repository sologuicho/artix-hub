require('dotenv').config();
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('./auth/passport');
const logger = require('./lib/logger');
const { generalLimiter } = require('./middleware/rateLimitMiddleware');
const authRoutes = require('./auth/authRoutes');
const articleRoutes = require('./routes/articleRoutes');
const eventRoutes = require('./routes/eventRoutes');
const blogRoutes = require('./routes/blogRoutes');
const readingProgressRoutes = require('./routes/readingProgressRoutes');
const prisma = require('./prismaClient');
const { verifyCsrf } = require('./middleware/csrfMiddleware');
const { protect } = require('./middleware/authMiddleware');
const { initializeSocket } = require('./socket/socketServer');
const { ALLOWED_ORIGINS } = require('./config/urls');
const { startEmailReminderJob } = require('./jobs/emailReminderJob');

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'FRONTEND_URL',
  'BACKEND_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  logger.error({ missingEnvVars }, 'Missing required environment variables');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());

// HTTP request logging — stream pino at 'info' level
app.use(morgan('combined', {
  stream: { write: msg => logger.info(msg.trim()) }
}));

// ⚠️  STRIPE WEBHOOK — DEBE estar ANTES de express.json() para recibir el raw body
//    Stripe verifica la firma criptográfica con el body en bytes, no como objeto JSON
app.post(
  '/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/stripeWebhook')
);

// Increase JSON payload limit to handle base64 images (avatars, covers, etc.)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
// CORS configuration — strict whitelist, no NODE_ENV bypass
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl in dev)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true
}));

// Apply general rate limit to all /api routes (500 req / 15 min)
app.use('/api', generalLimiter);

// Initialize passport strategies
app.use(passport.initialize());

// Root route - serve HTML for browser or JSON for API clients
app.get('/', (req, res) => {
  const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');

  if (acceptsHtml) {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Artix Hub API Server</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; }
            .status { color: #28a745; font-weight: bold; }
            .endpoint { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; }
            .method { color: #007bff; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Artix Hub API Server</h1>
            <p class="status">✅ Servidor funcionando correctamente</p>
            <p><strong>Versión:</strong> 1.0.0</p>
            <p><strong>Puerto:</strong> ${PORT}</p>
            <p><strong>Ambiente:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <h2>Endpoints disponibles:</h2>
            <div class="endpoint"><span class="method">GET</span> /health - Estado del servidor</div>
            <div class="endpoint"><span class="method">GET</span> /auth - Rutas de autenticación OAuth</div>
            <div class="endpoint"><span class="method">GET</span> /me - Información del usuario (requiere autenticación)</div>
            <div class="endpoint"><span class="method">POST</span> /profile/update - Actualizar perfil (requiere autenticación)</div>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              <strong>Timestamp:</strong> ${new Date().toISOString()}
            </p>
          </div>
        </body>
      </html>
    `);
  } else {
    res.json({
      ok: true,
      message: 'Artix Hub API Server',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/auth',
        articles: '/api/articles',
        events: '/api/events',
        blog: '/api/blog',
        me: '/me (protected)',
        profile: '/profile/update (protected)'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/research', require('./routes/researchRoutes'));
app.use('/api/events', eventRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/reading-progress', readingProgressRoutes);
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/validate', require('./routes/validationRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reactions', require('./routes/reactionRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api', require('./routes/collaborationRoutes'));
app.use('/api/saved', require('./routes/savedItemRoutes'));
app.use('/api/follow', require('./routes/followRoutes'));
app.use('/api/feed', require('./routes/feedRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/subscription', require('./routes/subscriptionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// User routes
app.get('/me', protect, async (req, res) => {
  try {
    const u = req.user;
    res.json({
      ok: true,
      user: {
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        avatar: u.avatar,
        role: u.role,
        subscriptionTier: u.subscriptionTier,
        bio: u.bio,
        country: u.country,
        occupation: u.occupation,
        interests: u.interests,
        profileComplete: u.profileComplete,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user');
    res.status(500).json({ ok: false, message: 'Failed to fetch user' });
  }
});

// Update user profile
app.put('/api/auth/me', protect, verifyCsrf, async (req, res) => {
  try {
    const prisma = require('./prismaClient');
    const userId = req.user.id;
    const { name, username, bio, avatar, occupation, country, interests, profileComplete } = req.body;

    // Check if username is taken by another user
    if (username && username !== req.user.username) {
      const existing = await prisma.user.findUnique({
        where: { username: username.trim().toLowerCase() }
      });
      if (existing && existing.id !== userId) {
        return res.status(400).json({ ok: false, message: 'Username already taken' });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username.trim().toLowerCase();
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (occupation !== undefined) updateData.occupation = occupation;
    if (country !== undefined) updateData.country = country;
    if (interests !== undefined) updateData.interests = interests;
    if (profileComplete !== undefined) updateData.profileComplete = profileComplete;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        subscriptionTier: updatedUser.subscriptionTier,
        bio: updatedUser.bio,
        country: updatedUser.country,
        occupation: updatedUser.occupation,
        interests: updatedUser.interests,
        profileComplete: updatedUser.profileComplete
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error updating user');
    const errorMessage = err.message || 'Error updating user';
    const statusCode = err.code === 'P2002' ? 400 : 500; // Prisma unique constraint error
    res.status(statusCode).json({
      ok: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { error: err.stack })
    });
  }
});

// Update profile (legacy endpoint)
app.post('/profile/update', protect, verifyCsrf, async (req, res) => {
  try {
    const { name, bio, country, occupation, interests, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(country !== undefined && { country }),
        ...(occupation !== undefined && { occupation }),
        ...(interests && { interests }),
        ...(avatar !== undefined && { avatar }),
        profileComplete: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        bio: true,
        avatar: true,
        country: true,
        occupation: true,
        interests: true,
        profileComplete: true,
        subscriptionTier: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json({ ok: true, user });
  } catch (error) {
    logger.error({ err: error }, 'Error updating profile');
    res.status(500).json({ ok: false, message: 'Failed to update profile' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Route not found' });
});

startEmailReminderJob();

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const server = http.createServer(app);
initializeSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server listening');
});
