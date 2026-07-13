// Hyrja për punë LOKALE (npm run dev / npm start): nis serverin Express.
// (Në Vercel përdoret api/index.ts në vend të kësaj.)
import app from "./app";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Në prodhim lokal (npm start), serveri shërben edhe faqen e ndërtuar (dist/).
if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "..", "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`GTL.ai server: http://localhost:${PORT}`);
});
