/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bank: {
          primary: '#1e3a5f',
          secondary: '#2d6a9f',
          accent: '#f0a500',
        }
      }
    }
  },
  plugins: []
}
