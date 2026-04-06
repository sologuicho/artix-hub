// CommonJS version of AI client for backend
const { callOpenAI } = require('./providers/openai');
const { callGemini } = require('./providers/gemini');

// Check API keys at runtime (not module load time)
const checkAPIKeys = () => {
  const openaiKey = process.env.OPENAI_API_KEY || '';
  const geminiKey = process.env.GOOGLE_API_KEY || '';

  const hasOpenAIKey = Boolean(openaiKey && openaiKey.trim() !== '' && !openaiKey.includes('tu_api_key'));
  const hasGeminiKey = Boolean(geminiKey && geminiKey.trim() !== '' && !geminiKey.includes('tu_api_key'));

  // Always log in development to help debug
  console.log('🔑 AI Provider Status Check:');
  console.log('  - OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  console.log('  - OPENAI_API_KEY valid:', hasOpenAIKey);
  console.log('  - GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
  console.log('  - GOOGLE_API_KEY valid:', hasGeminiKey);
  if (process.env.GOOGLE_API_KEY) {
    console.log('  - GOOGLE_API_KEY preview:', process.env.GOOGLE_API_KEY.substring(0, 10) + '...');
  }

  return { hasOpenAIKey, hasGeminiKey };
};

const selectProvider = (preferGemini = false) => {
  // If preferGemini is true and Gemini is available, use it first
  if (preferGemini && hasGeminiKey) return 'gemini';
  if (hasGeminiKey) return 'gemini'; // Prefer Gemini by default
  if (hasOpenAIKey) return 'openai';
  throw new Error(
    'No AI provider configured. Set OPENAI_API_KEY or GOOGLE_API_KEY in .env.'
  );
};

const getTypeSpecificGuidelines = (type) => {
  const guidelines = {
    article: {
      focus: 'artículo científico o académico',
      checks: [
        'Estructura académica: introducción, metodología, resultados, conclusiones',
        'Rigor científico y precisión técnica',
        'Referencias y citas apropiadas',
        'Claridad en la explicación de conceptos complejos',
        'Objetividad y neutralidad',
        'Uso apropiado de terminología científica'
      ],
      improveContext: 'Mejora este texto académico manteniendo el rigor científico, claridad y estructura formal'
    },
    research: {
      focus: 'investigación científica',
      checks: [
        'Metodología clara y reproducible',
        'Datos y resultados presentados correctamente',
        'Análisis riguroso y conclusiones fundamentadas',
        'Referencias a estudios previos',
        'Estructura IMRAD (Introducción, Metodología, Resultados, Discusión)',
        'Precisión en la descripción de métodos y resultados',
        'Validez científica y ética de la investigación'
      ],
      improveContext: 'Mejora este texto de investigación manteniendo el rigor metodológico, precisión en datos y estructura científica formal'
    },
    blog: {
      focus: 'post de blog',
      checks: [
        'Engagement y claridad para el público general',
        'Tono apropiado y accesible',
        'Estructura atractiva con títulos y subtítulos',
        'Longitud apropiada para lectura',
        'Llamadas a la acción claras',
        'SEO y palabras clave relevantes',
        'Legibilidad y formato'
      ],
      improveContext: 'Mejora este post de blog manteniendo un tono accesible, engagement y claridad para el público general'
    },
    event: {
      focus: 'evento',
      checks: [
        'Información completa: qué, cuándo, dónde, por qué',
        'Descripción atractiva que motive la asistencia',
        'Claridad en fechas, horarios y ubicación',
        'Valor y beneficios del evento',
        'Información de contacto y registro',
        'Formato profesional pero accesible'
      ],
      improveContext: 'Mejora esta descripción de evento haciéndola más atractiva, clara y completa para motivar la asistencia'
    }
  };

  return guidelines[type] || guidelines.article;
};

const basePrompt = ({
  type,
  text,
  metadata,
  mode = 'validate',
}) => {
  const guidelines = getTypeSpecificGuidelines(type);

  if (mode === 'improve') {
    return `${guidelines.improveContext}. 
    
${metadata.context ? `Contexto: ${metadata.context}` : ''}
${metadata.category ? `Categoría: ${metadata.category}` : ''}
${metadata.title ? `Título: ${metadata.title}` : ''}

Texto a mejorar:
"${text}"

Devuelve SOLO el texto mejorado sin explicaciones ni formato JSON.`;
  }

  if (mode === 'generate') {
    const typePrompts = {
      article: 'artículos científicos',
      research: 'investigaciones científicas',
      blog: 'posts de blog',
      event: 'eventos científicos o académicos'
    };

    const count = metadata.count || 5;
    const topic = metadata.topic || text;

    return `Eres un experto en generación de ideas creativas para contenido científico y académico.

Genera exactamente ${count} ideas creativas y relevantes sobre "${topic}" para ${typePrompts[type] || 'contenido científico'}.
${metadata.category ? `Categoría: ${metadata.category}` : ''}

Cada idea debe incluir:
- Un título atractivo y descriptivo
- Una descripción breve (1-2 oraciones)
- 3-5 puntos clave relevantes

IMPORTANTE: Responde SOLO con un array JSON válido, sin texto adicional antes o después.
Formato exacto:
[{"title": "Título de la idea", "description": "Descripción breve", "keyPoints": ["Punto 1", "Punto 2", "Punto 3"]}]

Ejemplo de respuesta:
[{"title": "Aplicaciones de IA en Medicina", "description": "Explorar cómo la inteligencia artificial está transformando el diagnóstico y tratamiento médico.", "keyPoints": ["Diagnóstico por imágenes con IA", "Medicina personalizada", "Análisis predictivo de enfermedades"]}]`;
  }

  if (mode === 'chat') {
    return `You are Artix AI, a helpful, intelligent, and creative AI assistant for the Artix Hub platform.
    
Context:
${metadata.context ? `Role: ${metadata.role || 'Assistant'}` : ''}
${metadata.page ? `Current Page: ${metadata.page}` : ''}

User Message: "${text}"

Respond in a helpful, friendly, and professional manner. Keep responses concise unless asked for detailed explanations.
If the user asks for help with writing, offer structure and style suggestions.
If the user asks about the platform, explain features relevant to their current page.`;
  }

  return `Eres un experto revisor de contenido científico y académico. Revisa el siguiente ${guidelines.focus} y responde ESTRICTAMENTE con JSON válido.

El JSON DEBE seguir este esquema:
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
  "improvedText": string | null,
  "issues": [{"type": "error" | "warning", "message": string}],
  "suggestions": [{"message": string, "tags": [string]}]
}

Aspectos específicos a revisar para ${type}:
${guidelines.checks.map(check => `- ${check}`).join('\n')}

Metadata: ${JSON.stringify(metadata)}
Contenido:
"""${text}"""

Responde SOLO con el JSON, sin texto adicional.`;
};

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
    // If no JSON found, return raw text (for improve mode)
    return { improvedText: raw.trim(), summary: raw.trim() };
  }
};

