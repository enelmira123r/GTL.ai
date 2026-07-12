import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { generateExams } from "./gemini";
import type { ExamInput } from "./gemini";
import { assistWithMaterial, ASSIST_INTENTS } from "./assist";
import { fetchLessonFromUrl } from "./fetchUrl";
import { buildExamsDocx } from "./examDocx";
import { cleanLessonText } from "./cleanText";
import { registerUser, verifyUser, makeToken, tokenEmail } from "./users";
import { saveTest, listTests, getTest, deleteTest, newId } from "./store";
import type { ExamRequest, ExamData } from "../shared/types";

const MAX_GROUPS = 30;

// Etiketë grupi në stilin e kolonave Excel: A, B, …, Z, AA, AB, … (pa kufi).
function groupLabel(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Pastron fushat e lirisë (lënda/klasa/tremujori) përpara se të shkojnë te AI/Word.
function sanitizeText(s: string): string {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMG_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Verifikon që të dhënat e ngarkuara janë vërtet ajo që pretendojnë (magic bytes)
// dhe brenda kufirit të madhësisë — parandalon ngarkime të gabuara ose malicioze.
function assertValidUpload(base64: string, kind: "pdf" | "image"): void {
  if (!base64 || typeof base64 !== "string") {
    throw new Error(kind === "pdf" ? "PDF-ja mungon." : "Fotografia mungon.");
  }
  const buf = Buffer.from(base64, "base64");
  if (buf.length === 0) {
    throw new Error(kind === "pdf" ? "PDF-ja është bosh." : "Fotografia është bosh.");
  }
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new Error("Skedari është shumë i madh (maksimum 10MB).");
  }
  if (kind === "pdf") {
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
      throw new Error("Skedari nuk është një PDF i vlefshëm.");
    }
  } else {
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng =
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const head = buf.slice(0, 4).toString("latin1");
    const isGif = head === "GIF8";
    const isWebp =
      head === "RIFF" && buf.slice(8, 12).toString("latin1") === "WEBP";
    if (!isJpeg && !isPng && !isGif && !isWebp) {
      throw new Error("Fotografia nuk është e vlefshme (përdor PNG, JPG, WEBP ose GIF).");
    }
  }
}

// Cache i thjeshtë në-memorie për gjenerimet (LRU). Zvogëlon thirrjet e përsëritura
// te Gemini dhe përmirëson kohën e përgjigjes për materiale të njëjta.
const genCache = new Map<string, ExamData>();
const CACHE_MAX = 100;

function examCacheKey(body: ExamRequest): string {
  const s = body.source;
  const content =
    s.kind === "url"
      ? `${s.url}|${body.fromPage}|${body.toPage}`
      : s.kind === "pdf"
        ? s.pdfBase64
        : s.kind === "image"
          ? s.imageBase64
          : s.text;
  const fingerprint = JSON.stringify({
    kind: s.kind,
    content,
    ng: Math.max(1, Math.min(MAX_GROUPS, Math.round(Number(body.numGroups) || 1))),
    nq: Math.max(1, Math.min(15, Math.round(Number(body.numQuestions) || 5))),
    ms: Math.max(1, Math.min(1000, Math.round(Number(body.maxScore) || 100))),
  });
  return crypto.createHash("sha256").update(fingerprint).digest("hex");
}

function cacheGet(k: string): ExamData | undefined {
  return genCache.get(k);
}
function cacheSet(k: string, v: ExamData): void {
  if (genCache.size >= CACHE_MAX) genCache.delete(genCache.keys().next().value as string);
  genCache.set(k, v);
}

function authedEmail(req: express.Request): string | null {
  const m = (req.headers.authorization || "").match(/^Bearer (.+)$/);
  return m ? tokenEmail(m[1]) : null;
}

function sanitizeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "").trim() || "pa-emer";
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

// Ruan provimin si .docx te folderi i arkivit (kur fs lejon shkrim — p.sh. lokalisht).
async function saveExamToDisk(data: ExamData, userEmail: string | null): Promise<string> {
  const baseDir =
    process.env.SAVE_DIR && process.env.SAVE_DIR.trim()
      ? process.env.SAVE_DIR.trim()
      : path.join(process.cwd(), "provimet");
  const userFolder = sanitizeName(userEmail || "anonim");
  const dir = path.join(baseDir, userFolder);
  fs.mkdirSync(dir, { recursive: true });

  const buf = await buildExamsDocx(
    data.exams.map((e) => ({
      group: e.group,
      tremujori: data.tremujori,
      lenda: data.lenda,
      klasa: data.klasa,
      title: e.title,
      questions: e.questions,
    })),
  );

  const parts: string[] = [];
  if (data.lenda) parts.push(data.lenda);
  if (data.klasa) parts.push("Klasa" + data.klasa);
  if (data.tremujori) parts.push("Tremujori" + data.tremujori);
  const base = sanitizeName(parts.join("-") || "Provim");
  const filePath = path.join(dir, `${base}-${timestamp()}.docx`);
  fs.writeFileSync(filePath, buf);
  return filePath;
}

