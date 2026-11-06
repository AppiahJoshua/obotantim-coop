/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B1D69',
          50: '#F3EFF8',
          100: '#E5DCEF',
          200: '#CDBAE0',
          300: '#B497D1',
          400: '#8966B3',
          500: '#3B1D69',
          600: '#32185A',
          700: '#29144A',
          800: '#201039',
          900: '#170B29',
        },
        gold: {
          DEFAULT: '#FFD000',
          light: '#FFE066',
          dark: '#E6B900',
        },
        dark: '#1E1B25',
        surface: '#F8F7FA',
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
