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
          DEFAULT: '#1a6b3c',
          light: '#2d9556',
          dark: '#125029',
        }
      }
    },
  },
  plugins: [],
}
