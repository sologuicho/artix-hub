import { callOpenAI } from './providers/openai.js';
import { callGemini } from './providers/gemini.js';

/**
 * Helper to load environment variables both on the Node server
 * and (if needed) in other runtimes.
 */
const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
const hasGeminiKey = Boolean(process.env.GOOGLE_API_KEY);

const selectProvider = () => {
  if (hasOpenAIKey) return 'openai';
  if (hasGeminiKey) return 'gemini';
  throw new Error(
    'No AI provider configured. Set OPENAI_API_KEY or GOOGLE_API_KEY in .env.local.'
  );
};

const basePrompt = ({
  type,
  text,
  metadata,
  mode = 'validate',
}) => `Review the following ${type} submission and respond strictly with valid JSON.
The JSON MUST match this schema:
{
  "qualityScore": number (0-100),
  "safeToPublish": boolean,
  "severity": "ok" | "review" | "critical",
  "improvements": [string],
  "criticalIssues": [string],
  "tags": [string],
  "summary": string,
  "writingClarity": string,
  "grammar": string,
  "technicalQuality": string,
  "plagiarismRisk": "low" | "medium" | "high",
  "suggestedReferences": [string],
  "improvedText": string | null
}

Mode: ${mode}
Metadata: ${JSON.stringify(metadata)}
Content:
\"\"\"${text}\"\"\"`;

const parseJSON = (raw) => {
  try {
    return JSON.parse(raw);
  } catch (error) {
    // Attempt to extract JSON substring
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const sliced = raw.slice(start, end + 1);
      return JSON.parse(sliced);
    }
    throw new Error(`Unable to parse AI response: ${raw}`);
  }
};

export const validateContent = async ({
  type,
  text,
  metadata = {},
  mode = 'validate',
}) => {
  const provider = selectProvider();
  const prompt = basePrompt({ type, text, metadata, mode });

  const response =
    provider === 'openai'
      ? await callOpenAI({ prompt })
      : await callGemini({ prompt });

  const parsed = parseJSON(response);

  // Normalize the response fields returned to the client.
  return {
    improvements: parsed.improvements ?? [],
    tags: parsed.tags ?? [],
    qualityScore: parsed.qualityScore ?? 0,
    criticalIssues: parsed.criticalIssues ?? [],
    safeToPublish:
      typeof parsed.safeToPublish === 'boolean'
        ? parsed.safeToPublish
        : parsed.severity !== 'critical',
    severity:
      parsed.severity ||
      (parsed.qualityScore >= 80
        ? 'ok'
        : parsed.qualityScore >= 60
        ? 'review'
        : 'critical'),
    writingClarity: parsed.writingClarity ?? '',
    grammar: parsed.grammar ?? '',
    technicalQuality: parsed.technicalQuality ?? '',
    summary: parsed.summary ?? '',
    suggestedReferences: parsed.suggestedReferences ?? [],
    plagiarismRisk: parsed.plagiarismRisk ?? 'low',
    improvedText: parsed.improvedText ?? null,
  };
};

