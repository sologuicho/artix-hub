const { validateContent } = require('../lib/ai/aiClient');

// Basic validation helpers (fallback)
const badWords = [
  'puta', 'puto', 'joder', 'coño', 'cabrón', 'cabrona', 'mierda', 'verga',
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard'
];

const violenceWords = [
  'matar', 'asesinar', 'violar', 'torturar', 'golpear', 'agredir', 'herir',
  'kill', 'murder', 'rape', 'torture', 'beat', 'assault', 'hurt', 'violence'
];

const checkBadWords = (text) => {
  if (!text) return [];
  const lowerText = text.toLowerCase();
  // Only check for exact word matches, not substrings
  const words = lowerText.split(/\s+/);
  const found = badWords.filter(badWord => {
    // Check if bad word appears as a whole word (not as substring)
    return words.some(word => word === badWord || word.startsWith(badWord + ' ') || word.endsWith(' ' + badWord));
  });
  return found;
};

const checkViolence = (text) => {
  if (!text) return [];
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const found = violenceWords.filter(violenceWord => {
    return words.some(word => word === violenceWord || word.startsWith(violenceWord + ' ') || word.endsWith(' ' + violenceWord));
  });
  return found;
};

const checkCoherence = (text) => {
  if (!text || text.trim().length < 50) {
    return { valid: false, message: 'El contenido debe tener al menos 50 caracteres para ser coherente' };
  }

  // Check for repeated words (spam detection)
  const words = text.toLowerCase().split(/\s+/);
  const wordCounts = {};
  words.forEach(word => {
    if (word.length > 3) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });

  const repeated = Object.entries(wordCounts).filter(([_, count]) => count > 10);
  if (repeated.length > 0) {
    return { valid: false, message: 'El contenido tiene demasiadas repeticiones de palabras' };
  }

  return { valid: true };
};

const checkCategoryMatch = (category, content) => {
  const categoryKeywords = {
    'Quantum Physics': ['quantum', 'física', 'mecánica', 'partícula', 'átomo', 'electrón', 'fotón'],
    'AI Research': ['inteligencia artificial', 'machine learning', 'neural', 'algoritmo', 'datos', 'modelo'],
    'Chemistry': ['química', 'molécula', 'compuesto', 'reacción', 'elemento', 'sustancia'],
    'Biology': ['biología', 'célula', 'organismo', 'gen', 'ADN', 'proteína', 'evolución'],
    'Environmental Science': ['medio ambiente', 'clima', 'ecosistema', 'sostenible', 'contaminación', 'recursos'],
    'Mathematics': ['matemática', 'ecuación', 'teorema', 'álgebra', 'cálculo', 'geometría'],
    'Computer Science': ['programación', 'software', 'algoritmo', 'código', 'sistema', 'tecnología']
  };

  const keywords = categoryKeywords[category] || [];
  if (keywords.length === 0) return { valid: true };

  const lowerContent = content.toLowerCase();
  const matches = keywords.filter(keyword => lowerContent.includes(keyword));

  if (matches.length === 0) {
    return {
      valid: false,
      message: `El contenido no parece relacionado con la categoría "${category}". Considera usar palabras clave relacionadas.`
    };
  }

  return { valid: true, matches: matches.length };
};

const suggestTags = (category, content) => {
  const tagSuggestions = {
    'Quantum Physics': ['física cuántica', 'mecánica cuántica', 'partículas', 'fotones', 'entrelazamiento'],
    'AI Research': ['inteligencia artificial', 'machine learning', 'deep learning', 'neural networks', 'algoritmos'],
    'Chemistry': ['química orgánica', 'reacciones', 'compuestos', 'moléculas', 'síntesis'],
    'Biology': ['genética', 'biología molecular', 'células', 'ADN', 'proteínas'],
    'Environmental Science': ['sostenibilidad', 'cambio climático', 'ecología', 'conservación', 'recursos naturales'],
    'Mathematics': ['álgebra', 'cálculo', 'geometría', 'estadística', 'análisis'],
    'Computer Science': ['programación', 'algoritmos', 'estructuras de datos', 'software', 'desarrollo']
  };

  const suggestions = tagSuggestions[category] || [];
  const contentWords = content.toLowerCase().split(/\s+/);

  // Filter suggestions based on content
  const relevant = suggestions.filter(tag =>
    contentWords.some(word => word.length > 4 && tag.toLowerCase().includes(word)) ||
    content.toLowerCase().includes(tag.toLowerCase())
  );

  return relevant.length > 0 ? relevant : suggestions.slice(0, 3);
};

