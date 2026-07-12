import tailwindcssAnimate from "tailwindcss-animate";
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
      extend: {
        colors: {
          border: "#243049",
          background: "#080B14",
          foreground: "#E7ECF6",
          card: "#0F1626",
          muted: { DEFAULT: "#161F33", foreground: "#94A1BB" },
          primary: { DEFAULT: "#7C5CFC", foreground: "#FFFFFF" },
          secondary: { DEFAULT: "#3B82F6", foreground: "#FFFFFF" },
          accent: { DEFAULT: "#2DD4BF", foreground: "#04221C" },
          success: { DEFAULT: "#22C55E", foreground: "#06210F" },
          warning: { DEFAULT: "#F59E0B", foreground: "#1F1402" },
          danger: { DEFAULT: "#F4556C", foreground: "#2A0710" },
          navy: "#0B1020",
          royal: "#6366F1",
          emerald: "#10B981",
        },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0,0,0,0.3)",
        card: "0 1px 2px rgba(0,0,0,0.3), 0 18px 40px -24px rgba(0,0,0,0.7)",
        soft: "0 6px 20px -10px rgba(124,92,252,0.35)",
        glow: "0 14px 40px -14px rgba(124,92,252,0.55)",
        "glow-lg": "0 20px 60px -18px rgba(124,92,252,0.6)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "none" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(100%)" },
          to: { opacity: "1", transform: "none" },
        },
        "pulse-soft": {
          "0%,100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in .4s ease both",
        "fade-up": "fade-up .55s cubic-bezier(.16,1,.3,1) both",
        "scale-in": "scale-in .25s ease both",
        "slide-up": "slide-up .35s cubic-bezier(.16,1,.3,1) both",
        "pulse-soft": "pulse-soft 1.5s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
