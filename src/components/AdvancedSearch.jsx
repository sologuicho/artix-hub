import { useState } from 'react';
import { Search, X, Filter, Calendar, Tag, User } from 'lucide-react';

const AdvancedSearch = ({ onSearch, type = 'articles' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    query: '',
    author: '',
    category: '',
    tags: '',
    dateFrom: '',
    dateTo: ''
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setFilters({
      query: '',
      author: '',
      category: '',
      tags: '',
      dateFrom: '',
      dateTo: ''
    });
    onSearch({});
  };

  const categories = type === 'articles' 
    ? ['Quantum Physics', 'AI Research', 'Chemistry', 'Biology', 'Environmental Science', 'Mathematics', 'Computer Science']
    : type === 'events'
    ? ['Conferencia', 'Taller', 'Congreso', 'Seminario', 'Webinar']
    : ['Announcements', 'Updates', 'Community', 'News', 'Tutorials'];

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar por título, palabras clave..."
            className="w-full pl-10 pr-4 py-2 glass-input text-gray-900 dark:text-gray-100 rounded-lg"
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            isOpen
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <Filter className="w-5 h-5" />
          Filtros
        </button>
        {filters.query && (
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Buscar
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-card p-6 z-50 animate-in fade-in slide-in-from-top">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Author */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Autor
              </label>
              <input
                type="text"
                value={filters.author}
                onChange={(e) => handleFilterChange('author', e.target.value)}
                placeholder="Nombre del autor"
                className="w-full glass-input text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Categoría
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full glass-select text-gray-900 dark:text-gray-100"
              >
                <option value="">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Etiquetas
              </label>
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => handleFilterChange('tags', e.target.value)}
                placeholder="Separadas por comas"
                className="w-full glass-input text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Fecha
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="glass-input text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Desde"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="glass-input text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="Hasta"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSearch}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-semibold transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;

