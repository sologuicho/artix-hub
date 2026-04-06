import { validateContent } from '../../../src/lib/ai/aiClient.js';

/**
 * Factory to create validation endpoints for articles, blogs, events, etc.
 * Handlers are compatible with both Next.js-style API routes and Express.
 */
const createValidationHandler = (type) => {
  return async (req, res) => {
    if (req.method && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const mode = req.query?.mode || 'validate';
    const { text, metadata = {} } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: 'Missing text payload' });
    }

    try {
      const result = await validateContent({ type, text, metadata, mode });
      return res.status(200).json({
        improvements: result.improvements,
        tags: result.tags,
        qualityScore: result.qualityScore,
        criticalIssues: result.criticalIssues,
        safeToPublish: result.safeToPublish,
        severity: result.severity,
        summary: result.summary,
        suggestedReferences: result.suggestedReferences,
        writingClarity: result.writingClarity,
        grammar: result.grammar,
        technicalQuality: result.technicalQuality,
        plagiarismRisk: result.plagiarismRisk,
        improvedText: mode === 'improve' ? result.improvedText : null,
      });
    } catch (error) {
      console.error(`[AI Validation] ${type} error:`, error);
      return res.status(500).json({
        error: 'AI validation failed',
        details: error.message,
      });
    }
  };
};

export default createValidationHandler;

