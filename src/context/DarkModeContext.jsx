import { createContext, useContext, useState, useEffect } from 'react';
import { initializeDarkMode, setDarkModePreference } from '../utils/darkMode';

const DarkModeContext = createContext();

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
};

export const DarkModeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => initializeDarkMode());

  useEffect(() => {
    setDarkModePreference(isDark);
  }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <DarkModeContext.Provider value={{ isDark, setIsDark, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

