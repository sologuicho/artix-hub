export const getDarkModePreference = () => {
  const stored = localStorage.getItem('darkMode');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const setDarkModePreference = (isDark) => {
  localStorage.setItem('darkMode', isDark.toString());
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const initializeDarkMode = () => {
  const isDark = getDarkModePreference();
  setDarkModePreference(isDark);
  return isDark;
};

