/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#07090f",
        void: "#0c1220",
        mist: "#9ba6c7",
        neon: "#7c5cff",
        ember: "#ff5f8a"
      },
      boxShadow: {
        glow: "0 0 30px rgba(124, 92, 255, 0.35)",
        ember: "0 0 25px rgba(255, 95, 138, 0.25)"
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at 20% 20%, rgba(124,92,255,0.25), transparent 45%), radial-gradient(circle at 80% 10%, rgba(255,95,138,0.2), transparent 40%), radial-gradient(circle at 50% 80%, rgba(124,92,255,0.15), transparent 50%)"
      }
    }
  },
  plugins: []
};
