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
import type {
  LessonResult,
  QuizResult,
  FlashcardResult,
  PracticeResult,
  QuizGradeResult,
} from "../shared/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let _genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }
  return _genAI;
}

export type Part = { text: string } | { inlineData: { data: string; mimeType: string } };

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

const VISION_CAPABLE = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

function modelChain(vision: boolean): string[] {
  if (!vision) return Array.from(new Set([MODEL, "gemini-flash-lite-latest"]));
  const primary = VISION_CAPABLE.includes(MODEL) ? MODEL : "gemini-2.5-flash";
  return Array.from(new Set([primary, "gemini-2.5-flash"]));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
        if (!isTransient(err)) throw err;
        await sleep(900 * (attempt + 1));
      }
    }
  }

  throw lastErr;
}

// ---- Skemat për nxënësit ----

const LESSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
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
    practiceExercise: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          hint: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "hint", "answer"],
      },
    },
    quickQuiz: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctIndex: { type: "integer" },
          explanation: { type: "string" },
        },
        required: ["question", "options", "correctIndex", "explanation"],
      },
    },
  },
  required: ["title", "summary", "keyPoints", "terms", "examples", "practiceExercise", "quickQuiz"],
};

const QUIZ_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          type: {
            type: "string",
            format: "enum",
            enum: ["multiple_choice", "true_false"],
          },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctIndex: { type: "integer" },
          explanation: { type: "string" },
        },
        required: ["id", "type", "question", "options", "correctIndex", "explanation"],
      },
    },
  },
  required: ["title", "questions"],
};

const FLASHCARDS_SCHEMA = {
  type: "object",
  properties: {
    topic: { type: "string" },
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: { type: "string" },
        },
        required: ["front", "back"],
      },
    },
  },
  required: ["topic", "cards"],
};

const PRACTICE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    problems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          question: { type: "string" },
          hint: { type: "string" },
          solution: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        },
        required: ["id", "question", "hint", "solution", "difficulty"],
      },
    },
  },
  required: ["title", "problems"],
};

const QUIZ_GRADE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer" },
    total: { type: "integer" },
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionId: { type: "integer" },
          correct: { type: "boolean" },
          feedback: { type: "string" },
          correctAnswer: { type: "string" },
        },
        required: ["questionId", "correct", "feedback", "correctAnswer"],
      },
    },
    summary: { type: "string" },
  },
  required: ["score", "total", "results", "summary"],
};

// ---- Funksionet e reja për nxënësit ----

export async function generateLesson(
  topic: string,
  subject: string,
  personality: string,
  style: string,
  difficulty: string,
): Promise<LessonResult> {
  const instruction = `Krijo një mësim të plotë dhe të strukturuar për lëndën "${subject}" mbi temën "${topic}".
Vështirësia: ${difficulty}.
Personiteti i mësuesit: ${personality}.
Stili i mësimit: ${style}.

Kthe JSON sipas skemës LESSON_SCHEMA.`;

  const text = await runJson(
    `Ti je një mësues virtualspecializuar në ${subject}. ${personality}. ${style}. Përgjigju gjithmonë në shqip.`,
    LESSON_SCHEMA,
    [{ text: instruction }],
    0.8,
    32000,
    false,
  );
  const data = JSON.parse(text);
  return {
    title: data.title || `Mësimi: ${topic}`,
    summary: data.summary || "",
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
    terms: Array.isArray(data.terms) ? data.terms : [],
    examples: Array.isArray(data.examples) ? data.examples : [],
    practiceExercise: Array.isArray(data.practiceExercise) ? data.practiceExercise : [],
    quickQuiz: Array.isArray(data.quickQuiz) ? data.quickQuiz : [],
  };
}

export async function generateQuiz(
  topic: string,
  subject: string,
  personality: string,
  numQuestions: number,
): Promise<QuizResult> {
  const instruction = `Krijo një kuiz nga ${numQuestions} pyetje për "${topic}" në lëndën ${subject}.
Personiteti i mësuesit: ${personality}.
Përdor vetëm llojet "multiple_choice" dhe "true_false".
Për "true_false" jep opsionet: ["E vërtetë", "E gabuar"].
Sigurohu që pyetjet të jenë të Motivuese, të bazohen në konceptet kyçe dhe të kenë vështirësi të përzier.

Kthe JSON sipas skemës QUIZ_SCHEMA.`;

  const text = await runJson(
    `Ti je një mësues virtualspecializuar në ${subject}. ${personality}. Krijo pyetje kuizesh të artë në shqip.`,
    QUIZ_SCHEMA,
    [{ text: instruction }],
    0.75,
    16000,
    false,
  );
  const data = JSON.parse(text);
  return {
    title: data.title || `Kuiz: ${topic}`,
    questions: (data.questions || []).map((q: any, i: number) => ({
      id: q.id ?? i + 1,
      type: q.type === "true_false" ? "true_false" : "multiple_choice",
      question: String(q.question || ""),
      options: Array.isArray(q.options) ? q.options : [],
      correctIndex: Number(q.correctIndex) || 0,
      explanation: String(q.explanation || ""),
    })),
  };
}

