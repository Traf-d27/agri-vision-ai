/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1b4332',
          light: '#2d6a4f',
          dark: '#081c15',
        },
        emerald: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        secondary: {
          DEFAULT: '#06b6d4',
          light: '#22d3ee',
          dark: '#0891b2',
        },
        earth: {
          DEFAULT: '#7c2d12',
          light: '#9a3412',
          dark: '#431407',
        },
        gold: {
          DEFAULT: '#eab308',
          light: '#fde047',
          dark: '#ca8a04',
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
