/**
 * Google Gemini provider wrapper.
 * Uses the Generative Language API.
 */

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export const callGemini = async ({ prompt }) => {
  /**
   * Add your API key to `.env.local`:
   *
   * GOOGLE_API_KEY="YOUR_KEY_HERE" // INSERT YOUR API KEY HERE
   */
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing GOOGLE_API_KEY. Create .env.local and set GOOGLE_API_KEY="YOUR_KEY_HERE".'
    );
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await response.json();
  return (
    (data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      data?.candidates?.[0]?.output) || '{}'
  );
};

