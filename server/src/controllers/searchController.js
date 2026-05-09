const prisma = require('../prismaClient');

// Global search across all content types
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ 
        ok: true, 
        results: {
          users: [],
          articles: [],
          research: [],
          events: [],
          posts: [],
          categories: []
        }
      });
    }

    const query = q.trim();
    const searchMode = { contains: query, mode: 'insensitive' };

    // Search in parallel for better performance
    const [users, articles, research, events, posts] = await Promise.all([
      // Search Users
      prisma.user.findMany({
        where: {
          OR: [
            { username: searchMode },
            { name: searchMode },
            { occupation: searchMode },
            { country: searchMode },
            { bio: searchMode }
          ]
        },
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          occupation: true,
          country: true,
          bio: true
        },
        take: 10
      }),

      // Search Articles (schema uses status, not archived)
      prisma.article.findMany({
        where: {
          AND: [
            { status: { not: 'archived' } },
            {
              OR: [
                { title: searchMode },
                { description: searchMode },
                { content: searchMode },
                { category: searchMode },
                { tags: { has: query } }
              ]
            }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      }),

      // Search Research (schema uses status, not archived)
      prisma.research.findMany({
        where: {
          AND: [
            { status: { not: 'archived' } },
            {
              OR: [
                { title: searchMode },
                { description: searchMode },
                { content: searchMode },
                { category: searchMode },
                { tags: { has: query } }
              ]
            }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      }),

      // Search Events
      prisma.event.findMany({
        where: {
          AND: [
            { archived: false },
            {
              OR: [
                { title: searchMode },
                { description: searchMode },
                { location: searchMode },
                { type: searchMode },
                { tags: { has: query } }
              ]
            }
          ]
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        },
        take: 10,
        orderBy: { date: 'asc' }
      }),

      // Search Blog Posts
      prisma.blogPost.findMany({
        where: {
          AND: [
            { archived: false },
            {
              OR: [
                { title: searchMode },
                { content: searchMode },
                { category: searchMode },
                { tags: { has: query } }
              ]
            }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Get unique categories from all content types
    const [articleCategories, researchCategories, eventTypes, postCategories] = await Promise.all([
      prisma.article.findMany({
        where: { category: searchMode, status: { not: 'archived' } },
        select: { category: true },
        distinct: ['category'],
        take: 5
      }),
      prisma.research.findMany({
        where: { category: searchMode, status: { not: 'archived' } },
        select: { category: true },
        distinct: ['category'],
        take: 5
      }),
      prisma.event.findMany({
        where: { type: searchMode, archived: false },
        select: { type: true },
        distinct: ['type'],
        take: 5
      }),
      prisma.blogPost.findMany({
        where: { category: searchMode, archived: false },
        select: { category: true },
        distinct: ['category'],
        take: 5
      })
    ]);

    const categories = [
      ...articleCategories.map(a => ({ type: 'article', name: a.category })),
      ...researchCategories.map(r => ({ type: 'research', name: r.category })),
      ...eventTypes.map(e => ({ type: 'event', name: e.type })),
      ...postCategories.map(p => ({ type: 'post', name: p.category }))
    ];

    res.json({
      ok: true,
      results: {
        users,
        articles,
        research,
        events,
        posts,
        categories
      }
    });
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ ok: false, message: 'Failed to perform search' });
  }
};




