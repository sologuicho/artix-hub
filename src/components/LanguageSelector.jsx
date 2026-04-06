import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="relative group">
      <button className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
          {language === 'es' ? 'ES' : 'EN'}
        </span>
      </button>
      <div className="absolute right-0 top-full mt-1 w-28 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <button
          onClick={() => changeLanguage('es')}
          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-md ${
            language === 'es' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          Español
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-md ${
            language === 'en' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          English
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector;



