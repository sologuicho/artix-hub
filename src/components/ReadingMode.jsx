import { useState } from 'react';
import { BookOpen, X, Palette } from 'lucide-react';

const THEMES = { default: { name: 'Por defecto', bg: 'bg-stone-50 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200', prose: 'prose-gray' }, sepia: { name: 'Sepia', bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-900 dark:text-amber-200', prose: 'prose-amber' }, dark: { name: 'Oscuro', bg: 'bg-gray-900', text: 'text-gray-200', prose: 'prose-invert' }, light: { name: 'Claro', bg: 'bg-stone-50', text: 'text-gray-800', prose: 'prose-gray' }, blue: { name: 'Azul', bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-900 dark:text-blue-200', prose: 'prose-blue' }, green: { name: 'Verde', bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-900 dark:text-green-200', prose: 'prose-green' } };
const ReadingMode = ({ isOpen, onClose, children, title, author, date }) => {
  const [selectedTheme, setSelectedTheme] = useState('default');

  if (!isOpen) return null;

  const theme = THEMES[selectedTheme];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Reading Mode Container */}
      <div className={`relative min-h-screen ${theme.bg} ${theme.text} transition-colors duration-300`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 ${theme.bg} border-b border-gray-200 dark:border-gray-700 shadow-sm`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BookOpen className="w-5 h-5" />
                <span className="font-semibold">Modo Lectura</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Theme Selector */}
                <div className="relative group">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Palette className="w-4 h-4" />
                    <span className="text-sm">{THEMES[selectedTheme].name}</span>
                  </button>
                  
                  {/* Theme Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                    <div className="p-2">
                      {Object.entries(THEMES).map(([key, themeOption]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedTheme(key)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedTheme === key
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {themeOption.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Article Header */}
          <div className="mb-12">
            <h1 className={`text-4xl md:text-5xl font-bold mb-6 leading-tight ${theme.text}`}>
              {title}
            </h1>
            {author && (
              <div className="flex items-center gap-4 text-sm opacity-75">
                <span>{author}</span>
                {date && <span>•</span>}
                {date && <span>{new Date(date).toLocaleDateString()}</span>}
              </div>
            )}
          </div>

          {/* Article Content */}
          <div className={`prose prose-lg ${theme.prose} max-w-none`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingMode;



