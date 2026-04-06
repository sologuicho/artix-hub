const prisma = require('../../prismaClient');

const ARTIX_RESEARCH_DATA = {
  provider: 'system',
  providerId: 'artix-research',
  username: 'artixresearch',
  name: 'Artix Research',
  email: 'research@artixhub.com',
  role: 'user',
  profileComplete: true,
  bio: 'Cuenta oficial de investigación de Artix Hub. Publicamos artículos científicos, investigaciones avanzadas y contenido académico de alta calidad sobre física cuántica, inteligencia artificial, química computacional y más.',
  occupation: 'Organización de Investigación',
  country: 'Global',
  interests: ['Quantum Physics', 'AI Research', 'Chemistry', 'Machine Learning', 'Data Science']
};

/**
 * Returns the ID of the Artix Research user, creating it if it doesn't exist.
 * Single source of truth — replaces the duplicated logic in 4 controllers.
 */
exports.getArtixResearchAuthorId = async () => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: 'artixresearch' },
        { username: 'artix-research' },
        { name: 'Artix Research' }
      ]
    }
  });

  if (existing) return existing.id;

  const created = await prisma.user.create({ data: ARTIX_RESEARCH_DATA });
  return created.id;
};

/**
 * Returns true if the given user is allowed to publish content as Artix Research.
 */
exports.canPublishAsArtixResearch = (user) => {
  return user.username === 'luisflores01' || user.role === 'admin';
};