export const app = express();
app.use(express.json({ limit: "25mb" })); // PDF-të si base64 mund të jenë të mëdha

// Faqe kontrolli — tregon nëse serveri po i sheh variablat (pa shfaqur sekretet).
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    geminiKey: process.env.GEMINI_API_KEY ? "present" : "MISSING",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    accounts:
      process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
        ? "redis"
        : "file",
  });
});

function fail(res: express.Response, err: unknown) {
  console.error("[GTL.ai] Gabim:", err);
  let msg = err instanceof Error ? err.message : "Ndodhi një gabim i papritur.";
  if (/api[_ ]?key|api_key_invalid|authentication|permission|401|403/i.test(msg)) {
    msg = "Çelësi i Gemini mungon ose është i pavlefshëm. Kontrollo variablat e mjedisit.";
  } else if (/\b503\b|overloaded|high demand|service unavailable|UNAVAILABLE/i.test(msg)) {
    msg = "Modeli i Gemini është i mbingarkuar për momentin (kërkesë e lartë). Prit pak sekonda dhe provo sërish.";
  } else if (/quota|rate.?limit|resource_exhausted|429/i.test(msg)) {
    msg = "U arrit kufiri i nivelit falas të Gemini. Prit pak minuta dhe provo sërish.";
  }
  res.status(500).json({ error: msg });
}

function hasKey(res: express.Response): boolean {
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: "Mungon GEMINI_API_KEY te variablat e mjedisit.",
    });
    return false;
  }
  return true;
}

// ---- Llogaritë (email + fjalëkalim) ----
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const r = await registerUser(String(email || ""), String(password || ""));
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ token: makeToken(r.email), email: r.email });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const r = await verifyUser(String(email || ""), String(password || ""));
    if (!r.ok) {
      res.status(401).json({ error: r.error });
      return;
    }
    res.json({ token: makeToken(r.email), email: r.email });
  } catch (err) {
    fail(res, err);
  }
});

// 1) Gjeneron provimin (AI) dhe e kthen si JSON për pamje paraprake — pa login.
app.post("/api/exam-generate", async (req, res) => {
  try {
    if (!hasKey(res)) return;
    const body = req.body as ExamRequest;
    if (!body || !body.source) {
      res.status(400).json({ error: "Mungon materiali për provimin." });
      return;
    }

    // Header-i i provimit (lënda/klasa/tremujori) — i pastër, pa ndikuar te cache-i i AI-së.
    const head = {
      lenda: sanitizeText(body.lenda),
      klasa: sanitizeText(body.klasa),
      tremujori: sanitizeText(body.tremujori),
    };

    // Nëse ky material është gjeneruar më parë (i njëjti përmbajtje + opsione), kthejmë cache-in.
    const cacheKey = examCacheKey(body);
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.json({ ...cached, ...head });
      return;
    }

    let src: ExamInput;
    if (body.source.kind === "url") {
      const fetched = await fetchLessonFromUrl(body.source.url, {
        fromPage: Number(body.fromPage) || 0,
        toPage: Number(body.toPage) || 0,
      });
      src =
        fetched.kind === "pdf"
          ? { kind: "pdf", pdfBase64: fetched.pdfBase64 }
          : { kind: "text", text: fetched.text };
    } else if (body.source.kind === "pdf") {
      assertValidUpload(body.source.pdfBase64, "pdf");
      src = { kind: "pdf", pdfBase64: body.source.pdfBase64 };
    } else if (body.source.kind === "image") {
      assertValidUpload(body.source.imageBase64, "image");
      const mime = ALLOWED_IMG_MIME.has(body.source.mimeType)
        ? body.source.mimeType
        : "image/jpeg";
      src = {
        kind: "image",
        imageBase64: body.source.imageBase64,
        mimeType: mime,
      };
    } else {
      src = { kind: "text", text: cleanLessonText(body.source.text) };
    }

    const n = Math.max(1, Math.min(MAX_GROUPS, Math.round(Number(body.numGroups) || 1)));
    const maxScore = Math.max(1, Math.min(1000, Math.round(Number(body.maxScore) || 100)));
    const generated = await generateExams(src, n, {
      numQuestions: body.numQuestions,
      maxScore,
    });

    // Pikët vijnë drejtpërdrejt nga AI (3–4 normale, 5–10 të gjata) — shuma = totali real.
    const data: ExamData = {
      lenda: head.lenda,
      klasa: head.klasa,
      tremujori: head.tremujori,
      exams: generated.map((e, i) => ({
        group: groupLabel(i),
        title: e.title,
        questions: e.questions.map((q) => ({
          text: q.text,
          points: q.points,
          difficulty: q.difficulty,
          cognitiveLevel: q.cognitiveLevel,
          rationale: q.rationale,
        })),
      })),
    };

    // Ruaje automatikisht në disk nëse lejohet (lokalisht); në Vercel kjo dështon e injorohet.
    try {
      data.savedPath = await saveExamToDisk(data, authedEmail(req));
    } catch {
      /* fs vetëm-lexim ose s'lejon shkrim — vazhdo pa ruajtje në disk */
    }

    // Ruaje në historikun e mësuesit (vetëm nëse është i kyçur).
    const owner = authedEmail(req);
    if (owner) {
      await saveTest({
        id: newId(),
        email: owner,
        title: data.exams[0]?.title || "Provim",
        lenda: head.lenda,
        klasa: head.klasa,
        tremujori: head.tremujori,
        numGroups: data.exams.length,
        numQuestions: data.exams.reduce((a, e) => a + e.questions.length, 0),
        createdAt: new Date().toISOString(),
        data,
        savedPath: data.savedPath,
      });
    }

    cacheSet(cacheKey, data);
    res.json(data);
  } catch (err) {
    fail(res, err);
  }
});

