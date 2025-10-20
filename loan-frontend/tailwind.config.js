/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          900: "#0b0f14",
          800: "#121821",
          700: "#1a2230",
        }
      }
    }
  },
  plugins: []
};