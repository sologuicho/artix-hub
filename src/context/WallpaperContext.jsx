import { createContext, useContext, useState, useEffect } from 'react';
import { useDarkMode } from './DarkModeContext';

const WallpaperContext = createContext();

export const useWallpaper = () => {
  const context = useContext(WallpaperContext);
  if (!context) {
    throw new Error('useWallpaper must be used within WallpaperProvider');
  }
  return context;
};

const WALLPAPERS = {
  light: {
    name: 'Light',
    image: '/DefaultLightWallpaper.png',
    class: 'wallpaper-light'
  },
  dark: {
    name: 'Dark',
    image: '/DefaultDarkWallpaper.jpeg',
    class: 'wallpaper-dark'
  },
  yellow: {
    name: 'Yellow',
    image: '/DefaultYellowWallpaper.jpeg',
    class: 'wallpaper-yellow'
  },
  blue: {
    name: 'Blue',
    image: '/DefaultBlueWallpaper.jpeg',
    class: 'wallpaper-blue'
  }
};

const getWallpaperPreference = () => {
  const stored = localStorage.getItem('wallpaper');
  return stored || 'light';
};

const setWallpaperPreference = (wallpaper) => {
  localStorage.setItem('wallpaper', wallpaper);
  // Remove all wallpaper classes
  document.body.classList.remove('wallpaper-light', 'wallpaper-dark', 'wallpaper-yellow', 'wallpaper-blue');
  // Add the selected wallpaper class
  if (WALLPAPERS[wallpaper]) {
    document.body.classList.add(WALLPAPERS[wallpaper].class);
  } else {
    // Default to light if wallpaper not found
    document.body.classList.add('wallpaper-light');
  }
};

export const initializeWallpaper = () => {
  const wallpaper = getWallpaperPreference();
  setWallpaperPreference(wallpaper);
  return wallpaper;
};

export const WallpaperProvider = ({ children }) => {
  const [wallpaper, setWallpaper] = useState(() => initializeWallpaper());
  const { isDark, setIsDark } = useDarkMode();

  useEffect(() => {
    setWallpaperPreference(wallpaper);
    
    // Auto-activate dark mode for dark and blue wallpapers
    if (wallpaper === 'dark' || wallpaper === 'blue') {
      if (!isDark) {
        setIsDark(true);
      }
    } else if (wallpaper === 'light' || wallpaper === 'yellow') {
      // Auto-deactivate dark mode for light and yellow wallpapers
      if (isDark) {
        setIsDark(false);
      }
    }
  }, [wallpaper, isDark, setIsDark]);

  const changeWallpaper = (newWallpaper) => {
    if (WALLPAPERS[newWallpaper]) {
      setWallpaper(newWallpaper);
    }
  };

  return (
    <WallpaperContext.Provider value={{ wallpaper, changeWallpaper, wallpapers: WALLPAPERS }}>
      {children}
    </WallpaperContext.Provider>
  );
};

