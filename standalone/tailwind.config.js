/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../plugin/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        premiere: {
          dark: '#161616',
          panel: '#1e1e1e',
          header: '#252525',
          border: '#333333',
          accent: '#005FB8',
          accentHover: '#0078D4',
          active: '#3b82f6',
          highlight: '#FFDF00',
        },
      },
      fontFamily: {
        devanagari: ['"Noto Sans Devanagari"', 'Mukta', 'Hind', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
