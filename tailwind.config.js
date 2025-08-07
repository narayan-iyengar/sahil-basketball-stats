/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          500: "#f97316",
        },
      },
    },
  },
  plugins: [],
  safelist: [
    'animate-spin-slow',
  ],

};

