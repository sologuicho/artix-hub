const { validateContent } = require('../lib/ai/aiClient');

// Improve selected text
exports.improveText = async (req, res) => {
  try {
    const { message, context } = req.body;
    // Handle both 'text' and 'message' for backward compatibility/different clients
    const textToImprove = req.body.text || message;

    if (!textToImprove || textToImprove.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'Text is required' });
    }

    const result = await validateContent({
      type: 'article',
      text: textToImprove,
      metadata: { context: context || 'general' },
      mode: 'improve'
    });

    res.json({
      ok: true,
      improvedText: result.improvedText || textToImprove,
      improvements: result.improvements || [],
      qualityScore: result.qualityScore || 0
    });
  } catch (error) {
    console.error('Error improving text:', error);
    res.status(500).json({ ok: false, message: 'Error improving text', details: error.message });
  }
};

// Chat with AI
exports.chat = async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'Message is required' });
    }

    const result = await validateContent({
      type: 'article', // Default type, impact is minimal for chat
      text: message,
      metadata: { ...context },
      mode: 'chat'
    });

    res.json({
      ok: true,
      reply: result.reply || "I couldn't generate a response."
    });
  } catch (error) {
    console.error('Error in chat:', error);

    // Check for quota issues
    const errorMessage = error.message || 'Error desconocido';
    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
      return res.status(429).json({
        ok: false,
        message: 'AI service quota exceeded. Please try again later.'
      });
    }

    res.status(500).json({
      ok: false,
      message: 'Error processing chat request',
      details: errorMessage
    });
  }
};

// Generate new ideas
exports.generateIdeas = async (req, res) => {
  try {
    const { topic, category, count = 5, contentType = 'article' } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'Topic is required' });
    }

    // Use generate mode to get ideas
    let result;
    try {
      result = await validateContent({
        type: contentType || 'article',
        text: topic, // Pass topic as text
        metadata: { topic, category, count },
        mode: 'generate'
      });
    } catch (validateError) {
      console.error('Error in validateContent:', validateError);
      throw validateError; // Re-throw to be caught by outer catch
    }

    // Try to parse ideas from the response
    let ideas = result.ideas || [];

    // If no ideas in result, try to extract from raw response
    if (ideas.length === 0) {
      try {
        const textToParse = result.raw || result.summary || result.improvedText || '';

        // Look for JSON array
        const jsonStart = textToParse.indexOf('[');
        const jsonEnd = textToParse.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = textToParse.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(jsonStr);
          ideas = Array.isArray(parsed) ? parsed : [];
        } else {
          // Try to parse as plain text and create ideas
          const lines = textToParse.split('\n').filter(line => line.trim() && line.length > 10);
          ideas = lines.slice(0, count).map((line, idx) => ({
            title: line.trim().substring(0, 80),
            description: line.trim(),
            keyPoints: []
          }));
        }
      } catch (parseError) {
        console.error('Error parsing ideas:', parseError);
        // Fallback: create ideas from summary
        const summaryLines = (result.summary || '').split('\n').filter(line => line.trim() && line.length > 10);
        if (summaryLines.length > 0) {
          ideas = summaryLines.slice(0, count).map((line, idx) => ({
            title: `Idea ${idx + 1}: ${line.substring(0, 50)}`,
            description: line.trim(),
            keyPoints: []
          }));
        } else {
          // Last resort: create placeholder ideas
          ideas = Array.from({ length: Math.min(count, 3) }, (_, idx) => ({
            title: `Idea ${idx + 1} sobre ${topic}`,
            description: `Explora aspectos relacionados con ${topic} en el contexto de ${category || 'investigación'}.`,
            keyPoints: ['Aspecto metodológico', 'Aplicaciones prácticas', 'Impacto científico']
          }));
        }
      }
    }

    res.json({
      ok: true,
      ideas: ideas.slice(0, count)
    });
  } catch (error) {
    console.error('Error generating ideas:', error);
    // Provide more detailed error message
    const errorMessage = error.message || 'Error desconocido al generar ideas';
    const isApiKeyError = errorMessage.includes('API_KEY') || errorMessage.includes('Missing');
    const isApiError = errorMessage.includes('API error');

    res.status(500).json({
      ok: false,
      message: isApiKeyError
        ? 'Error de configuración: Verifica que las API keys estén configuradas en el servidor'
        : isApiError
          ? `Error de la API de IA: ${errorMessage}`
          : `Error al generar ideas: ${errorMessage}`,
      details: error.message
    });
  }
};

// Get writing suggestions
exports.getSuggestions = async (req, res) => {
  try {
    const { text, position, context } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ ok: false, message: 'Text is required' });
    }

    const startPos = Math.max(0, (position || 0) - 200);
    const endPos = Math.min(text.length, (position || 0) + 200);
    const textContext = text.substring(startPos, endPos);

    const suggestionPrompt = `Given this text context: "${textContext}"
    ${context ? `Full context: ${context}` : ''}
    Provide 3-5 specific, actionable writing suggestions to improve the text at the current position.
    Return ONLY valid JSON: {"suggestions": ["suggestion1", "suggestion2", ...]}
    Do not include any text before or after the JSON.`;

    const result = await validateContent({
      type: 'article',
      text: suggestionPrompt,
      metadata: { position, context },
      mode: 'validate'
    });

    let suggestions = [];
    try {
      const textToParse = result.summary || result.improvedText || '{}';
      const jsonStart = textToParse.indexOf('{');
      const jsonEnd = textToParse.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = textToParse.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        suggestions = parsed.suggestions || [];
      }
    } catch {
      // Fallback: extract suggestions from summary or improvements
      const summaryLines = (result.summary || '').split('\n').filter(line => line.trim() && line.length > 10);
      suggestions = summaryLines.slice(0, 5);
      if (suggestions.length === 0) {
        suggestions = result.improvements?.slice(0, 5) || [];
      }
    }

    res.json({
      ok: true,
      suggestions: suggestions.slice(0, 5)
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ ok: false, message: 'Error getting suggestions', details: error.message });
  }
};
