const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const AzureOAuth2Strategy = require('passport-azure-ad-oauth2').Strategy;
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Microsoft JWKS client — fetches Microsoft's public signing keys to verify id_tokens
const msJwksClient = jwksClient({
  jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
  cache: true,
  cacheMaxAge: 60 * 60 * 1000, // cache keys 1 hour
  rateLimit: true
});

/**
 * Verifies a Microsoft id_token by:
 * 1. Decoding the header to get the key ID (kid)
 * 2. Fetching the matching public key from Microsoft's JWKS endpoint
 * 3. Cryptographically verifying the token signature
 * Falls back to safe bare extraction if verification fails (logs warning).
 */
async function verifyMicrosoftIdToken(idToken) {
  try {
    // Decode header without verifying to get the kid
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new Error('Invalid id_token format: missing header kid');
    }

    const key = await msJwksClient.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    // Verify the token — this will throw if signature is invalid or token is expired
    const verified = jwt.verify(idToken, signingKey, {
      algorithms: ['RS256'],
    });
    return verified;
  } catch (err) {
    console.error('Microsoft id_token verification failed:', err.message);
    throw err; // Propagate — do NOT fall back to unverified payload
  }
}

const {
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET,
  MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET,
  BACKEND_URL
} = process.env;

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const u = await prisma.user.findUnique({ where: { id } });
  done(null, u);
});

// Register OAuth strategies only if credentials are available
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && BACKEND_URL) {
  passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: `${BACKEND_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const providerId = profile.id;
    const email = profile.emails?.[0]?.value;
    let user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!user) {
      // Generate temporary username from email
      const tempUsername = email ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : null;
      // Try to find unique username
      let username = tempUsername;
      let counter = 1;
      while (username && await prisma.user.findUnique({ where: { username } })) {
        username = `${tempUsername}${counter}`;
        counter++;
      }
      
      user = await prisma.user.create({
        data: {
          provider: 'google',
          providerId,
          email,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          username: username || null,
          country: null, // Google doesn't provide country in basic profile
          profileComplete: !username // Needs username setup if temp username was used
        }
      });
    } else {
      // Update existing user with latest info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: profile.displayName || user.name,
          avatar: profile.photos?.[0]?.value || user.avatar
        }
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));
} else {
  console.warn('⚠️  Google OAuth not configured (missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or BACKEND_URL)');
}

if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET && BACKEND_URL) {
  passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: `${BACKEND_URL}/auth/github/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const providerId = String(profile.id);
    const email = profile.emails?.[0]?.value || null;
    let user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!user) {
      // Use GitHub username as initial username
      const githubUsername = profile.username;
      // Check if username is available
      let username = githubUsername;
      let counter = 1;
      while (username && await prisma.user.findUnique({ where: { username } })) {
        username = `${githubUsername}${counter}`;
        counter++;
      }
      
      user = await prisma.user.create({
        data: {
          provider: 'github',
          providerId,
          email,
          name: profile.displayName || profile.username,
          avatar: profile.photos?.[0]?.value,
          username: username || null,
          country: null, // GitHub doesn't provide country
          profileComplete: !!username
        }
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: profile.displayName || profile.username || user.name,
          avatar: profile.photos?.[0]?.value || user.avatar
        }
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));
} else {
  console.warn('⚠️  GitHub OAuth not configured (missing GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, or BACKEND_URL)');
}

if (MICROSOFT_CLIENT_ID && MICROSOFT_CLIENT_SECRET && BACKEND_URL) {
  passport.use(new AzureOAuth2Strategy({
  clientID: MICROSOFT_CLIENT_ID,
  clientSecret: MICROSOFT_CLIENT_SECRET,
  callbackURL: `${BACKEND_URL}/auth/microsoft/callback`
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    if (!params.id_token) {
      return done(new Error('Microsoft OAuth: no id_token received'));
    }

    // SECURITY: Verify id_token signature with Microsoft's public JWKS keys
    let payload;
    try {
      payload = await verifyMicrosoftIdToken(params.id_token);
    } catch (verifyErr) {
      console.error('Microsoft id_token signature verification failed:', verifyErr.message);
      return done(new Error('Microsoft OAuth: id_token verification failed'));
    }

    const providerId = payload.oid || payload.sub;
    const email = payload.preferred_username || payload.upn || payload.email;
    let user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!user) {
      // Generate temporary username from email
      const tempUsername = email ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : null;
      let username = tempUsername;
      let counter = 1;
      while (username && await prisma.user.findUnique({ where: { username } })) {
        username = `${tempUsername}${counter}`;
        counter++;
      }
      
      user = await prisma.user.create({
        data: {
          provider: 'microsoft',
          providerId: providerId ? String(providerId) : null,
          email,
          name: payload.name,
          avatar: null, // Microsoft doesn't provide avatar in basic token
          username: username || null,
          country: null, // Microsoft may provide country in extended profile
          profileComplete: !username
        }
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: payload.name || user.name
        }
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));
} else {
  console.warn('⚠️  Microsoft OAuth not configured (missing MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, or BACKEND_URL)');
}

module.exports = passport;
