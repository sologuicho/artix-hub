// CommonJS version for backend
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

const callOpenAI = async ({ prompt, model = 'gpt-4o-mini' }) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing OPENAI_API_KEY. Set OPENAI_API_KEY in .env.'
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
            'You are an expert reviewer for scientific and technical content. Always reply with valid JSON or improved text as requested.',
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
  return data?.choices?.[0]?.message?.content?.trim() ?? '';
};

module.exports = { callOpenAI };







