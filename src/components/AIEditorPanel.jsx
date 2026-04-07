import { useState } from 'react';
import { Sparkles, Wand2, Lightbulb, GraduationCap, X, Loader, Check, ArrowRight, Send } from 'lucide-react';

import { BACKEND_URL } from '../config/client';

const AIEditorPanel = ({ selectedText, onTextReplace, onInsertText, category, isOpen, onClose, contentType = 'article' }) => {
  const [activeTab, setActiveTab] = useState('improve');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [topic, setTopic] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [textToImprove, setTextToImprove] = useState('');
  const [academicText, setAcademicText] = useState('');

  // Get CSRF token from cookie
  const getCsrfToken = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf') {
        return value;
      }
    }
    return null;
  };

  // Improve selected text
  const handleImprove = async () => {
    const text = textToImprove || selectedText;
    if (!text || text.trim().length === 0) {
      setError('Por favor pega o selecciona texto para mejorar');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${BACKEND_URL}/api/ai/improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          text: text,
          context: category || 'general',
          contentType: contentType || 'article'
        })
      });

      const data = await response.json();

      if (data.ok) {
        setResult(data.improvedText);
      } else {
        setError(data.message || 'Error al mejorar el texto');
      }
    } catch (err) {
      console.error('Error improving text:', err);
      setError('Error al mejorar el texto. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Generate ideas
  const handleGenerateIdeas = async () => {
    if (!topic || topic.trim().length === 0) {
      setError('Por favor ingresa un tema');
      return;
    }

    setLoading(true);
    setError(null);
    setIdeas([]);

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${BACKEND_URL}/api/ai/generate-ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          topic,
          category: category || 'general',
          count: 5,
          contentType: contentType || 'article'
        })
      });

      const data = await response.json();

      if (data.ok) {
        setIdeas(data.ideas || []);
        if (!data.ideas || data.ideas.length === 0) {
          setError('No se pudieron generar ideas. Intenta con un tema más específico.');
        }
      } else {
        // Show more user-friendly error messages
        let errorMsg = data.message || data.details || 'Error al generar ideas';
        if (errorMsg.includes('habilitada') || errorMsg.includes('habilitarla')) {
          errorMsg = errorMsg; // Keep the Spanish message about enabling API
        } else if (errorMsg.includes('API key') || errorMsg.includes('API_KEY')) {
          errorMsg = 'Error de configuración: Verifica que la API key de Gemini esté correctamente configurada en el servidor.';
        }
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Error generating ideas:', err);
      setError(`Error de conexión: ${err.message || 'No se pudo conectar con el servidor. Verifica tu conexión.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Correct academic style
  const handleCorrectAcademicStyle = async () => {
    const text = academicText || selectedText;
    if (!text || text.trim().length === 0) {
      setError('Por favor pega o selecciona texto para corregir');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${BACKEND_URL}/api/ai/improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          text: text,
          context: contentType === 'research' ? 'research' : 'academic',
          style: contentType === 'research' ? 'research' : 'academic',
          contentType: contentType || 'article'
        })
      });

      const data = await response.json();

      if (data.ok) {
        setResult(data.improvedText);
      } else {
        setError(data.message || 'Error al corregir el estilo académico');
      }
    } catch (err) {
      console.error('Error correcting academic style:', err);
      setError('Error al corregir el estilo académico. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-900"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Asistente de IA</h2>
                <p className="text-sm text-white/90">Gemini 2.0 Flash te ayuda a escribir mejor</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('improve'); setError(null); setResult(null); }}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'improve'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Check className="w-4 h-4" />
              Mejorar Texto
            </button>
            <button
              onClick={() => { setActiveTab('ideas'); setError(null); setIdeas([]); }}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'ideas'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              Generar Ideas
            </button>
            <button
              onClick={() => { setActiveTab('academic'); setError(null); setResult(null); }}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'academic'
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Corregir Estilo
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Improve Tab */}
          {activeTab === 'improve' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {contentType === 'research' 
                  ? 'Pega un texto y la IA lo mejorará manteniendo el rigor metodológico y precisión científica.'
                  : contentType === 'blog'
                  ? 'Pega un texto y la IA lo mejorará para hacerlo más atractivo y accesible para el público general.'
                  : contentType === 'event'
                  ? 'Pega una descripción y la IA la mejorará para hacerla más atractiva y completa.'
                  : 'Pega un texto y la IA lo mejorará corrigiendo ortografía, gramática y estilo académico.'}
              </p>
              <textarea
                value={textToImprove || selectedText || ''}
                onChange={(e) => setTextToImprove(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Pega el texto que quieres mejorar..."
                className="w-full h-48 glass-input text-gray-900 dark:text-gray-100 rounded-lg resize-none"
              />
              <button
                onClick={handleImprove}
                disabled={loading || (!textToImprove && !selectedText)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Mejorando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Mejorar Texto
                  </>
                )}
              </button>

              {result && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                        Texto mejorado
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {result}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onTextReplace(result);
                        setResult(null);
                        setTextToImprove('');
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Reemplazar
                    </button>
                    <button
                      onClick={() => {
                        onInsertText(result);
                        setResult(null);
                        setTextToImprove('');
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Insertar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ideas Tab */}
          {activeTab === 'ideas' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {contentType === 'research'
                  ? 'Ingresa un tema y la IA generará ideas para investigaciones científicas con metodología clara.'
                  : contentType === 'blog'
                  ? 'Ingresa un tema y la IA generará ideas creativas para posts de blog atractivos.'
                  : contentType === 'event'
                  ? 'Ingresa un tema y la IA generará ideas para eventos científicos o académicos.'
                  : 'Ingresa un tema y la IA generará ideas creativas para tu artículo científico.'}
              </p>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && topic && handleGenerateIdeas()}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full glass-input text-gray-900 dark:text-gray-100 rounded-lg"
                placeholder={contentType === 'research' 
                  ? "Ej: Machine Learning en Medicina, Quantum Algorithms..."
                  : contentType === 'blog'
                  ? "Ej: Tendencias en IA, Noticias Científicas..."
                  : contentType === 'event'
                  ? "Ej: Conferencia de Física, Workshop de Data Science..."
                  : "Ej: Quantum Computing, AI Research..."}
              />
              <button
                onClick={handleGenerateIdeas}
                disabled={!topic || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-5 h-5" />
                    Generar Ideas
                  </>
                )}
              </button>

              {ideas.length > 0 && (
                <div className="space-y-3 animate-in fade-in">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Ideas generadas:
                  </h3>
                  {ideas.map((idea, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => {
                        onInsertText(`# ${idea.title}\n\n${idea.description}\n\n${idea.keyPoints?.map(p => `- ${p}`).join('\n') || ''}`);
                      }}
                    >
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {idea.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {idea.description}
                      </p>
                      {idea.keyPoints && idea.keyPoints.length > 0 && (
                        <ul className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                          {idea.keyPoints.slice(0, 3).map((point, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-2">
                              <span className="text-purple-500 mt-1">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Academic Style Tab */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {contentType === 'research'
                  ? 'Corrige el estilo de investigación: metodología clara, precisión en datos, estructura IMRAD.'
                  : contentType === 'blog'
                  ? 'Ajusta el tono y estilo para hacerlo más accesible y atractivo para el público general.'
                  : contentType === 'event'
                  ? 'Mejora la descripción del evento para hacerla más profesional y atractiva.'
                  : 'Corrige el estilo académico de tu texto: formalidad, precisión y estructura científica.'}
              </p>
              <textarea
                value={academicText || selectedText || ''}
                onChange={(e) => setAcademicText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Pega el texto que quieres corregir al estilo académico..."
                className="w-full h-48 glass-input text-gray-900 dark:text-gray-100 rounded-lg resize-none"
              />
              <button
                onClick={handleCorrectAcademicStyle}
                disabled={loading || (!academicText && !selectedText)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Corrigiendo...
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-5 h-5" />
                    Corregir Estilo Académico
                  </>
                )}
              </button>

              {result && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                        Texto corregido
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {result}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onTextReplace(result);
                        setResult(null);
                        setAcademicText('');
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Reemplazar
                    </button>
                    <button
                      onClick={() => {
                        onInsertText(result);
                        setResult(null);
                        setAcademicText('');
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Insertar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  );
};

export default AIEditorPanel;
