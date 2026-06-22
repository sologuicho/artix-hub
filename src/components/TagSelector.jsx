import { useState } from 'react';
import { X, Plus } from 'lucide-react';

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
  const [hoveredTag, setHoveredTag] = useState(null);

  const predefinedTags = getPredefinedTags(context);
  const filteredSuggestions = predefinedTags.filter(tag =>
    !tags.includes(tag) && tag.toLowerCase().includes(searchQuery.toLowerCase())
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
    <div className={className}>
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
          className="input-field w-full"
        />

        {showSuggestions && (filteredSuggestions.length > 0 || searchQuery.trim()) && (
          <div
            style={{
              position: 'absolute', zIndex: 50, width: '100%', top: '100%', marginTop: '0.25rem',
              backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
              maxHeight: '15rem', overflowY: 'auto',
            }}
          >
            {filteredSuggestions.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                onMouseEnter={() => setHoveredTag(tag)}
                onMouseLeave={() => setHoveredTag(null)}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem',
                  background: hoveredTag === tag ? 'var(--bg)' : 'transparent',
                  border: 'none', cursor: 'pointer', color: 'var(--text)',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontFamily: '"DM Sans", sans-serif', fontSize: '0.8125rem',
                }}
              >
                <Plus size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                {tag}
              </button>
            ))}

            {searchQuery.trim() && !predefinedTags.includes(searchQuery.trim()) && !tags.includes(searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => handleAddTag(searchQuery)}
                onMouseEnter={() => setHoveredTag('__create__')}
                onMouseLeave={() => setHoveredTag(null)}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem',
                  background: hoveredTag === '__create__' ? 'var(--bg)' : 'transparent',
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

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="font-sans text-xs"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.1875rem 0.5rem',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex' }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
