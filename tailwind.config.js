/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#6366F1', light: '#818CF8', dark: '#4F46E5' },
      },
    },
  },
  plugins: [],
}
