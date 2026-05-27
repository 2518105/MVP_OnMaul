/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2E75B6",
        secondary: "#5BA4CF",
        cream: "#F5F0E8",
        maul: "#FAE48B",
        "maul-dark": "#D4A800",
        ink: "#1A1A1A",
        sub: "#6B6B6B",
      },
    },
  },
  plugins: [],
}