// Validate article with AI support
exports.validateArticle = async (req, res) => {
  try {
    const { title, content, category, description, tags, mode } = req.body;

    // Determine if we should try AI validation
    const useAI = true; // Always try AI first

    // AI Improve Mode
    if (mode === 'improve') {
      try {
        const aiResult = await validateContent({
          type: 'article',
          text: content,
          metadata: { title, category, context: 'Improve this article content' },
          mode: 'improve'
        });
        return res.json({ ok: true, ...aiResult });
      } catch (aiError) {
        console.error('AI Improvement failed:', aiError.message);
        return res.status(500).json({ ok: false, message: 'AI service unavailable for improvements', details: aiError.message });
      }
    }

    // AI Validation Mode
    if (useAI) {
      try {
        const aiResult = await validateContent({
          type: 'article',
          text: content || title, // Validate at least title if content empty
          metadata: { title, category, description, tags },
          mode: 'validate'
        });
        return res.json({ ok: true, ...aiResult, valid: aiResult.safeToPublish });
      } catch (aiError) {
        console.warn('AI Validation failed, falling back to basic rules:', aiError.message);
        // Continue to basic validation below
      }
    }

    // --- Manual Fallback Validation ---
    const issues = [];
    const suggestions = [];

    // Check required fields
    if (!title || title.trim().length < 10) {
      issues.push({ type: 'error', message: 'El título debe tener al menos 10 caracteres' });
    }

    if (!content || content.trim().length < 50) {
      issues.push({ type: 'error', message: 'El contenido debe tener al menos 50 caracteres (Basic)' });
    }

    if (!category) {
      issues.push({ type: 'error', message: 'Debes seleccionar una categoría' });
    }

    // Check bad words
    const badWordsFound = [
      ...checkBadWords(title || ''),
      ...checkBadWords(content || ''),
      ...checkBadWords(description || '')
    ];

    if (badWordsFound.length > 0) {
      issues.push({
        type: 'error',
        message: `Se encontraron palabras inapropiadas: ${badWordsFound.join(', ')}`
      });
    }

    // Check coherence
    if (content) {
      const coherence = checkCoherence(content);
      if (!coherence.valid) {
        issues.push({ type: 'warning', message: coherence.message });
      }
    }

    // Check category match
    if (category && content) {
      const categoryMatch = checkCategoryMatch(category, content);
      if (!categoryMatch.valid) {
        issues.push({ type: 'warning', message: categoryMatch.message });
      }
    }

    // Suggest tags
    if (category && content) {
      const tagSuggestions = suggestTags(category, content);
      if (tagSuggestions.length > 0) {
        suggestions.push({
          type: 'tags',
          message: 'Etiquetas sugeridas:',
          tags: tagSuggestions
        });
      }
    }

    const hasErrors = issues.some(i => i.type === 'error');
    const hasWarnings = issues.some(i => i.type === 'warning');

    res.json({
      ok: true,
      valid: !hasErrors,
      severity: hasErrors ? 'critical' : hasWarnings ? 'review' : 'ok',
      issues,
      suggestions,
      qualityScore: hasErrors ? 40 : hasWarnings ? 70 : 90,
      source: 'basic' // Flag to indicate basic validation was used
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ ok: false, message: 'Error en la validación' });
  }
};

