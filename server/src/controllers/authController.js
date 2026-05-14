const { signToken, signSocketToken } = require('../utils/jwt');
const prisma = require('../prismaClient');
const bcrypt = require('bcryptjs');

// Helper to set auth cookies
const setAuthCookies = (res, user) => {
  const token = signToken(user);
  const csrfToken = require('crypto').randomBytes(24).toString('hex');

  // Set HttpOnly, Secure cookie for session
  res.cookie('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Set csrf token cookie available to JS
  res.cookie('csrf', csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return { token, csrfToken };
};

// Traditional Registration
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios' });
    }

    if (password.length < 8) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    
    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens' 
      });
    }

    // Check existing email or username
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'El correo o nombre de usuario ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        provider: 'local',
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        profileComplete: false
      }
    });

    setAuthCookies(res, user);
    
    // Don't send password back
    const { password: _, ...safeUser } = user;
    res.status(201).json({ ok: true, user: safeUser });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ ok: false, message: 'Error en el servidor durante el registro' });
  }
};

// Traditional Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios' });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.password) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
    }

    setAuthCookies(res, user);

    const { password: _, ...safeUser } = user;
    res.json({ ok: true, user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ ok: false, message: 'Error en el servidor durante el inicio de sesión' });
  }
};

// After successful OAuth, this callback will set a HttpOnly cookie with the session token
exports.oauthCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      console.error('OAuth callback: No user found in request');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=oauth_no_user`);
    }

    setAuthCookies(res, user);

    // Redirect to frontend; frontend will read the csrf cookie and include it in headers for stateful requests
    // Only redirect to setup-username if user doesn't have a username
    if (!user.username) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/setup-username?from=oauth`);
    }
    
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?success=true`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=oauth_error`);
  }
};

exports.logout = async (req, res) => {
  try {
    // Revoke all existing tokens by incrementing tokenVersion
    // The session cookie tells us who is logging out
    const token = req.cookies?.session;
    if (token) {
      const { verifyToken } = require('../utils/jwt');
      try {
        const decoded = verifyToken(token);
        await require('../prismaClient').user.update({
          where: { id: decoded.id },
          data: { tokenVersion: { increment: 1 } }
        });
      } catch (_) { /* invalid token, still clear cookies */ }
    }
  } catch (err) {
    console.error('Logout error:', err);
  }
  res.clearCookie('session');
  res.clearCookie('csrf');
  res.json({ ok: true });
};

// Check if username is available
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username || username.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'Username is required' });
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.json({ 
        ok: true, 
        available: false, 
        message: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens' 
      });
    }

    const existing = await prisma.user.findUnique({ 
      where: { username: username.trim().toLowerCase() } 
    });

    res.json({ 
      ok: true, 
      available: !existing,
      message: existing ? 'Ese nombre de usuario no está disponible' : 'Username disponible'
    });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ ok: false, message: 'Error checking username' });
  }
};

// Setup username after OAuth
/** Issue a socket-only JWT (session cookie is HttpOnly — browser cannot use it for the handshake). Same TTL as session; revoked via tokenVersion. */
exports.socketToken = async (req, res) => {
  try {
    const token = signSocketToken(req.user);
    res.json({ ok: true, token });
  } catch (err) {
    console.error('socketToken error:', err);
    res.status(500).json({ ok: false, message: 'Failed to issue socket token' });
  }
};

exports.setupUsername = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    if (!username || username.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'Username is required' });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens' 
      });
    }

    // Check if username is available
    const existing = await prisma.user.findUnique({ 
      where: { username: username.trim().toLowerCase() } 
    });

    if (existing && existing.id !== userId) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Ese nombre de usuario no está disponible' 
      });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        username: username.trim().toLowerCase(),
        profileComplete: true
      }
    });

    res.json({ ok: true, user });
  } catch (error) {
    console.error('Error setting up username:', error);
    res.status(500).json({ ok: false, message: 'Error setting up username' });
  }
};
