// Tipa të përbashkët mes frontend-it dhe serverit.

export type QuestionType = "multiple_choice" | "true_false" | "open";

export interface Question {
  id: number;
  type: QuestionType;
  question: string;
  /** 4 opsione për 'multiple_choice'; 2 për 'true_false'; [] për 'open'. */
  options: string[];
  /** Indeksi i përgjigjes së saktë (nga 0). -1 për 'open'. */
  correctIndex: number;
  /** Shpjegim pse përgjigjja e saktë është e saktë. */
  explanation: string;
  /** Vetëm për 'open': pikat kyçe që pritet të mbulojë përgjigjja. */
  keyPoints: string[];
  /** Vetëm për 'open': shembull i një përgjigjeje të plotë. */
  modelAnswer: string;
}

export interface Term {
  term: string;
  definition: string;
}

export interface Explanation {
  summary: string;
  keyPoints: string[];
  terms: Term[];
  examples: string[];
}

export interface GenerateResult {
  title: string;
  explanation: Explanation;
  questions: Question[];
}

export type GenDifficulty = "lehte" | "mesatar" | "veshtire";

export interface GenerateRequestText {
  kind: "text";
  text: string;
  difficulty: GenDifficulty;
  numQuestions: number;
}

export interface GenerateRequestPdf {
  kind: "pdf";
  pdfBase64: string;
  fileName: string;
  difficulty: GenDifficulty;
  numQuestions: number;
}

export interface GenerateRequestUrl {
  kind: "url";
  url: string;
  difficulty: GenDifficulty;
  numQuestions: number;
}

export type GenerateRequest =
  | GenerateRequestText
  | GenerateRequestPdf
  | GenerateRequestUrl;

export interface GradeRequestItem {
  id: number;
  question: string;
  keyPoints: string[];
  studentAnswer: string;
}

export interface GradeRequest {
  items: GradeRequestItem[];
}

export interface GradeItem {
  id: number;
  /** 1 = e plotë, 0.5 = pjesërisht, 0 = e gabuar. */
  score: number;
  feedback: string;
}

export interface GradeResult {
  results: GradeItem[];
}

// ---- Provimi Word (.docx) ----

/** Vështirësia e një pyetjeje (vlerësuar nga AI). */
export type Difficulty = "easy" | "medium" | "hard";

/** Nivelet kognitive sipas Taksonomisë së Bloom-it. */
export const COGNITIVE_LEVELS = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create",
] as const;
export type CognitiveLevel = (typeof COGNITIVE_LEVELS)[number];

export const DIFFICULTY_LABEL_AL: Record<Difficulty, string> = {
  easy: "E lehtë",
  medium: "Mesatare",
  hard: "E vështirë",
};

export const COGNITIVE_LABEL_AL: Record<CognitiveLevel, string> = {
  Remember: "Kujto",
  Understand: "Kupto",
  Apply: "Apliko",
  Analyze: "Analizo",
  Evaluate: "Vlerëso",
  Create: "Krijo",
};

export type ExamSource =
  | { kind: "text"; text: string }
  | { kind: "pdf"; pdfBase64: string; fileName: string }
  | { kind: "url"; url: string }
  | { kind: "image"; imageBase64: string; fileName: string; mimeType: string };

/** Një pyetje e provimit me vlerësim të vështirësisë dhe pikët përfundimtare. */
export interface ExamQuestion {
  text: string;
  /** Pikët përfundimtare — shuma e grupit është saktësisht `maxScore`. */
  points: number;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  /** Arsyeja arsimore e pikëve (për skemën profesionale të notimit). */
  rationale?: string;
}

/** Një variant provimi (një grup) — i gatshëm për pamje paraprake / Word. */
export interface ExamGroup {
  group: string; // A, B, C...
  title: string;
  questions: ExamQuestion[];
}

/** Pikët maksimale të zgjedhura nga mësuesi (opsionet e UI-së). */
export const MAX_SCORE_OPTIONS = [20, 30, 50, 60, 100] as const;

/** Provimi i gjeneruar (të gjitha grupet + të dhënat e kokës). */
export interface ExamData {
  lenda: string;
  klasa: string;
  tremujori: string;
  exams: ExamGroup[];
  /** Rruga ku u ruajt automatikisht në PC (vetëm te përgjigjja e gjenerimit). */
  savedPath?: string;
}

// ---- Provimet e ruajtura (historiku i mësuesit) ----
export interface SavedTest {
  id: string;
  email: string;
  title: string;
  lenda: string;
  klasa: string;
  tremujori: string;
  numGroups: number;
  numQuestions: number;
  /** Koha e krijimit (ISO string). */
  createdAt: string;
  /** Të dhënat e plota të provimit — për ri-hapje dhe shkarkim Word. */
  data: ExamData;
  /** Rruga e skedarit .docx në disk (vetëm lokalisht). */
  savedPath?: string;
}

/** Variant i lehtë i SavedTest për listimin (pa `data` për ngarkesë më të vogël). */
export type SavedTestSummary = Omit<SavedTest, "data">;

export interface ExamRequest {
  source: ExamSource;
  /** Sa variante të ndryshme provimi (një për secilin grup), 1–30. */
  numGroups: number;
  /** Sa pyetje të ketë secili provim. */
  numQuestions: number;
  /** Pikët maksimale të provimit (shuma e secilit grup). */
  maxScore: number;
  /** Tremujori: "I" | "II" | "III" ose "" (pa tremujor). Shfaqet te koka. */
  tremujori: string;
  /** Lënda (opsionale) — për emrin e skedarit dhe kokën. */
  lenda: string;
  /** Klasa (opsionale) — për emrin e skedarit dhe kokën. */
  klasa: string;
  /** Vetëm për libra me link (flipbook): nga faqja (0 = pa kufi). */
  fromPage: number;
  /** Vetëm për libra me link (flipbook): deri te faqja (0 = pa kufi). */
  toPage: number;
}

// ---- Asistenti i Studimit (i bazuar vetëm te materiali) ----
export type AssistIntent =
  | "explain"
  | "question"
  | "simplify"
  | "summary"
  | "flashcards"
  | "steps";

export interface AssistMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistRequest {
  /** Materiali i ngarkuar (opsional). Nëse mungon, Asistenti punon si chatbot i përgjithshëm. */
  source?: ExamSource;
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
