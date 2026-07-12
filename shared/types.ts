// Tipa të përbashkët mes frontend-it dhe serverit.

export type Role = "teacher" | "student";

export type QuestionType = "multiple_choice" | "true_false" | "open";

export interface Question {
  id: number;
  type: QuestionType;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  keyPoints: string[];
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
  score: number;
  feedback: string;
}

export interface GradeResult {
  results: GradeItem[];
}

// ---- Provimi Word (.docx) ----

export type Difficulty = "easy" | "medium" | "hard";

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

export interface ExamQuestion {
  text: string;
  points: number;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  rationale?: string;
}

export interface ExamGroup {
  group: string;
  title: string;
  questions: ExamQuestion[];
}

export const MAX_SCORE_OPTIONS = [20, 30, 50, 60, 100] as const;

export interface ExamData {
  lenda: string;
  klasa: string;
  tremujori: string;
  exams: ExamGroup[];
  savedPath?: string;
}

export interface SavedTest {
  id: string;
  email: string;
  title: string;
  lenda: string;
  klasa: string;
  tremujori: string;
  numGroups: number;
  numQuestions: number;
  createdAt: string;
  data: ExamData;
  savedPath?: string;
}

export type SavedTestSummary = Omit<SavedTest, "data">;

export interface ExamRequest {
  source: ExamSource;
  numGroups: number;
  numQuestions: number;
  maxScore: number;
  tremujori: string;
  lenda: string;
  klasa: string;
  fromPage: number;
  toPage: number;
}

// ---- Asistenti i Studimit ----
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

// ---- Virtual Teachers ----
export interface VirtualTeacher {
  id: string;
  name: string;
  subject: string;
  emoji: string;
  personality: string;
  style: string;
}

export interface LessonResult {
  title: string;
  summary: string;
  keyPoints: string[];
  terms: { term: string; definition: string }[];
  examples: string[];
  practiceExercise: { question: string; hint: string; answer: string }[];
  quickQuiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface QuizResult {
  title: string;
  questions: {
    id: number;
    type: "multiple_choice" | "true_false";
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface QuizGradeResult {
  score: number;
  total: number;
  results: {
    questionId: number;
    correct: boolean;
    feedback: string;
    correctAnswer: string;
  }[];
  summary: string;
}

export interface FlashcardResult {
  topic: string;
  cards: { front: string; back: string }[];
}

export interface PracticeResult {
  title: string;
  problems: {
    id: number;
    question: string;
    hint: string;
    solution: string;
    difficulty: "easy" | "medium" | "hard";
  }[];
}

// ---- Student Progress ----
export type ActivityType =
  | "lesson"
  | "quiz"
  | "quiz_submit"
  | "flashcards"
  | "practice"
  | "achievement";

export interface Activity {
  id: string;
  email: string;
  type: ActivityType;
  subject: string;
  topic: string;
  createdAt: string;
  score?: number;
  total?: number;
}

export interface SubjectProgress {
  subject: string;
  totalActivities: number;
  quizzesTaken: number;
  totalScore: number;
  totalPossible: number;
  perfectQuizzes: number;
  practices: number;
  flashcardsReviewed: number;
  lastActiveAt: string;
  streakDays: number;
  lastStreakDate: string;
}

export interface ProgressReport {
  subjects: string[];
  totalActivities: number;
  totalQuizzes: number;
  perfectQuizzes: number;
  currentStreak: number;
  totalScore: number;
  totalPossible: number;
  accuracy: number;
  bySubject: Record<string, SubjectProgress>;
  recentActivities: Activity[];
}

export interface DailyGoal {
  id: string;
  email: string;
  dailyTarget: number;
  completedToday: number;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

// ---- Saved Student Content ----
export interface Lesson {
  id: string;
  email: string;
  subject: string;
  topic: string;
  teacherId: string;
  data: LessonResult;
  createdAt: string;
}

export interface Quiz {
  id: string;
  email: string;
  subject: string;
  topic: string;
  teacherId: string;
  data: QuizResult;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  email: string;
  subject: string;
  topic: string;
  teacherId: string;
  data: FlashcardResult;
  createdAt: string;
}

export interface Practice {
  id: string;
  email: string;
  subject: string;
  topic: string;
  teacherId: string;
  data: PracticeResult;
  createdAt: string;
}
