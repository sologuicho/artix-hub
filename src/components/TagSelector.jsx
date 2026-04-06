import { useState } from 'react';
import { X, Plus } from 'lucide-react';

// Predefined tags based on context
const getPredefinedTags = (context = 'general') => {
  const allTags = {
    interests: [
      'Inteligencia Artificial', 'Machine Learning', 'Deep Learning', 'Data Science',
      'Quantum Computing', 'Física', 'Matemáticas', 'Química', 'Biología',
      'Filosofía', 'Psicología', 'Sociología', 'Historia', 'Literatura',
      'Arte', 'Música', 'Cine', 'Fotografía', 'Diseño', 'Programación',
      'Desarrollo Web', 'Mobile Development', 'Blockchain', 'Criptografía',
      'Ciberseguridad', 'Cloud Computing', 'DevOps', 'UI/UX Design',
      'Marketing Digital', 'Emprendimiento', 'Innovación', 'Tecnología',
      'Robótica', 'Neurociencia', 'Medicina', 'Salud', 'Deportes',
      'Viajes', 'Cocina', 'Lectura', 'Escritura', 'Investigación'
    ],
    articles: [
      'Investigación', 'Ciencia', 'Tecnología', 'Innovación', 'Educación',
      'Salud', 'Medio Ambiente', 'Sostenibilidad', 'Política', 'Economía',
      'Cultura', 'Arte', 'Historia', 'Filosofía', 'Psicología',
      'Inteligencia Artificial', 'Machine Learning', 'Quantum Computing',
      'Biología', 'Química', 'Física', 'Matemáticas', 'Medicina',
      'Ingeniería', 'Arquitectura', 'Diseño', 'Literatura', 'Periodismo'
    ],
    research: [
      'Investigación Científica', 'Estudio Experimental', 'Revisión Sistemática',
      'Metodología', 'Análisis de Datos', 'Publicación Académica',
      'Peer Review', 'Ciencia Aplicada', 'Investigación Básica',
      'Inteligencia Artificial', 'Machine Learning', 'Deep Learning',
      'Quantum Computing', 'Biología Molecular', 'Genética',
      'Neurociencia', 'Física Cuántica', 'Química Orgánica',
      'Matemáticas Aplicadas', 'Estadística', 'Bioinformática'
    ],
    events: [
      'Conferencia', 'Taller', 'Seminario', 'Webinar', 'Congreso',
      'Simposio', 'Exposición', 'Networking', 'Hackathon', 'Competencia',
      'Charla', 'Presentación', 'Panel', 'Mesa Redonda', 'Workshop',
      'Curso', 'Capacitación', 'Masterclass', 'Bootcamp', 'Festival'
    ],
    posts: [
      'Actualización', 'Anuncio', 'Noticia', 'Tutorial', 'Tips',
      'Reflexión', 'Opinión', 'Experiencia', 'Proyecto', 'Logro',
      'Comunidad', 'Colaboración', 'Inspiración', 'Motivación',
      'Educación', 'Tecnología', 'Ciencia', 'Arte', 'Cultura'
    ],
    general: [
      'Tecnología', 'Ciencia', 'Educación', 'Innovación', 'Investigación',
      'Desarrollo', 'Diseño', 'Arte', 'Cultura', 'Salud', 'Medio Ambiente'
    ]
  };

  return allTags[context] || allTags.general;
};

const TagSelector = ({ 
  tags = [], 
  onChange, 
  context = 'general',
  placeholder = 'Buscar o escribir etiqueta...',
  className = '' 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const predefinedTags = getPredefinedTags(context);
  const filteredSuggestions = predefinedTags.filter(tag =>
    !tags.includes(tag) &&
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddTag = (tag) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      onChange([...tags, tag.trim()]);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleAddTag(searchQuery);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowSuggestions(searchQuery.length > 0 || filteredSuggestions.length > 0)}
          placeholder={placeholder}
          className="w-full glass-input text-gray-900 dark:text-gray-100"
        />
        
        {/* Suggestions Dropdown */}
        {showSuggestions && (filteredSuggestions.length > 0 || searchQuery.trim()) && (
          <div className="absolute z-50 w-full mt-1 glass-card shadow-xl max-h-60 overflow-y-auto">
            <div className="py-1">
              {/* Predefined suggestions */}
              {filteredSuggestions.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  <span>{tag}</span>
                </button>
              ))}
              
              {/* Custom tag option */}
              {searchQuery.trim() && !predefinedTags.includes(searchQuery.trim()) && !tags.includes(searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => handleAddTag(searchQuery)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-blue-600 dark:text-blue-400 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <Plus className="w-3 h-3" />
                  <span>Crear "{searchQuery.trim()}"</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagSelector;




