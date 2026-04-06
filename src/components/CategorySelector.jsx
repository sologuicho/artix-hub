import { useState, useEffect, useRef } from 'react';
import { X, Plus, Check } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

// Predefined categories based on content type
const getPredefinedCategories = (contentType = 'general') => {
  const allCategories = {
    article: [
      'Ciencia', 'Tecnología', 'Innovación', 'Educación', 'Salud',
      'Medio Ambiente', 'Sostenibilidad', 'Política', 'Economía',
      'Cultura', 'Arte', 'Historia', 'Filosofía', 'Psicología',
      'Inteligencia Artificial', 'Machine Learning', 'Quantum Computing',
      'Biología', 'Química', 'Física', 'Matemáticas', 'Medicina',
      'Ingeniería', 'Arquitectura', 'Diseño', 'Literatura', 'Periodismo'
    ],
    research: [
      'Investigación Científica', 'Estudio Experimental', 'Revisión Sistemática',
      'Metodología', 'Análisis de Datos', 'Publicación Académica',
      'Inteligencia Artificial', 'Machine Learning', 'Deep Learning',
      'Quantum Computing', 'Biología Molecular', 'Genética',
      'Neurociencia', 'Física Cuántica', 'Química Orgánica',
      'Matemáticas Aplicadas', 'Estadística', 'Bioinformática',
      'Ciencia', 'Tecnología', 'Medicina', 'Ingeniería'
    ],
    event: [
      'Conferencia', 'Taller', 'Seminario', 'Webinar', 'Congreso',
      'Simposio', 'Exposición', 'Networking', 'Hackathon', 'Competencia',
      'Charla', 'Presentación', 'Panel', 'Mesa Redonda', 'Workshop',
      'Curso', 'Capacitación', 'Masterclass', 'Bootcamp', 'Festival'
    ],
    post: [
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

  return allCategories[contentType] || allCategories.general;
};

const CategorySelector = ({ 
  category = '', 
  onChange, 
  contentType = 'general',
  placeholder = 'Buscar o escribir categoría...',
  className = '' 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [existingCategories, setExistingCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const predefinedCategories = getPredefinedCategories(contentType);

  // Fetch existing categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const endpoint = contentType === 'article' ? 'articles' : 
                        contentType === 'research' ? 'research' : 
                        contentType === 'event' ? 'events' : 'blog';
        
        const response = await fetch(`${BACKEND_URL}/api/${endpoint}/categories`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.categories) {
            setExistingCategories(data.categories);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [contentType]);

  // Combine predefined and existing categories, remove duplicates
  const allCategories = [
    ...new Set([...predefinedCategories, ...existingCategories])
  ];

  const filteredSuggestions = allCategories.filter(cat =>
    cat.toLowerCase().includes(searchQuery.toLowerCase()) &&
    cat.toLowerCase() !== category.toLowerCase()
  );

  const handleSelectCategory = (selectedCategory) => {
    onChange(selectedCategory);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleCreateCategory = () => {
    if (searchQuery.trim() && searchQuery.trim() !== category) {
      onChange(searchQuery.trim());
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        handleSelectCategory(filteredSuggestions[0]);
      } else {
        handleCreateCategory();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleRemoveCategory = () => {
    onChange('');
    setSearchQuery('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={category || searchQuery}
          onChange={(e) => {
            const value = e.target.value;
            if (category) {
              // If category is selected, clear it and start searching
              onChange('');
              setSearchQuery(value);
            } else {
              setSearchQuery(value);
            }
            setShowSuggestions(value.length > 0);
          }}
          onKeyPress={handleKeyPress}
          onFocus={() => {
            if (category) {
              setSearchQuery(category);
              onChange('');
            }
            setShowSuggestions(searchQuery.length > 0 || filteredSuggestions.length > 0);
          }}
          placeholder={placeholder}
          className="w-full glass-input text-gray-900 dark:text-gray-100 pr-10"
        />
        
        {/* Remove button when category is selected */}
        {category && (
          <button
            type="button"
            onClick={handleRemoveCategory}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
        
        {/* Suggestions Dropdown */}
        {showSuggestions && (filteredSuggestions.length > 0 || searchQuery.trim()) && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 glass-card shadow-xl max-h-60 overflow-y-auto"
          >
            <div className="py-1">
              {/* Existing categories suggestions */}
              {filteredSuggestions.slice(0, 10).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  <Check className="w-3 h-3 text-green-500" />
                  <span>{cat}</span>
                </button>
              ))}
              
              {/* Create new category option */}
              {searchQuery.trim() && 
               !allCategories.some(c => c.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={handleCreateCategory}
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

      {/* Selected Category Badge */}
      {category && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
            {category}
            <button
              type="button"
              onClick={handleRemoveCategory}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;



