import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { generateExams, generateLesson, generateQuiz, gradeQuiz, generateFlashcards, generatePractice } from "./gemini";
import type { ExamInput } from "./gemini";
import { assistWithMaterial, ASSIST_INTENTS } from "./assist";
import { fetchLessonFromUrl } from "./fetchUrl";
import { buildExamsDocx } from "./examDocx";
import { cleanLessonText } from "./cleanText";
import {
  registerUser,
  verifyUser,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendEmailCode,
  makeToken,
  tokenEmail,
  tokenUser,
} from "./users";
import type { TokenUser } from "./users";
import { saveTest, listTests, getTest, deleteTest, newId, listActivities, saveActivity, listGoals, saveGoal, getAchievements, saveActivityProgress, getProgressReport } from "./store";
import type { ExamRequest, ExamData, DailyGoal } from "../shared/types";

const MAX_GROUPS = 30;

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

function authedUser(req: express.Request): TokenUser | null {
  const m = (req.headers.authorization || "").match(/^Bearer (.+)$/);
  return m ? tokenUser(m[1]) : null;
}

function requireTeacher(req: express.Request, res: express.Response): boolean {
  const user = authedUser(req);
  if (!user) {
    res.status(401).json({ error: "Duhet të identifikohesh." });
    return false;
  }
  if (user.role !== "teacher") {
    res.status(403).json({ error: "Ky funksion është vetëm për mësuesit." });
    return false;
  }
  return true;
}

function sanitizeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "").trim() || "pa-emer";
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

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
app.use(express.json({ limit: "25mb" }));

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

// ---- Llogaritë ----
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    const r = await registerUser(
      String(email || ""),
      String(password || ""),
      String(role || "teacher"),
    );
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ token: makeToken(r.email, r.role), email: r.email, role: r.role });
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
    res.json({ token: makeToken(r.email, r.role), email: r.email, role: r.role });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/change-password", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh." });
      return;
    }
    const { current, next } = req.body || {};
    const r = await changePassword(email, String(current || ""), String(next || ""));
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const r = await requestPasswordReset(String(email || ""));
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ ok: true, devToken: r.devToken });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    const r = await resetPassword(String(token || ""), String(password || ""));
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body || {};
    const r = await verifyEmail(String(email || ""), String(code || ""));
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/resend-verification", async (req, res) => {
  try {
    const { email } = req.body || {};
    const r = await resendEmailCode(String(email || ""));
    if (!r.ok) {
      res.status(400).json({ error: r.error });
      return;
    }
    res.json({ ok: true, devCode: r.devCode });
  } catch (err) {
    fail(res, err);
  }
});

