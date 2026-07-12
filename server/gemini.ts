import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  SYSTEM_GENERATE,
  SYSTEM_GRADE,
  SYSTEM_EXAM,
  difficultyLabel,
} from "./prompts";
import type {
  GenerateRequestText,
  GenerateRequestPdf,
  GenerateResult,
  GradeRequest,
  GradeResult,
  Difficulty,
  CognitiveLevel,
} from "../shared/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Klienti krijohet me përtaci (që serveri të mos rrëzohet kur mungon çelësi).
let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }
  return _genAI;
}

export type Part = { text: string } | { inlineData: { data: string; mimeType: string } };

// ---- Skemat JSON (format Gemini) ----
const GENERATE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    explanation: {
      type: "object",
      properties: {
        summary: { type: "string" },
        keyPoints: { type: "array", items: { type: "string" } },
        terms: {
          type: "array",
          items: {
            type: "object",
            properties: {
              term: { type: "string" },
              definition: { type: "string" },
            },
            required: ["term", "definition"],
          },
        },
        examples: { type: "array", items: { type: "string" } },
      },
      required: ["summary", "keyPoints", "terms", "examples"],
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          type: {
            type: "string",
            format: "enum",
            enum: ["multiple_choice", "true_false", "open"],
          },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctIndex: { type: "integer" },
          explanation: { type: "string" },
          keyPoints: { type: "array", items: { type: "string" } },
          modelAnswer: { type: "string" },
        },
        required: [
          "id",
          "type",
          "question",
          "options",
          "correctIndex",
          "explanation",
          "keyPoints",
          "modelAnswer",
        ],
      },
    },
  },
  required: ["title", "explanation", "questions"],
};

const GRADE_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          score: { type: "number" },
          feedback: { type: "string" },
        },
        required: ["id", "score", "feedback"],
      },
    },
  },
  required: ["results"],
};

const EXAM_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          difficulty: {
            type: "string",
            format: "enum",
            enum: ["easy", "medium", "hard"],
          },
          cognitiveLevel: {
            type: "string",
            format: "enum",
            enum: ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"],
          },
          weight: { type: "number" },
          points: { type: "integer", minimum: 3, maximum: 10 },
          rationale: { type: "string" },
        },
        required: ["text", "difficulty", "cognitiveLevel", "weight", "points", "rationale"],
      },
    },
  },
  required: ["title", "questions"],
};

// Modelet me aftësi pamore (lexojnë imazh/PDF). flash-lite NUK lexon imazhe.
const VISION_CAPABLE = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

// Modeli kryesor + një rezervë (nëse i pari është i mbingarkuar/pa kuotë).
// Për hyrje me imazh/PDF përdoren VETËM modele me aftësi pamore — flash-lite
// nuk i lexon imazhet dhe shkakton gabimin "does not support image input".
function modelChain(vision: boolean): string[] {
  if (!vision) return Array.from(new Set([MODEL, "gemini-flash-lite-latest"]));
  const primary = VISION_CAPABLE.includes(MODEL) ? MODEL : "gemini-2.5-flash";
  return Array.from(new Set([primary, "gemini-2.5-flash"]));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Gabime kalimtare (mbingarkesë/kufi) ku ia vlen të riprovohet.
function isTransient(err: unknown): boolean {
  const m = String((err as Error)?.message ?? err);
  return /\b(503|500|429)\b|UNAVAILABLE|overloaded|high demand|service unavailable|rate.?limit|quota|resource_exhausted/i.test(
    m,
  );
}

export async function runJson(
  system: string,
  schema: object | null,
  parts: Part[],
  temperature: number,
  maxOutputTokens = 8192,
  vision = false,
): Promise<string> {
  let lastErr: unknown;

  for (const modelName of modelChain(vision)) {
    const model = getGenAI().getGenerativeModel({
      model: modelName,
      systemInstruction: system,
      generationConfig: {
        ...(schema
          ? {
              responseMimeType: "application/json",
              responseSchema: schema as never,
            }
          : { responseMimeType: "text/plain" }),
        maxOutputTokens,
        temperature,
      },
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: parts as never }],
        });
        const text = result.response.text();
        if (!text || !text.trim()) {
          throw new Error("Modeli nuk ktheu përgjigje. Provo përsëri ose ndrysho hyrjen.");
        }
        return text;
      } catch (err) {
        lastErr = err;
        if (!isTransient(err)) throw err; // gabim jo-kalimtar → ndalo menjëherë
        await sleep(900 * (attempt + 1)); // backoff: 0.9s, 1.8s, 2.7s
      }
    }
    // të 3 provat dështuan për këtë model → provo modelin rezervë
  }

  throw lastErr;
}