const validateContent = async ({
  type,
  text,
  metadata = {},
  mode = 'validate',
}) => {
  const prompt = basePrompt({ type, text, metadata, mode });

  // Check API keys at runtime
  const { hasOpenAIKey, hasGeminiKey } = checkAPIKeys();

  let response;
  let lastError;

  // Always prefer Gemini if available, only use OpenAI if Gemini is not available
  if (hasGeminiKey) {
    try {
      console.log('🤖 Using Gemini API (preferred)...');
      response = await callGemini({ prompt });
      console.log('✅ Gemini API response received');
    } catch (error) {
      lastError = error;
      console.error('❌ Gemini failed:', error.message);

      // Check for specific error types and provide helpful messages
      const errorMessage = error.message || '';
      if (errorMessage.includes('SERVICE_DISABLED') || errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('not been used') || errorMessage.includes('it is disabled')) {
        throw new Error('La API de Generative Language (Gemini) no está habilitada en tu proyecto de Google Cloud. Por favor, habilítala visitando: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview');
      }
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid')) {
        throw new Error('La API key de Google no es válida. Por favor, verifica tu GOOGLE_API_KEY en el archivo .env');
      }

      // Generic error
      throw new Error(`Error de Gemini API: ${errorMessage}. Por favor, verifica tu configuración.`);
    }
  } else if (hasOpenAIKey) {
    // Only OpenAI available (not recommended if quota is exceeded)
    try {
      console.log('🤖 Using OpenAI API (Gemini not available)...');
      response = await callOpenAI({ prompt });
      console.log('✅ OpenAI API response received');
    } catch (error) {
      const errorMessage = error.message || '';
      console.error('❌ OpenAI failed:', errorMessage);
      if (errorMessage.includes('quota') || errorMessage.includes('insufficient_quota')) {
        throw new Error('OpenAI quota exceeded. Please configure GOOGLE_API_KEY in your .env file to use Gemini instead.');
      }
      throw error;
    }
  } else {
    const errorMsg = 'No AI provider configured. Please set GOOGLE_API_KEY (recommended) or OPENAI_API_KEY in your .env file in the server directory.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  // For improve or chat mode, return text directly
  if (mode === 'improve' || mode === 'chat') {
    return {
      improvedText: response.trim(),
      reply: response.trim(),
      improvements: [],
      qualityScore: 0
    };
  }

  // For generate mode, try to parse JSON array or return raw response
  if (mode === 'generate') {
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }

      // Try to extract JSON array
      const jsonStart = cleanedResponse.indexOf('[');
      const jsonEnd = cleanedResponse.lastIndexOf(']');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonStr = cleanedResponse.substring(jsonStart, jsonEnd + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return {
              raw: response,
              summary: response,
              improvedText: response,
              ideas: parsed
            };
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError, 'Trying to parse:', jsonStr.substring(0, 200));
        }
      }

      // If no valid JSON array found, try to create ideas from text
      const lines = cleanedResponse.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 10 && !trimmed.startsWith('#') && !trimmed.startsWith('*');
      });

      if (lines.length > 0) {
        const ideas = lines.slice(0, metadata.count || 5).map((line, idx) => ({
          title: line.trim().substring(0, 80),
          description: line.trim(),
          keyPoints: []
        }));

        return {
          raw: response,
          summary: response,
          improvedText: response,
          ideas
        };
      }

      // Last resort: return empty ideas but keep raw response
      return {
        raw: response.trim(),
        summary: response.trim(),
        improvedText: response.trim(),
        ideas: []
      };
    } catch (error) {
      console.error('Error in generate mode:', error);
      // If parsing fails, return raw response
      return {
        raw: response.trim(),
        summary: response.trim(),
        improvedText: response.trim(),
        ideas: []
      };
    }
  }

  // Try to parse as JSON
  try {
    const parsed = parseJSON(response);

    // Normalize the response fields
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
      summary: parsed.summary ?? response,
      suggestedReferences: parsed.suggestedReferences ?? [],
      plagiarismRisk: parsed.plagiarismRisk ?? 'low',
      improvedText: parsed.improvedText ?? null,
    };
  } catch (error) {
    // If parsing fails, return raw response
    return {
      improvedText: response.trim(),
      summary: response.trim(),
      improvements: [],
      qualityScore: 0
    };
  }
};

module.exports = { validateContent };