// ---- Provimet (mësuesit) ----
app.post("/api/exam-generate", async (req, res) => {
  try {
    if (!requireTeacher(req, res)) return;
    if (!hasKey(res)) return;
    const body = req.body as ExamRequest;
    if (!body || !body.source) {
      res.status(400).json({ error: "Mungon materiali për provimin." });
      return;
    }

    const head = {
      lenda: sanitizeText(body.lenda),
      klasa: sanitizeText(body.klasa),
      tremujori: sanitizeText(body.tremujori),
    };

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

    try {
      data.savedPath = await saveExamToDisk(data, authedEmail(req));
    } catch {
      /* fs vetëm-lexim ose s'lejon shkrim */
    }

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

app.post("/api/exam-docx", async (req, res) => {
  try {
    if (!requireTeacher(req, res)) return;
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
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="provim-gtl.docx"');
    res.send(buf);
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/tests", async (req, res) => {
  try {
    if (!requireTeacher(req, res)) return;
    const email = authedEmail(req)!;
    const all = await listTests(email);
    const summaries = all.map(({ data, ...rest }) => rest);
    res.json(summaries);
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/tests/:id", async (req, res) => {
  try {
    if (!requireTeacher(req, res)) return;
    const email = authedEmail(req)!;
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

app.delete("/api/tests/:id", async (req, res) => {
  try {
    if (!requireTeacher(req, res)) return;
    const email = authedEmail(req)!;
    await deleteTest(email, String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

// ---- Mësimet e nxënësit ----

const VIRTUAL_TEACHERS = [
  {
    id: "math",
    name: "Profesori Matematikë",
    subject: "Matematikë",
    emoji: "📐",
    personality: "Strukturues dhe logjik",
    style: "Mësohet me hapa të qartë dhe shembuj numerikë. I dashur për detyra të shumta dhe zgjidhje hap pas hapi.",
  },
  {
    id: "physics",
    name: "Profesoria Fizikë",
    subject: "Fizikë",
    emoji: "⚛️",
    personality: "Sprovuese dhe eksperimentuese",
    style: "Përdor eksperimente dhe shembuj nga jeta e përditshme për të kuptueshëm fizikën.",
  },
  {
    id: "chemistry",
    name: "Profesoria Kimi",
    subject: "Kimi",
    emoji: "🧪",
    personality: "E detajuar dhe eksperimentuale",
    style: "Shpjegon me reaksione dhe shembuj praktikë. Shendërron konceptet abstrakte në gjëra të qarta.",
  },
  {
    id: "biology",
    name: "Profesoria Biologji",
    subject: "Biologji",
    emoji: "🧬",
    personality: "E guximshme dhe eksploruese",
    style: "E dashur për natyrën dhe jetën. Përdor shembuj nga bota e sipërme, bota e poshtme dhe organizmi.",
  },
  {
    id: "cs",
    name: "Profesoria Informatikë",
    subject: "Informatikë",
    emoji: "💻",
    personality: "Teknologjike dhe krijuese",
    style: "Mëson me shembuj kodi dhe projektet praktike. E bën programimin të lehtë dhe argëtues.",
  },
  {
    id: "english",
    name: "Profesoria Anglisht",
    subject: "Anglisht",
    emoji: "📚",
    personality: "Gjallëruese dhe ndërvepruese",
    style: "Mëson me biseda, historira dhe ushtrime të ndërveprueshme. Ndihmon të përmirësosh gramatikën dhe shqiptimin.",
  },
  {
    id: "history",
    name: "Profesoria Historii",
    subject: "Histori",
    emoji: "🏛️",
    personality: "Përrallëse dhe kontekstuale",
    style: "E sjell historinë si përrallë me ngjarje dhe njerëz të vërtetë. Ndihmon të kuptosh arsyet historike.",
  },
  {
    id: "geography",
    name: "Profesoria Gjeografi",
    subject: "Gjeografi",
    emoji: "🌍",
    personality: "Hulumtuese dhe vizuale",
    style: "Përdor harta, situa dhe shembuj nga gjithë bota. E bën gjeografinë të jetë të gjallë dhe konkrete.",
  },
];

app.get("/api/student/teachers", async (_req, res) => {
  try {
    res.json({ teachers: VIRTUAL_TEACHERS });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/student/lesson", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh për të marrë mësim." });
      return;
    }
    if (!hasKey(res)) return;
    const { topic, teacherId, difficulty } = req.body || {};
    if (!topic || !topic.trim()) {
      res.status(400).json({ error: "Tema mungon." });
      return;
    }
    const teacher = VIRTUAL_TEACHERS.find((t) => t.id === teacherId) || VIRTUAL_TEACHERS[0];
    const result = await generateLesson(
      topic.trim(),
      teacher.subject,
      teacher.personality,
      teacher.style,
      String(difficulty || "mesatar")
    );
    await saveActivity({
      id: newId(),
      email,
      type: "lesson",
      subject: teacher.subject,
      topic: topic.trim(),
      createdAt: new Date().toISOString(),
    });
    await saveActivityProgress(email, teacher.subject, "lesson");
    res.json({ ...result, teacherId: teacher.id, teacherName: teacher.name, subject: teacher.subject });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/student/quiz", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh për të marrë kuizin." });
      return;
    }
    if (!hasKey(res)) return;
    const { topic, teacherId, numQuestions } = req.body || {};
    if (!topic || !topic.trim()) {
      res.status(400).json({ error: "Tema mungon." });
      return;
    }
    const teacher = VIRTUAL_TEACHERS.find((t) => t.id === teacherId) || VIRTUAL_TEACHERS[0];
    const result = await generateQuiz(
      topic.trim(),
      teacher.subject,
      teacher.personality,
      Math.max(3, Math.min(15, Number(numQuestions) || 5))
    );
    await saveActivity({
      id: newId(),
      email,
      type: "quiz",
      subject: teacher.subject,
      topic: topic.trim(),
      createdAt: new Date().toISOString(),
    });
    await saveActivityProgress(email, teacher.subject, "quiz");
    res.json({ ...result, teacherId: teacher.id, teacherName: teacher.name, subject: teacher.subject });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/student/quiz/grade", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh." });
      return;
    }
    if (!hasKey(res)) return;
    const { answers, questions, topic, subject } = req.body || {};
    if (!Array.isArray(answers) || !Array.isArray(questions)) {
      res.status(400).json({ error: "Të dhënat e pakqses." });
      return;
    }
    const result = await gradeQuiz(answers, questions, String(topic || ""), String(subject || ""));
    await saveActivity({
      id: newId(),
      email,
      type: "quiz_submit",
      subject: String(subject || "E përzgjedhur"),
      topic: String(topic || "Kuiz"),
      createdAt: new Date().toISOString(),
      score: result.score,
      total: result.total,
    });
    await saveActivityProgress(email, String(subject || "E përzgjedhur"), "quiz_submit", result.score, result.total);
    res.json(result);
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/student/flashcards", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh për të marrë fletët." });
      return;
    }
    if (!hasKey(res)) return;
    const { topic, teacherId } = req.body || {};
    if (!topic || !topic.trim()) {
      res.status(400).json({ error: "Tema mungon." });
      return;
    }
    const teacher = VIRTUAL_TEACHERS.find((t) => t.id === teacherId) || VIRTUAL_TEACHERS[0];
    const result = await generateFlashcards(topic.trim(), teacher.subject, teacher.personality);
    await saveActivity({
      id: newId(),
      email,
      type: "flashcards",
      subject: teacher.subject,
      topic: topic.trim(),
      createdAt: new Date().toISOString(),
    });
    await saveActivityProgress(email, teacher.subject, "flashcards");
    res.json({ ...result, teacherId: teacher.id, teacherName: teacher.name, subject: teacher.subject });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/student/practice", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh për të marrë ushtrimin." });
      return;
    }
    if (!hasKey(res)) return;
    const { topic, teacherId } = req.body || {};
    if (!topic || !topic.trim()) {
      res.status(400).json({ error: "Tema mungon." });
      return;
    }
    const teacher = VIRTUAL_TEACHERS.find((t) => t.id === teacherId) || VIRTUAL_TEACHERS[0];
    const result = await generatePractice(topic.trim(), teacher.subject, teacher.personality);
    await saveActivity({
      id: newId(),
      email,
      type: "practice",
      subject: teacher.subject,
      topic: topic.trim(),
      createdAt: new Date().toISOString(),
    });
    await saveActivityProgress(email, teacher.subject, "practice");
    res.json({ ...result, teacherId: teacher.id, teacherName: teacher.name, subject: teacher.subject });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/student/progress", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh." });
      return;
    }
    const report = await getProgressReport(email);
    res.json(report);
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/student/history", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh." });
      return;
    }
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const activities = await listActivities(email, limit);
    res.json({ activities });
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/student/goals", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh." });
      return;
    }
    const goals = await listGoals(email);
    res.json({ goals });
  } catch (err) {
    fail(res, err);
  }
});

app.post("/api/student/goals", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh." });
      return;
    }
    const { dailyTarget, completedToday } = req.body || {};
    const goal: DailyGoal = {
      id: newId(),
      email,
      dailyTarget: Math.max(1, Math.min(50, Number(dailyTarget) || 3)),
      completedToday: Math.max(0, Math.min(100, Number(completedToday) || 0)),
      updatedAt: new Date().toISOString(),
    };
    await saveGoal(goal);
    res.json(goal);
  } catch (err) {
    fail(res, err);
  }
});

app.get("/api/student/achievements", async (req, res) => {
  try {
    const email = authedEmail(req);
    if (!email) {
      res.status(401).json({ error: "Duhet të identifikohesh." });
      return;
    }
    const achievements = await getAchievements(email);
    res.json({ achievements });
  } catch (err) {
    fail(res, err);
  }
});

export default app;
