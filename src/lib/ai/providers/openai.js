/**
 * OpenAI provider wrapper.
 * Uses the Chat Completions API to request structured validation feedback.
 */

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export const callOpenAI = async ({ prompt, model = 'gpt-4o-mini' }) => {
  /**
   * Add your API key to a `.env.local` file at the project root:
   *
   * OPENAI_API_KEY="YOUR_KEY_HERE" // INSERT YOUR API KEY HERE
   *
   * The server will load this value via process.env.OPENAI_API_KEY.
   */
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing OPENAI_API_KEY. Create .env.local and set OPENAI_API_KEY="YOUR_KEY_HERE".'
    );
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert reviewer for scientific and technical content. Always reply with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${errText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? '{}';
};

