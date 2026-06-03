import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Gjatë zhvillimit (dev), kërkesat /api dërgohen te serveri Express në portën 3001.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
