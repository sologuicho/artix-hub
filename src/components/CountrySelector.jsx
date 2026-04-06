import { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, X } from 'lucide-react';

const COUNTRIES = [
  'México', 'Estados Unidos', 'España', 'Argentina', 'Colombia', 'Chile', 'Perú', 'Venezuela',
  'Ecuador', 'Guatemala', 'Cuba', 'Bolivia', 'República Dominicana', 'Honduras', 'Paraguay',
  'Nicaragua', 'El Salvador', 'Costa Rica', 'Panamá', 'Uruguay', 'Brasil', 'Canadá',
  'Reino Unido', 'Francia', 'Alemania', 'Italia', 'Portugal', 'Países Bajos', 'Bélgica',
  'Suiza', 'Austria', 'Suecia', 'Noruega', 'Dinamarca', 'Finlandia', 'Polonia', 'Rusia',
  'China', 'Japón', 'India', 'Corea del Sur', 'Australia', 'Nueva Zelanda', 'Sudáfrica',
  'Egipto', 'Nigeria', 'Kenia', 'Marruecos', 'Túnez', 'Argelia', 'Ghana', 'Etiopía'
].sort();

const CountrySelector = ({ value, onChange, className = '' }) => {
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

  const filteredCountries = COUNTRIES.filter(country =>
    country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (country) => {
    onChange(country);
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
          <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
            {value || 'Selecciona un país'}
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
              placeholder="Buscar país..."
              className="w-full glass-input text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-64">
            {filteredCountries.length > 0 ? (
              <div className="py-1">
                {filteredCountries.map((country) => (
                  <button
                    key={country}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between ${
                      value === country ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{country}</span>
                    {value === country && (
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                No se encontraron países
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelector;




