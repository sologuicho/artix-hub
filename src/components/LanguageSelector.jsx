import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="relative group">
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: '0.25rem',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.25rem 0.5rem', color: 'var(--muted)',
        }}
      >
        <Globe size={14} style={{ color: 'var(--muted)' }} />
        <span className="font-sans text-xs font-medium uppercase tracking-wider">
          {language === 'es' ? 'ES' : 'EN'}
        </span>
      </button>

      <div
        className="absolute right-0 top-full mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
        style={{ zIndex: 50, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', minWidth: '7.5rem' }}
      >
        {[{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }].map(({ code, label }) => (
          <button
            key={code}
            onClick={() => changeLanguage(code)}
            className="w-full text-left font-sans text-xs"
            style={{
              display: 'block',
              padding: '0.5rem 0.75rem',
              background: 'none',
              cursor: 'pointer',
              borderLeft: language === code ? '2px solid var(--text)' : '2px solid transparent',
              borderTop: 'none', borderRight: 'none', borderBottom: 'none',
              color: language === code ? 'var(--text)' : 'var(--muted)',
              transition: 'color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
