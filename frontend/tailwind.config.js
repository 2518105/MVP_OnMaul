/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#639d6b",
        secondary: "#8bba91",
        cream: "#E8F5E9",
        maul: "#639d6b",
        "maul-dark": "#4a7e52",
        ink: "#3c3c3c",
        sub: "#6B6B6B",
      },
    },
  },
  plugins: [],
}

