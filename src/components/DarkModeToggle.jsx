import { useState, useRef, useEffect } from 'react';
import { Palette, X } from 'lucide-react';
import { useWallpaper } from '../context/WallpaperContext';

const DarkModeToggle = () => {
  const { wallpaper, changeWallpaper, wallpapers } = useWallpaper();
  const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowWallpaperMenu(false);
      }
    };

    if (showWallpaperMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWallpaperMenu]);

  return (
    <div className="flex items-center gap-1">
      {/* Wallpaper Selector - Unificado con cambio de tema */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowWallpaperMenu(!showWallpaperMenu)}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Select wallpaper"
          title="Cambiar wallpaper"
        >
          <Palette className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        {showWallpaperMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-2">
              <div className="flex items-center justify-between mb-2 px-2 py-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tema y Wallpaper</span>
                <button
                  onClick={() => setShowWallpaperMenu(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {Object.entries(wallpapers).map(([key, wp]) => (
                <button
                  key={key}
                  onClick={() => {
                    changeWallpaper(key);
                    setShowWallpaperMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    wallpaper === key
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 ${
                    wallpaper === key 
                      ? 'border-blue-600 dark:border-blue-400 bg-blue-200 dark:bg-blue-800' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`} />
                  {wp.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DarkModeToggle;

