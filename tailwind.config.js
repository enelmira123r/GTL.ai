/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Temë e çelët, profesionale
        paper: "#EEF3FA",
        paper2: "#F6F9FD",
        card: "#FFFFFF",
        ink: "#0F1E3D",
        "ink-soft": "#56678A",
        line: "#DCE6F2",
        brand: {
          light: "#2A52A0",
          DEFAULT: "#15336B",
          dark: "#0E2350",
        },
        accent: {
          light: "#3FC2DD",
          DEFAULT: "#12A0C2",
          dark: "#0B7892",
        },
        good: "#15875A",
        bad: "#C0392B",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Space Grotesk", "system-ui", "sans-serif"], // alias
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(120deg, #15336B 0%, #1E5F9E 55%, #12A0C2 100%)",
        "accent-gradient": "linear-gradient(120deg, #12A0C2 0%, #3FC2DD 100%)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 30, 61, 0.04), 0 10px 26px -14px rgba(15, 30, 61, 0.16)",
        card: "0 1px 3px rgba(15, 30, 61, 0.05), 0 16px 38px -20px rgba(15, 30, 61, 0.18)",
        glow: "0 8px 22px -8px rgba(18, 160, 194, 0.45)",
        focus: "0 0 0 3px rgba(18, 160, 194, 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.85)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        // Logoja që noton lart-poshtë me një lëkundje të lehtë
        sway: {
          "0%, 100%": { transform: "translateY(0) rotate(-2deg)" },
          "50%": { transform: "translateY(-10px) rotate(2deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease both",
        "fade-in": "fade-in 0.35s ease both",
        "pulse-soft": "pulse-soft 1.2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        sway: "sway 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