// 1b) Asistenti i Studimit — i bazuar VETËM te materiali i ngarkuar (pa login).
app.post("/api/assist", async (req, res) => {
  try {
    if (!hasKey(res)) return;
    const body = req.body || {};
    const src = body.source;
    if (src && !src.kind) {
      res.status(400).json({ error: "Materiali i dhënë është i pavlefshëm." });
      return;
    }
    const intent = ASSIST_INTENTS.includes(body.intent) ? body.intent : "explain";
    if (src?.kind === "pdf") assertValidUpload(src.pdfBase64, "pdf");
    else if (src?.kind === "image") assertValidUpload(src.imageBase64, "image");

    const result = await assistWithMaterial({
      source: src,
      intent,
      message: String(body.message || ""),
      history: Array.isArray(body.history) ? body.history.slice(-12) : [],
    });
    res.json(result);
  } catch (err) {
    fail(res, err);
  }
});

// 2) Ndërton Word-in nga provimi i gjeneruar tashmë (pa AI). Kërkon login.
app.post("/api/exam-docx", async (req, res) => {
  try {
    if (!authedEmail(req)) {
      res.status(401).json({ error: "Duhet të identifikohesh për të shkarkuar provimin." });
      return;
    }
    const body = req.body as ExamData;
    if (!body || !Array.isArray(body.exams) || body.exams.length === 0) {
      res.status(400).json({ error: "Mungojnë të dhënat e provimit." });
      return;
    }
    const buf = await buildExamsDocx(
      body.exams.map((e) => ({
        group: e.group,
        tremujori: (body.tremujori || "").trim(),
        lenda: (body.lenda || "").trim(),
        klasa: (body.klasa || "").trim(),
        title: e.title,
        questions: e.questions,
      })),
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", 'attachment; filename="provim-gtl.docx"');
    res.send(buf);
  } catch (err) {
    fail(res, err);
  }
});

// 3) Historiku i provimeve të ruajtura — lista (pa `data` për ngarkesë të vogël). Kërkon login.
app.get("/api/tests", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh për të parë provimet e ruajtura." });
      return;
    }
    const all = await listTests(email);
    const summaries = all.map(({ data, ...rest }) => rest);
    res.json(summaries);
  } catch (err) {
    fail(res, err);
  }
});

// 3b) Një provim i ruajtur sipas id (me `data` për ri-hapje/shkarkim). Kërkon login.
app.get("/api/tests/:id", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh." });
      return;
    }
    const test = await getTest(email, String(req.params.id));
    if (!test) {
      res.status(404).json({ error: "Provimi nuk u gjet." });
      return;
    }
    res.json(test);
  } catch (err) {
    fail(res, err);
  }
});

// 3c) Fshij një provim të ruajtur. Kërkon login.
app.delete("/api/tests/:id", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh." });
      return;
    }
    await deleteTest(email, String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

export default app;