export async function generateMaterial(
  req: GenerateRequestText | GenerateRequestPdf,
): Promise<GenerateResult> {
  const label = difficultyLabel(req.difficulty);

  // Shpërndarje e qartë e llojeve, që testi të dalë me numrin e saktë e të mos jetë i gjithi i njëjti lloj.
  const n = Math.max(1, Math.min(25, Math.round(req.numQuestions || 8)));
  let mc: number;
  let trueFalse: number;
  let open: number;
  if (n <= 2) {
    open = n === 2 ? 1 : 0;
    trueFalse = 0;
    mc = n - open;
  } else {
    open = n <= 4 ? 1 : n <= 8 ? 2 : 3;
    trueFalse = Math.max(1, Math.round((n - open) * 0.34));
    mc = n - open - trueFalse;
    if (mc < 1) {
      mc = 1;
      trueFalse = Math.max(0, n - open - mc);
    }
  }

  const distLines: string[] = [];
  if (mc > 0)
    distLines.push(
      `    • ${mc} pyetje me zgjedhje të shumëfishtë (type "multiple_choice", saktësisht 4 opsione, vetëm një i saktë)`,
    );
  if (trueFalse > 0)
    distLines.push(
      `    • ${trueFalse} pyetje e vërtetë/e gabuar (type "true_false", options = ["E vërtetë","E gabuar"])`,
    );
  if (open > 0)
    distLines.push(`    • ${open} pyetje me përgjigje të hapur (type "open")`);

  let instruction =
    `Krijo materialin mësimor bazuar ${
      req.kind === "pdf" ? "te PDF-ja e bashkangjitur" : "te materiali më poshtë"
    }.\n\n` +
    `Kërkesat:\n` +
    `- Një shpjegim i qartë i mësimit (përmbledhje, pika kryesore, terma me përkufizime, shembuj).\n` +
    `- Niveli i vështirësisë: ${label}. Gjithçka në gjuhën shqipe.\n` +
    `- Testi duhet të ketë SAKTËSISHT ${n} pyetje gjithsej, as më shumë e as më pak, të shpërndara kështu:\n` +
    distLines.join("\n") +
    `\n- Numëroji pyetjet me id nga 1 deri te ${n}.`;

  const parts: Part[] = [];
  if (req.kind === "pdf") {
    parts.push({
      inlineData: { mimeType: "application/pdf", data: req.pdfBase64 },
    });
  } else {
    instruction += `\n\n=== MATERIALI I MËSIMIT ===\n${req.text}`;
  }
  parts.push({ text: instruction });

  const text = await runJson(SYSTEM_GENERATE, GENERATE_SCHEMA, parts, 0.7, 16000, req.kind === "pdf");
  const data = JSON.parse(text) as GenerateResult;
  // Rinumëro id-të (siguri për ndërfaqen) dhe pastro pyetjet boshe.
  data.questions = (data.questions || [])
    .filter((q) => q && q.question)
    .map((q, i) => ({ ...q, id: i + 1 }));
  return data;
}

