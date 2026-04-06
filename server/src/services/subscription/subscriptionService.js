const prisma = require('../../prismaClient');

// Subscription Limits
const TIER_LIMITS = {
  OBSERVER: { articlesPerDay: 3 },
  STUDENT: { articlesPerDay: Infinity },
  RESEARCHER: { articlesPerDay: Infinity },
  VISIONARY: { articlesPerDay: Infinity }
};

/**
 * Express middleware — blocks requests if user has hit their daily article limit.
 * Attach after authMiddleware.protect on article read routes.
 */
const checkUsageLimit = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { subscriptionTier: true }
    });

    if (!user) return next();

    const limit = TIER_LIMITS[user.subscriptionTier]?.articlesPerDay;
    if (limit === Infinity) return next();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.dailyUsage.findUnique({
      where: { userId_date: { userId: req.user.id, date: today } }
    });

    if (usage && usage.articlesRead >= limit) {
      return res.status(403).json({
        error: 'limit_reached',
        message: 'You have reached your daily article limit. Upgrade to continue reading.',
        tier: user.subscriptionTier,
        limit,
        currentUsage: usage.articlesRead
      });
    }

    req.dailyUsage = usage;
    next();
  } catch (error) {
    console.error('[SubscriptionService] checkUsageLimit error:', error);
    next();
  }
};

/**
 * Increments the user's daily article read count.
 * Call fire-and-forget (via jobQueue) so it never blocks a response.
 */
const trackArticleRead = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date: today } },
    update: { articlesRead: { increment: 1 } },
    create: { userId, date: today, articlesRead: 1 }
  });
};

/**
 * Updates the user's subscription tier.
 */
const updateSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tier } = req.body;

    if (!['OBSERVER', 'STUDENT', 'RESEARCHER', 'VISIONARY'].includes(tier)) {
      return res.status(400).json({ message: 'Invalid subscription tier' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: tier },
      select: { id: true, username: true, subscriptionTier: true }
    });

    res.json({ message: 'Subscription updated successfully', user: updatedUser });
  } catch (error) {
    console.error('[SubscriptionService] updateSubscription error:', error);
    res.status(500).json({ message: 'Error updating subscription' });
  }
};

module.exports = { checkUsageLimit, trackArticleRead, updateSubscription };
