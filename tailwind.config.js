/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B6B3A',
          50: '#E8F5EE',
          100: '#C5E5D2',
          200: '#9DD3B4',
          300: '#74C196',
          400: '#4DAF79',
          500: '#0B6B3A',
          600: '#095F33',
          700: '#07502B',
          800: '#054022',
          900: '#032E18',
        },
        gold: {
          DEFAULT: '#F4B400',
          light: '#FDD835',
          dark: '#E6A800',
        },
        dark: '#1E1E1E',
        surface: '#F7F9F8',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'count-up': 'countUp 2s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
