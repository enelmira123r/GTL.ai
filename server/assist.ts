import { Part, runJson } from "./gemini";
import { SYSTEM_ASSIST, SYSTEM_GENERAL } from "./prompts";
import { fetchLessonFromUrl } from "./fetchUrl";
import { cleanLessonText } from "./cleanText";
import type { ExamSource } from "../shared/types";

export type AssistIntent =
  | "explain"
  | "question"
  | "simplify"
  | "summary"
  | "flashcards"
  | "steps";

export const ASSIST_INTENTS: AssistIntent[] = [
  "explain",
  "question",
  "simplify",
  "summary",
  "flashcards",
  "steps",
];

export interface AssistMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistRequest {
  source: ExamSource;
  intent: AssistIntent;
  message: string;
  history?: AssistMessage[];
}

export interface AssistResult {
  intent: AssistIntent;
  answer: string;
  cards?: { term: string; definition: string }[];
  steps?: { title: string; detail: string }[];
}

const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "keyPoints"],
};

const FLASHCARDS_SCHEMA = {
  type: "object",
  properties: {
    cards: {
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
  },
  required: ["cards"],
};

const STEPS_SCHEMA = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
  },
  required: ["steps"],
};

async function buildParts(
  source: ExamSource,
): Promise<{ parts: Part[]; materialText: string }> {
  const parts: Part[] = [];
  let materialText = "";
  if (source.kind === "pdf") {
    parts.push({ inlineData: { mimeType: "application/pdf", data: source.pdfBase64 } });
  } else if (source.kind === "image") {
    parts.push({
      inlineData: { mimeType: source.mimeType || "image/jpeg", data: source.imageBase64 },
    });
  } else if (source.kind === "url") {
    const fetched = await fetchLessonFromUrl(source.url, {});
    if (fetched.kind === "pdf") {
      parts.push({ inlineData: { mimeType: "application/pdf", data: fetched.pdfBase64 } });
    } else {
      materialText = fetched.text;
    }
  } else {
    materialText = cleanLessonText(source.text);
  }
  return { parts, materialText };
}

export async function assistWithMaterial(req: AssistRequest): Promise<AssistResult> {
  const hasSource = !!(req.source && req.source.kind);
  const intent = req.intent;

  const schema =
    intent === "summary"
      ? SUMMARY_SCHEMA
      : intent === "flashcards"
        ? FLASHCARDS_SCHEMA
        : intent === "steps"
          ? STEPS_SCHEMA
          : null;

  const historyText = (req.history || [])
    .map((m) => `${m.role === "user" ? "Nxënësi" : "Asistenti"}: ${m.content}`)
    .join("\n");

  const parts: Part[] = [];
  let instruction: string;

  if (hasSource) {
    const built = await buildParts(req.source!);
    parts.push(...built.parts);
    instruction = `=== MATERIALI MËSIMOR ===\n${built.materialText || "(shiko fajllin e bashkangjitur)"}\n\n`;
    instruction += `VEPRIMI KËRKUAR: ${intent}\n`;
    if (req.message) instruction += `KËRKESA E NXËNËSIT: ${req.message}\n`;
    if (historyText) instruction += `\n=== HISTORIKU I BISHEDHJEVE ===\n${historyText}\n`;
    if (schema) instruction += `\nKthe VETËM JSON sipas skemës.`;
  } else {
    // Mënyra e përgjithshme (chatbot) — pa material, përgjigjet për çdo gjë.
    instruction = `== MËNYRA E PËRGJITHSHME (CHAT) ==\n`;
    instruction += `VEPRIMI KËRKUAR: ${intent}\n`;
    if (req.message) instruction += `MESAZHI I PËRDORUESIT: ${req.message}\n`;
    if (historyText) instruction += `\n=== HISTORIKU I BISHEDHJEVE ===\n${historyText}\n`;
    if (schema) instruction += `\nKthe VETËM JSON sipas skemës.`;
  }

  parts.push({ text: instruction });

  const vision =
    hasSource && (req.source!.kind === "image" || req.source!.kind === "pdf");
  const text = await runJson(
    hasSource ? SYSTEM_ASSIST : SYSTEM_GENERAL,
    schema,
    parts,
    intent === "simplify" ? 0.5 : 0.7,
    32000,
    vision,
  );

  if (!schema) return { intent, answer: text.trim() };

  const data = JSON.parse(text) as Record<string, unknown>;
  if (intent === "summary") {
    const summary = String(data.summary || "");
    const keyPoints = Array.isArray(data.keyPoints)
      ? (data.keyPoints as string[])
      : [];
    const bullets = keyPoints.length
      ? "\n\n**Pikat kryesore:**\n" + keyPoints.map((p) => `- ${p}`).join("\n")
      : "";
    return { intent, answer: (summary + bullets).trim() };
  }
  if (intent === "flashcards") {
    const cards = Array.isArray(data.cards)
      ? (data.cards as { term: string; definition: string }[])
      : [];
    return { intent, answer: `U krijuan ${cards.length} fletë studimi.`, cards };
  }
  // steps
  const steps = Array.isArray(data.steps)
    ? (data.steps as { title: string; detail: string }[])
    : [];
  return { intent, answer: `Zgjidhja hap pas hapi (${steps.length} hapa):`, steps };
}
