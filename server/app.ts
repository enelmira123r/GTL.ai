import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { generateExams } from "./gemini";
import type { ExamInput } from "./gemini";
import { fetchLessonFromUrl } from "./fetchUrl";
import { buildExamsDocx } from "./examDocx";
import { registerUser, verifyUser, makeToken, tokenEmail } from "./users";
import type { ExamRequest, ExamData } from "../shared/types";

const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F"];

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
      src = { kind: "pdf", pdfBase64: body.source.pdfBase64 };
    } else {
      src = { kind: "text", text: body.source.text };
    }

    const n = Math.max(1, Math.min(6, Math.round(Number(body.numGroups) || 1)));
    const generated = await generateExams(src, n, { numQuestions: body.numQuestions });

    const data: ExamData = {
      lenda: (body.lenda || "").trim(),
      klasa: (body.klasa || "").trim(),
      tremujori: (body.tremujori || "").trim(),
      exams: generated.map((e, i) => ({
        group: GROUP_LETTERS[i] ?? String(i + 1),
        title: e.title,
        questions: e.questions,
      })),
    };

    // Ruaje automatikisht në disk nëse lejohet (lokalisht); në Vercel kjo dështon e injorohet.
    try {
      data.savedPath = await saveExamToDisk(data, authedEmail(req));
    } catch {
      /* fs vetëm-lexim ose s'lejon shkrim — vazhdo pa ruajtje në disk */
    }

    res.json(data);
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

export default app;