export async function gradeOpenAnswers(req: GradeRequest): Promise<GradeResult> {
  const payload = req.items.map((i) => ({
    id: i.id,
    pyetja: i.question,
    pikat_kyce: i.keyPoints,
    pergjigja_e_nxenesit: i.studentAnswer,
  }));

  const user =
    `Vlerëso përgjigjet e mëposhtme të nxënësit për pyetjet me përgjigje të hapur. ` +
    `Kthe një rezultat për secilën pyetje sipas 'id'.\n\n` +
    JSON.stringify(payload, null, 2);

  const text = await runJson(SYSTEM_GRADE, GRADE_SCHEMA, [{ text: user }], 0.3);
  return JSON.parse(text) as GradeResult;
}

// ---- Gjenerimi i provimit Word (.docx) ----
export type ExamInput =
  | { kind: "text"; text: string }
  | { kind: "pdf"; pdfBase64: string }
  | { kind: "image"; imageBase64: string; mimeType: string };

export interface ExamQuestionMeta {
  text: string;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  /** Pesha relative e kompleksitetit (1–10). */
  weight: number;
  /** Pikët e pyetjes (3–4 normale, 5–10 të gjata), të caktuara nga AI. */
  points: number;
  /** Arsyeja arsimore e peshës (për skemën e notimit). */
  rationale: string;
}

export interface ExamContent {
  title: string;
  questions: ExamQuestionMeta[];
}

const VALID_DIFF: Difficulty[] = ["easy", "medium", "hard"];
const VALID_COG: CognitiveLevel[] = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create",
];

// Pastron metadatat e çdo pyetjeje; pesha dhe nivelet kufizohen në vlera të vlefshme.
function sanitizeExam(raw: {
  title?: string;
  questions?: {
    text?: string;
    difficulty?: string;
    cognitiveLevel?: string;
    weight?: number;
    points?: number;
    rationale?: string;
  }[];
}): ExamContent {
  const qs = (raw.questions || [])
    .filter((q) => q && q.text)
    .map((q) => {
      const difficulty = VALID_DIFF.includes(q.difficulty as Difficulty)
        ? (q.difficulty as Difficulty)
        : "medium";
      const cognitiveLevel = VALID_COG.includes(q.cognitiveLevel as CognitiveLevel)
        ? (q.cognitiveLevel as CognitiveLevel)
        : "Understand";
      let weight = Number(q.weight);
      if (!Number.isFinite(weight)) weight = 5;
      weight = Math.min(10, Math.max(1, weight));

      // Pikët variojnë sipas vështirësisë: e lehtë 1–2, mesatare 3–4, e vështirë 5–10.
      let points = Math.round(Number(q.points));
      if (!Number.isFinite(points)) {
        points = difficulty === "easy" ? 2 : difficulty === "hard" ? 5 : 4;
      }
      const [lo, hi] =
        difficulty === "easy" ? [1, 2] : difficulty === "medium" ? [3, 4] : [5, 10];
      points = Math.min(hi, Math.max(lo, points));

      return {
        text: String(q.text),
        difficulty,
        cognitiveLevel,
        weight,
        points,
        rationale: String(q.rationale || ""),
      };
    });
  if (qs.length === 0) throw new Error("Nuk u krijuan dot pyetje për provimin.");
  return { title: raw.title || "Detyrë Përmbledhëse", questions: qs };
}

export async function generateExam(
  src: ExamInput,
  numQuestions = 5,
  maxScore = 100,
): Promise<ExamContent> {
  const nq = Math.max(1, Math.min(15, Math.round(numQuestions || 5)));
  const total = Math.max(1, Math.min(1000, Math.round(maxScore || 100)));
  let instruction =
    `Krijo një provim ("detyrë përmbledhëse") bazuar ${
      src.kind === "pdf"
        ? "te PDF-ja e bashkangjitur"
        : src.kind === "image"
          ? "te fotografia e bashkangjitur të faqes së librit"
          : "te materiali më poshtë"
    }.\n` +
    `Jep një titull të shkurtër dhe SAKTËSISHT ${nq} pyetje me përgjigje të hapur (as më shumë e as më pak). ` +
    `Vlerëso vështirësinë, nivelin kognitiv, peshën (1–10) dhe arsyen për ÇDO pyetje sipas udhëzimeve në sistem. ` +
    `Cakto edhe pikët (points) sipas vështirësisë: e lehtë 1–2, mesatare 3–4, e vështirë 5, e vështirë dhe shumë e gjatë 5–10. Syrno që shuma të jetë afër ${total}.`;

  const parts: Part[] = [];
  if (src.kind === "pdf") {
    parts.push({ inlineData: { mimeType: "application/pdf", data: src.pdfBase64 } });
  } else if (src.kind === "image") {
    parts.push({ inlineData: { mimeType: src.mimeType, data: src.imageBase64 } });
  } else {
    instruction += `\n\n=== MATERIALI I MËSIMIT ===\n${src.text}`;
  }
  parts.push({ text: instruction });

  const text = await runJson(SYSTEM_EXAM, EXAM_SCHEMA, parts, 0.7, 32000, src.kind === "image" || src.kind === "pdf");
  return sanitizeExam(JSON.parse(text));
}

