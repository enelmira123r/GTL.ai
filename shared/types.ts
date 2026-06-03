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

export type Difficulty = "lehte" | "mesatar" | "veshtire";

export interface GenerateRequestText {
  kind: "text";
  text: string;
  difficulty: Difficulty;
  numQuestions: number;
}

export interface GenerateRequestPdf {
  kind: "pdf";
  pdfBase64: string;
  fileName: string;
  difficulty: Difficulty;
  numQuestions: number;
}

export interface GenerateRequestUrl {
  kind: "url";
  url: string;
  difficulty: Difficulty;
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
export type ExamSource =
  | { kind: "text"; text: string }
  | { kind: "pdf"; pdfBase64: string; fileName: string }
  | { kind: "url"; url: string };

/** Një variant provimi (një grup) — i gatshëm për pamje paraprake / Word. */
export interface ExamGroup {
  group: string; // A, B, C...
  title: string;
  questions: { text: string; points: number }[];
}

/** Provimi i gjeneruar (të gjitha grupet + të dhënat e kokës). */
export interface ExamData {
  lenda: string;
  klasa: string;
  tremujori: string;
  exams: ExamGroup[];
  /** Rruga ku u ruajt automatikisht në PC (vetëm te përgjigjja e gjenerimit). */
  savedPath?: string;
}

export interface ExamRequest {
  source: ExamSource;
  /** Sa variante të ndryshme provimi (një për secilin grup), 1–6. */
  numGroups: number;
  /** Sa pyetje të ketë secili provim. */
  numQuestions: number;
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
