import { useState, useEffect, useRef } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { BACKEND_URL } from '../config/client';

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
  const [hoveredCat, setHoveredCat] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const predefinedCategories = getPredefinedCategories(contentType);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const endpoint = contentType === 'article' ? 'articles'
          : contentType === 'research' ? 'research'
          : contentType === 'event' ? 'events' : 'blog';
        const response = await fetch(`${BACKEND_URL}/api/${endpoint}/categories`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.categories) setExistingCategories(data.categories);
        }
      } catch (_) {}
    };
    fetchCategories();
  }, [contentType]);

  const allCategories = [...new Set([...predefinedCategories, ...existingCategories])];
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        inputRef.current && !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={className}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={category || searchQuery}
          onChange={(e) => {
            const value = e.target.value;
            if (category) {
              onChange('');
              setSearchQuery(value);
            } else {
              setSearchQuery(value);
            }
            setShowSuggestions(value.length > 0);
          }}
          onKeyPress={handleKeyPress}
          onFocus={() => {
            if (category) { setSearchQuery(category); onChange(''); }
            setShowSuggestions(searchQuery.length > 0 || filteredSuggestions.length > 0);
          }}
          placeholder={placeholder}
          className="input-field w-full"
          style={{ paddingRight: category ? '2.5rem' : undefined }}
        />

        {category && (
          <button
            type="button"
            onClick={handleRemoveCategory}
            style={{
              position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem',
            }}
          >
            <X size={14} />
          </button>
        )}

        {showSuggestions && (filteredSuggestions.length > 0 || searchQuery.trim()) && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute', zIndex: 50, width: '100%', top: '100%', marginTop: '0.25rem',
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
              maxHeight: '15rem', overflowY: 'auto',
            }}
          >
            {filteredSuggestions.slice(0, 10).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                onMouseEnter={() => setHoveredCat(cat)}
                onMouseLeave={() => setHoveredCat(null)}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem',
                  background: hoveredCat === cat ? 'var(--bg)' : 'transparent',
                  border: 'none', cursor: 'pointer', color: 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontFamily: '"DM Sans", sans-serif', fontSize: '0.8125rem',
                }}
              >
                <Check size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                {cat}
              </button>
            ))}

            {searchQuery.trim() && !allCategories.some(c => c.toLowerCase() === searchQuery.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={handleCreateCategory}
                onMouseEnter={() => setHoveredCat('__create__')}
                onMouseLeave={() => setHoveredCat(null)}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem',
                  background: hoveredCat === '__create__' ? 'var(--bg)' : 'transparent',
                  border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer',
                  color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontFamily: '"DM Sans", sans-serif', fontSize: '0.8125rem',
                }}
              >
                <Plus size={11} style={{ flexShrink: 0 }} />
                Crear "{searchQuery.trim()}"
              </button>
            )}
          </div>
        )}
      </div>

      {category && (
        <div className="flex items-center gap-2 mt-2">
          <span
            className="font-sans text-xs"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.25rem 0.625rem',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            {category}
            <button
              type="button"
              onClick={handleRemoveCategory}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex' }}
            >
              <X size={10} />
            </button>
          </span>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