const EXAM_MULTI_SCHEMA = {
  type: "object",
  properties: {
    exams: {
      type: "array",
      items: EXAM_SCHEMA,
    },
  },
  required: ["exams"],
};

/** Gjeneron `numGroups` variante TË NDRYSHME provimi (një për secilin grup). Pikët varen nga vështirësia. */
export async function generateExams(
  src: ExamInput,
  numGroups: number,
  opts: { numQuestions?: number; maxScore?: number } = {},
): Promise<ExamContent[]> {
  const n = Math.max(1, Math.min(30, Math.round(numGroups || 1)));
  const nq = Math.max(1, Math.min(15, Math.round(opts.numQuestions || 5)));
  const total = Math.max(1, Math.min(1000, Math.round(opts.maxScore || 100)));

  let instruction =
    `Krijo ${n} VARIANTE TË NDRYSHME provimi ("detyra përmbledhëse"), një për secilin grup, bazuar ${
      src.kind === "pdf"
        ? "te PDF-ja e bashkangjitur"
        : src.kind === "image"
          ? "te fotografia e bashkangjitur të faqes së librit"
          : "te materiali më poshtë"
    }.\n` +
    `Çdo variant duhet të ketë një titull të shkurtër dhe SAKTËSISHT ${nq} pyetje me përgjigje të hapur (as më shumë e as më pak).\n` +
    `Vlerëso vështirësinë, nivelin kognitiv, peshën (1–10) dhe arsyen për ÇDO pyetje sipas udhëzimeve në sistem. ` +
    `Cakto edhe pikët (points) sipas vështirësisë: e lehtë 1–2, mesatare 3–4, e vështirë 5, e vështirë dhe shumë e gjatë 5–10. Syrno që shuma e çdo varianti të jetë afër ${total}.\n` +
    `Variantet duhet të jenë TË NDRYSHME nga njëri-tjetri (pyetje dhe formulime të ndryshme), por të mbulojnë të njëjtën temë në të njëjtin nivel vështirësie.`;

  const parts: Part[] = [];
  if (src.kind === "pdf") {
    parts.push({ inlineData: { mimeType: "application/pdf", data: src.pdfBase64 } });
  } else if (src.kind === "image") {
    parts.push({ inlineData: { mimeType: src.mimeType, data: src.imageBase64 } });
  } else {
    instruction += `\n\n=== MATERIALI I MËSIMIT ===\n${src.text}`;
  }
  parts.push({ text: instruction });

  const text = await runJson(SYSTEM_EXAM, EXAM_MULTI_SCHEMA, parts, 0.85, 32000, src.kind === "image" || src.kind === "pdf");
  const raw = JSON.parse(text) as { exams?: { title?: string; questions?: { text?: string; points?: number }[] }[] };
  const rawExams = Array.isArray(raw.exams) ? raw.exams : [];

  const exams: ExamContent[] = [];
  for (let i = 0; i < n; i++) {
    // Nëse modeli ktheu më pak variante, plotëso me një thirrje të veçantë.
    const source = rawExams[i] ?? (await generateExam(src, nq, total));
    exams.push(sanitizeExam(source));
  }
  return exams;
}
