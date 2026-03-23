/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        western: {
          green: '#00873E', // Primary Dark Green
          yellow: '#FFD100', // Primary Yellow
        }
      }
    },
  },
  plugins: [],
}