// Validate blog post with AI support
exports.validateBlogPost = async (req, res) => {
  try {
    const { title, content, category, mode } = req.body;

    // AI Improve Mode
    if (mode === 'improve') {
      try {
        const aiResult = await validateContent({
          type: 'blog',
          text: content,
          metadata: { title, category },
          mode: 'improve'
        });
        return res.json({ ok: true, ...aiResult });
      } catch (aiError) {
        return res.status(500).json({ ok: false, message: 'AI unavailable', details: aiError.message });
      }
    }

    // AI Validation
    try {
      const aiResult = await validateContent({
        type: 'blog',
        text: content,
        metadata: { title, category },
        mode: 'validate'
      });
      return res.json({ ok: true, ...aiResult, valid: aiResult.safeToPublish });
    } catch (aiError) {
      console.warn('AI failed, fallback to basic:', aiError.message);
    }

    // --- Manual Fallback ---
    const issues = [];
    const suggestions = [];

    // No length restrictions for blog posts - they can be short or long

    // Check bad words
    const badWordsFound = [
      ...checkBadWords(title || ''),
      ...checkBadWords(content || '')
    ];

    if (badWordsFound.length > 0) {
      issues.push({
        type: 'error',
        message: `Se encontraron palabras inapropiadas: ${badWordsFound.join(', ')}`
      });
    }

    // Check violence
    const violenceFound = [
      ...checkViolence(title || ''),
      ...checkViolence(content || '')
    ];

    if (violenceFound.length > 0) {
      issues.push({
        type: 'error',
        message: `Se encontró contenido relacionado con violencia: ${violenceFound.join(', ')}`
      });
    }

    // Basic spelling/coherence check only if content exists and is substantial
    // But don't block if it's too short - just warn
    if (content && content.trim().length > 0) {
      // Only check for spam/repetition if content is long enough
      if (content.trim().length >= 50) {
        const coherence = checkCoherence(content);
        if (!coherence.valid) {
          issues.push({ type: 'warning', message: coherence.message });
        }
      }
    }

    const hasErrors = issues.some(i => i.type === 'error');
    const hasWarnings = issues.some(i => i.type === 'warning');

    res.json({
      ok: true,
      valid: !hasErrors, // Only block on errors (bad words, violence), not warnings
      severity: hasErrors ? 'critical' : hasWarnings ? 'review' : 'ok',
      issues,
      suggestions,
      qualityScore: hasErrors ? 40 : hasWarnings ? 70 : 90
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ ok: false, message: 'Error en la validación' });
  }
};

// Validate research with AI support
exports.validateResearch = async (req, res) => {
  try {
    const { title, content, category, description, tags, methodology, mode } = req.body;

    // AI Improve Mode
    if (mode === 'improve') {
      try {
        const aiResult = await validateContent({
          type: 'research',
          text: content,
          metadata: { title, category, methodology },
          mode: 'improve'
        });
        return res.json({ ok: true, ...aiResult });
      } catch (aiError) {
        return res.status(500).json({ ok: false, message: 'AI unavailable', details: aiError.message });
      }
    }

    // AI Validation
    try {
      const aiResult = await validateContent({
        type: 'research',
        text: content,
        metadata: { title, category, methodology },
        mode: 'validate'
      });
      return res.json({ ok: true, ...aiResult, valid: aiResult.safeToPublish });
    } catch (aiError) {
      console.warn('AI failed, fallback to basic:', aiError.message);
    }

    // --- Manual Fallback ---
    const issues = [];
    const suggestions = [];

    // Check required fields
    if (!title || title.trim().length < 10) {
      issues.push({ type: 'error', message: 'El título debe tener al menos 10 caracteres' });
    }

    if (!content || content.trim().length < 100) {
      issues.push({ type: 'error', message: 'El contenido de investigación debe tener al menos 100 caracteres' });
    }

    if (!category) {
      issues.push({ type: 'error', message: 'Debes seleccionar una categoría' });
    }

    // Check for methodology section (important for research)
    if (content && !content.toLowerCase().includes('metodología') && !content.toLowerCase().includes('methodology') && !content.toLowerCase().includes('método')) {
      issues.push({
        type: 'warning',
        message: 'Se recomienda incluir una sección de metodología en tu investigación'
      });
    }

    // Check bad words
    const badWordsFound = [
      ...checkBadWords(title || ''),
      ...checkBadWords(content || ''),
      ...checkBadWords(description || '')
    ];

    if (badWordsFound.length > 0) {
      issues.push({
        type: 'error',
        message: `Se encontraron palabras inapropiadas: ${badWordsFound.join(', ')}`
      });
    }

    // Check coherence
    if (content) {
      const coherence = checkCoherence(content);
      if (!coherence.valid) {
        issues.push({ type: 'warning', message: coherence.message });
      }
    }

    // Check category match
    if (category && content) {
      const categoryMatch = checkCategoryMatch(category, content);
      if (!categoryMatch.valid) {
        issues.push({ type: 'warning', message: categoryMatch.message });
      }
    }

    // Suggest tags
    if (category && content) {
      const tagSuggestions = suggestTags(category, content);
      if (tagSuggestions.length > 0) {
        suggestions.push({
          type: 'tags',
          message: 'Etiquetas sugeridas:',
          tags: tagSuggestions
        });
      }
    }

    const hasErrors = issues.some(i => i.type === 'error');
    const hasWarnings = issues.some(i => i.type === 'warning');

    res.json({
      ok: true,
      valid: !hasErrors,
      severity: hasErrors ? 'critical' : hasWarnings ? 'review' : 'ok',
      issues,
      suggestions,
      qualityScore: hasErrors ? 40 : hasWarnings ? 70 : 90
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ ok: false, message: 'Error en la validación' });
  }
};

