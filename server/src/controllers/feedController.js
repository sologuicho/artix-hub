const prisma = require('../prismaClient');

const feedCache = new Map(); // key: userId → { items: [], timestamp: number }
const CACHE_TTL = 2 * 60 * 1000;

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function excerpt(content) {
  return stripHtml(content).slice(0, 150);
}

const AUTHOR_SELECT = { id: true, name: true, username: true, avatar: true };

function mapArticle(a, type = 'article') {
  return {
    type,
    id: a.id,
    title: a.title,
    excerpt: excerpt(a.description || a.content),
    author: { id: a.author.id, name: a.author.name || a.author.username, avatar: a.author.avatar },
    category: a.category,
    createdAt: a.createdAt,
    coverImage: a.coverUrl || null,
  };
}

function mapResearch(r) {
  return {
    type: 'research',
    id: r.id,
    title: r.title,
    excerpt: excerpt(r.description || r.content),
    author: { id: r.author.id, name: r.author.name || r.author.username, avatar: r.author.avatar },
    category: r.category,
    createdAt: r.createdAt,
    coverImage: r.coverUrl || null,
  };
}

function mapPost(p) {
  return {
    type: 'post',
    id: p.id,
    title: p.title || 'Sin título',
    excerpt: excerpt(p.content),
    author: { id: p.author.id, name: p.author.name || p.author.username, avatar: p.author.avatar },
    category: p.category,
    createdAt: p.createdAt,
    coverImage: p.coverUrl || null,
  };
}

function mapEvent(reg) {
  return {
    type: 'event',
    id: reg.event.id,
    title: reg.event.title,
    excerpt: excerpt(reg.event.description),
    author: { id: reg.user.id, name: reg.user.name || reg.user.username, avatar: reg.user.avatar },
    category: reg.event.type,
    createdAt: reg.createdAt,
    coverImage: reg.event.bannerUrl || null,
  };
}

const ARTICLE_SELECT = {
  id: true, title: true, content: true, description: true,
  category: true, coverUrl: true, createdAt: true,
  author: { select: AUTHOR_SELECT },
};

const RESEARCH_SELECT = {
  id: true, title: true, content: true, description: true,
  category: true, coverUrl: true, createdAt: true,
  author: { select: AUTHOR_SELECT },
};

const POST_SELECT = {
  id: true, title: true, content: true, category: true,
  coverUrl: true, createdAt: true,
  author: { select: AUTHOR_SELECT },
};

async function buildFeed(userId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followedIds = follows.map(f => f.followingId);

  let items;

  if (followedIds.length === 0) {
    const [articles, research, posts] = await Promise.all([
      prisma.article.findMany({
        where: { status: 'published', createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: ARTICLE_SELECT,
      }),
      prisma.research.findMany({
        where: { status: 'published', createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: RESEARCH_SELECT,
      }),
      prisma.blogPost.findMany({
        where: { archived: false, createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: POST_SELECT,
      }),
    ]);
    items = [
      ...articles.map(a => mapArticle(a)),
      ...research.map(mapResearch),
      ...posts.map(mapPost),
    ];
  } else {
    const [articles, research, posts, eventRegs, featured] = await Promise.all([
      prisma.article.findMany({
        where: { authorId: { in: followedIds }, status: 'published', createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: ARTICLE_SELECT,
      }),
      prisma.research.findMany({
        where: { authorId: { in: followedIds }, status: 'published', createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: RESEARCH_SELECT,
      }),
      prisma.blogPost.findMany({
        where: { authorId: { in: followedIds }, archived: false, createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: POST_SELECT,
      }),
      prisma.eventRegistration.findMany({
        where: { userId: { in: followedIds }, createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, createdAt: true,
          user: { select: AUTHOR_SELECT },
          event: { select: { id: true, title: true, description: true, type: true, bannerUrl: true } },
        },
      }),
      prisma.article.findMany({
        where: { status: 'published', createdAt: { gte: sevenDaysAgo }, reactions: { some: {} } },
        orderBy: { reactions: { _count: 'desc' } },
        take: 3,
        select: ARTICLE_SELECT,
      }),
    ]);

    items = [
      ...articles.map(a => mapArticle(a)),
      ...research.map(mapResearch),
      ...posts.map(mapPost),
      ...eventRegs.map(mapEvent),
      ...featured.map(a => mapArticle(a, 'featured')),
    ];
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { items, isPersonalized: followedIds.length > 0 };
}

exports.getFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    let cached = feedCache.get(userId);
    if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
      const { items, isPersonalized } = await buildFeed(userId);
      cached = { items, isPersonalized, timestamp: Date.now() };
      feedCache.set(userId, cached);
    }

    const { items, isPersonalized } = cached;
    const total = items.length;
    const offset = (page - 1) * limit;
    const pageItems = items.slice(offset, offset + limit);

    res.json({
      ok: true,
      items: pageItems,
      pagination: { page, limit, total, hasMore: offset + limit < total },
      isPersonalized,
    });
  } catch (error) {
    console.error('[feedController] getFeed:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch feed' });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;

    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const excludeIds = [userId, ...follows.map(f => f.followingId)];

    const users = await prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      orderBy: { followers: { _count: 'desc' } },
      take: 5,
      select: {
        id: true, name: true, username: true, avatar: true, subscriptionTier: true,
        _count: { select: { followers: true } },
      },
    });

    res.json({
      ok: true,
      suggestions: users.map(u => ({
        id: u.id,
        name: u.name || u.username,
        username: u.username,
        avatar: u.avatar,
        tier: u.subscriptionTier,
        followerCount: u._count.followers,
      })),
    });
  } catch (error) {
    console.error('[feedController] getSuggestions:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch suggestions' });
  }
};
