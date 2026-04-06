import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Briefcase, X } from 'lucide-react';

const OCCUPATIONS = [
  'Estudiante', 'Profesor', 'Investigador', 'Científico', 'Ingeniero de Software',
  'Ingeniero', 'Médico', 'Abogado', 'Arquitecto', 'Diseñador', 'Artista',
  'Escritor', 'Periodista', 'Psicólogo', 'Economista', 'Contador', 'Consultor',
  'Emprendedor', 'CEO', 'CTO', 'Director', 'Gerente', 'Analista', 'Desarrollador',
  'Programador', 'Data Scientist', 'Analista de Datos', 'Product Manager',
  'Project Manager', 'Marketing Manager', 'Diseñador UX/UI', 'Diseñador Gráfico',
  'Fotógrafo', 'Videógrafo', 'Editor', 'Traductor', 'Profesor Universitario',
  'Investigador Postdoctoral', 'Estudiante de Doctorado', 'Estudiante de Maestría',
  'Estudiante de Licenciatura', 'Biólogo', 'Químico', 'Físico', 'Matemático',
  'Estadístico', 'Sociólogo', 'Antropólogo', 'Historiador', 'Filósofo',
  'Lingüista', 'Geólogo', 'Astrónomo', 'Meteorólogo', 'Oceanógrafo',
  'Veterinario', 'Nutricionista', 'Fisioterapeuta', 'Enfermero', 'Farmacéutico',
  'Dentista', 'Optometrista', 'Audiólogo', 'Terapeuta', 'Coach', 'Mentor',
  'Instructor', 'Capacitador', 'Especialista', 'Experto', 'Asesor', 'Freelancer',
  'Independiente', 'Retirado', 'Desempleado', 'Buscando empleo'
].sort();

const OccupationSelector = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOccupations = OCCUPATIONS.filter(occupation =>
    occupation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (occupation) => {
    onChange(occupation);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full glass-input text-gray-900 dark:text-gray-100 flex items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
            {value || 'Selecciona una ocupación'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 glass-card shadow-xl max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ocupación..."
              className="w-full glass-input text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-64">
            {filteredOccupations.length > 0 ? (
              <div className="py-1">
                {filteredOccupations.map((occupation) => (
                  <button
                    key={occupation}
                    type="button"
                    onClick={() => handleSelect(occupation)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between ${
                      value === occupation ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{occupation}</span>
                    {value === occupation && (
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                No se encontraron ocupaciones
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OccupationSelector;




