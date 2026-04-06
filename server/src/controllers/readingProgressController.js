
const prisma = require('../prismaClient');

const updateProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { articleId, researchId, postId, percentage, lastPage, totalPages } = req.body;

        // Determine which content type we are updating
        const contentType = articleId ? 'articleId' : researchId ? 'researchId' : postId ? 'postId' : null;
        const contentId = articleId || researchId || postId;

        if (!contentType) {
            return res.status(400).json({ message: 'Content ID (articleId, researchId, or postId) is required' });
        }

        // Upsert progress
        const progress = await prisma.readingProgress.upsert({
            where: {
                [`userId_${contentType}`]: {
                    userId,
                    [contentType]: contentId
                }
            },
            update: {
                percentage,
                lastPage,
                totalPages
            },
            create: {
                userId,
                [contentType]: contentId,
                percentage,
                lastPage,
                totalPages
            }
        });

        res.json(progress);
    } catch (error) {
        console.error('Error updating reading progress:', error);
        res.status(500).json({ message: 'Error updating progress' });
    }
};

const getProgress = async (req, res) => {
    try {
        const userId = req.user.id;

        // Can optionally filter by specific content
        const { articleId, researchId, postId } = req.query;

        if (articleId || researchId || postId) {
            const contentType = articleId ? 'articleId' : researchId ? 'researchId' : postId ? 'postId' : null;
            const contentId = articleId || researchId || postId;

            const progress = await prisma.readingProgress.findUnique({
                where: {
                    [`userId_${contentType}`]: {
                        userId,
                        [contentType]: contentId
                    }
                }
            });
            return res.json(progress || { percentage: 0, lastPage: 1 });
        }

        // Otherwise return all progress for user
        const allProgress = await prisma.readingProgress.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
        });

        res.json(allProgress);
    } catch (error) {
        console.error('Error getting reading progress:', error);
        res.status(500).json({ message: 'Error fetching progress' });
    }
};

const getRecommendations = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. "Continue Reading": Items started but not finished (e.g., > 0% and < 90%)
        const inProgress = await prisma.readingProgress.findMany({
            where: {
                userId,
                percentage: { gt: 0, lt: 90 }
            },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: {
                article: { select: { id: true, title: true, coverUrl: true, category: true, author: { select: { name: true, username: true } } } },
                research: { select: { id: true, title: true, coverUrl: true, category: true, author: { select: { name: true, username: true } } } },
                post: { select: { id: true, title: true, coverUrl: true, category: true, author: { select: { name: true, username: true } } } }
            }
        });

        // 2. "Recommended for You": Simple content-based recommendation
        // Find categories user reads most
        const userHistory = await prisma.readingProgress.findMany({
            where: { userId },
            include: {
                article: { select: { category: true } },
                research: { select: { category: true } },
                post: { select: { category: true } }
            },
            take: 20
        });

        const categoryCounts = {};
        userHistory.forEach(p => {
            const cat = p.article?.category || p.research?.category || p.post?.category;
            if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const topCategories = Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([cat]) => cat);

        let recommendations = [];
        if (topCategories.length > 0) {
            const [recArticles, recResearch] = await Promise.all([
                prisma.article.findMany({
                    where: {
                        category: { in: topCategories },
                        status: 'published',
                    },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: { author: { select: { name: true, username: true } } }
                }),
                prisma.research.findMany({
                    where: {
                        category: { in: topCategories },
                        status: 'published'
                    },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: { author: { select: { name: true, username: true } } }
                })
            ]);

            recommendations = [...recArticles, ...recResearch];
        }

        res.json({
            continueReading: inProgress.map(p => ({
                ...p,
                // Flatten the structure for frontend convenience
                title: p.article?.title || p.research?.title || p.post?.title,
                coverUrl: p.article?.coverUrl || p.research?.coverUrl || p.post?.coverUrl,
                category: p.article?.category || p.research?.category || p.post?.category,
                author: p.article?.author || p.research?.author || p.post?.author,
                type: p.articleId ? 'article' : p.researchId ? 'research' : 'post',
                contentId: p.articleId || p.researchId || p.postId
            })),
            recommendations
        });

    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ message: 'Error getting recommendations' });
    }
};

module.exports = {
    updateProgress,
    getProgress,
    getRecommendations
};