// Validate event with AI support
exports.validateEvent = async (req, res) => {
  try {
    const { title, description, date, location, type, mode } = req.body;

    // AI Improve Mode
    if (mode === 'improve') {
      try {
        const aiResult = await validateContent({
          type: 'event',
          text: description,
          metadata: { title, location, date },
          mode: 'improve'
        });
        return res.json({ ok: true, ...aiResult });
      } catch (aiError) {
        return res.status(500).json({ ok: false, message: 'AI unavailable', details: aiError.message });
      }
    }

    // AI Validation
    try {
      const aiResult = await validateContent({
        type: 'event',
        text: description,
        metadata: { title, location, date, type },
        mode: 'validate'
      });
      return res.json({ ok: true, ...aiResult, valid: aiResult.safeToPublish });
    } catch (aiError) {
      console.warn('AI failed, fallback to basic:', aiError.message);
    }

    // --- Manual Fallback ---
    const issues = [];

    // Check required fields
    if (!title || title.trim().length < 10) {
      issues.push({ type: 'error', message: 'El título debe tener al menos 10 caracteres' });
    }

    if (!description || description.trim().length < 50) {
      issues.push({ type: 'error', message: 'La descripción debe tener al menos 50 caracteres' });
    }

    if (!date) {
      issues.push({ type: 'error', message: 'Debes seleccionar una fecha para el evento' });
    } else {
      const eventDate = new Date(date);
      if (eventDate < new Date()) {
        issues.push({ type: 'warning', message: 'La fecha del evento es en el pasado' });
      }
    }

    if (!location || location.trim().length < 5) {
      issues.push({ type: 'error', message: 'Debes especificar una ubicación válida' });
    }

    if (!type) {
      issues.push({ type: 'error', message: 'Debes seleccionar un tipo de evento' });
    }

    // Check bad words
    const badWordsFound = [
      ...checkBadWords(title || ''),
      ...checkBadWords(description || '')
    ];

    if (badWordsFound.length > 0) {
      issues.push({
        type: 'error',
        message: `Se encontraron palabras inapropiadas: ${badWordsFound.join(', ')}`
      });
    }

    const hasErrors = issues.some(i => i.type === 'error');
    const hasWarnings = issues.some(i => i.type === 'warning');

    res.json({
      ok: true,
      valid: !hasErrors,
      severity: hasErrors ? 'critical' : hasWarnings ? 'review' : 'ok',
      issues,
      qualityScore: hasErrors ? 40 : hasWarnings ? 70 : 90
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ ok: false, message: 'Error en la validación' });
  }
};



