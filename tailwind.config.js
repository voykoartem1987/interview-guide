/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#E84B2A', light: '#FF7A5C', dark: '#C93A1C' },
        indigo: {
          50:  '#FFF3F0',
          100: '#FFE4DC',
          200: '#FFCBBE',
          300: '#FF9E86',
          400: '#FF7A5C',
          500: '#EF5533',
          600: '#E84B2A',
          700: '#C93A1C',
          800: '#A32E15',
          900: '#7A2010',
          950: '#4A1108',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
