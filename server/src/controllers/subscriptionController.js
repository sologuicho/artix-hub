/**
 * subscriptionController — backward-compatible re-export.
 *
 * Business logic now lives in services/subscription/subscriptionService.js.
 * Routes that import this controller continue to work without changes.
 */
module.exports = require('../services/subscription/subscriptionService');