export async function gradeQuiz(
  answers: number[],
  questions: { type: string; options: string[]; correctIndex: number; explanation: string }[],
  topic: string,
  subject: string,
): Promise<QuizGradeResult> {
  const payload = questions.map((q, i) => ({
    id: i + 1,
    pyetja: q.question || `Pyetja ${i + 1}`,
    opsionet: q.options,
    pergjigja_e_sakte: q.options[q.correctIndex] || "Nuk ka",
    pergjigja_e_nxenesit: answers[i] !== undefined ? q.options[answers[i]] || "Bosh" : "Bosh",
  }));

  const instruction =
    `Vlerëso këtë kuiz për temën "${topic}" në lëndën ${subject}. ` +
    `Kthe rezultatin për çdo pyetje.\n\n` +
    JSON.stringify(payload, null, 2);

  const text = await runJson(
    `Ti je një mësues që korrigjon kuize në shqip, me ndihmëse dhe konstruktive. Jep notën 1 për përgjigje të saktë, 0 për të gabuar. Jep feedback konktet.`,
    QUIZ_GRADE_SCHEMA,
    [{ text: instruction }],
    0.3,
    8192,
    false,
  );
  const data = JSON.parse(text);
  const score = Number(data.score) || 0;
  const total = Number(data.total) || questions.length;
  return {
    score: Math.min(total, Math.max(0, score)),
    total,
    results: Array.isArray(data.results)
      ? data.results.map((r: any) => ({
          questionId: r.questionId,
          correct: !!r.correct,
          feedback: String(r.feedback || ""),
          correctAnswer: String(r.correctAnswer || ""),
        }))
      : [],
    summary: String(data.summary || ""),
  };
}

export async function generateFlashcards(
  topic: string,
  subject: string,
  personality: string,
): Promise<FlashcardResult> {
  const instruction = `Krijo 8-12 fletë studimi (flashcards) për temën "${topic}" në lëndën ${subject}.
Secila fletë duhet të ketë një pyetje/fjalë përballë dhe përkufizimin/përgjigjen në anën tjetër.
Personiteti: ${personality}.
Kthe JSON sipas skemës FLASHCARDS_SCHEMA.`;

  const text = await runJson(
    `Ti je një mësues virtual i ${subject} që krijon fletë studimi efektive në shqip.`,
    null,
    [{ text: instruction }],
    0.7,
    8000,
    false,
  );
  const data = JSON.parse(text);
  const cards = Array.isArray(data.cards)
    ? data.cards.map((c: any) => ({
        front: String(c.front || c.term || ""),
        back: String(c.back || c.definition || ""),
      }))
    : [];
  return { topic: data.topic || topic, cards };
}

export async function generatePractice(
  topic: string,
  subject: string,
  personality: string,
): Promise<PracticeResult> {
  const instruction = `Krijo 3-5 ushtrime praktike për temën "${topic}" në lëndën ${subject}.
Secila ushtrim duhet të ketë pyetjen, ndihmën (hint) dhe zgjidhjen e plotë me shpjegim.
Personiteti: ${personality}.
Vështirësitë duhet të jenë të përziera (të lehta, mesatare, të vështira).
Kthe JSON sipas skemës PRACTICE_SCHEMA.`;

  const text = await runJson(
    `Ti je një mësues virtual i ${subject} që krijon ushtrime praktike në shqip, me zgjidhje hap pas hapi.`,
    null,
    [{ text: instruction }],
    0.7,
    12000,
    false,
  );
  const data = JSON.parse(text);
  return {
    title: data.title || `Ushtrime: ${topic}`,
    problems: (data.problems || []).map((p: any, i: number) => ({
      id: p.id ?? i + 1,
      question: String(p.question || ""),
      hint: String(p.hint || ""),
      solution: String(p.solution || ""),
      difficulty: ["easy", "medium", "hard"].includes(p.difficulty) ? p.difficulty : "medium",
    })),
  };
}

export async function generateMaterial(
  req: GenerateRequestText | GenerateRequestPdf,
): Promise<GenerateResult> {
  const label = difficultyLabel(req.difficulty);

  let mc: number;
  let trueFalse: number;
  let open: number;
  const n = Math.max(1, Math.min(25, Math.round(req.numQuestions || 8)));
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
    `- Një shpjegim i qartë e i strukturuar (përmbledhje, pika kryesore, terma me përkufizime, shembuj).\n` +
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

export type ExamInput =
  | { kind: "text"; text: string }
  | { kind: "pdf"; pdfBase64: string }
  | { kind: "image"; imageBase64: string; mimeType: string };

export interface ExamQuestionMeta {
  text: string;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  weight: number;
  points: number;
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
    const source = rawExams[i] ?? (await generateExam(src, nq, total));
    exams.push(sanitizeExam(source));
  }
  return exams;
}
