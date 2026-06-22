/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        artix: {
          // Light theme
          bg: '#FAFAF8',
          surface: '#F2F0EC',
          border: '#E2DED8',
          text: '#1A1917',
          muted: '#6B6760',
          accent: '#C4451A',
          accentHover: '#A33814',

          // Dark theme
          darkBg: '#111110',
          darkSurface: '#1C1B1A',
          darkBorder: '#2E2C2A',
          darkText: '#F0EDE8',
          darkMuted: '#8C8A86',
          darkAccent: '#E8572A',
          darkAccentHover: '#C4451A',
        }
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
