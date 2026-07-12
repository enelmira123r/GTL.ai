import type {
  ExamRequest,
  ExamData,
  AssistRequest,
  AssistResult,
  SavedTestSummary,
  SavedTest,
  LessonResult,
  QuizResult,
  QuizGradeResult,
  FlashcardResult,
  PracticeResult,
  ProgressReport,
  Activity,
  DailyGoal,
  Achievement,
  VirtualTeacher,
} from "../shared/types";

export interface AuthResult {
  token: string;
  email: string;
  role: "teacher" | "student";
}

async function postJson<T>(url: string, body: unknown, fallbackErr: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = fallbackErr;
    try {
      const e = await res.json();
      if (e?.error) msg = e.error;
    } catch {
      /* injoro */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

async function getJson<T>(url: string, token?: string | null, fallbackErr = "Kërkesa dështoi."): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    let msg = fallbackErr;
    try {
      const e = await res.json();
      if (e?.error) msg = e.error;
    } catch {
      /* injoro */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const register = (email: string, password: string, role: string) =>
  postJson<AuthResult>("/api/register", { email, password, role }, "Nuk u krijua dot llogaria.");

export const login = (email: string, password: string) =>
  postJson<AuthResult>("/api/login", { email, password }, "Hyrja dështoi.");

export const changePassword = (current: string, next: string) =>
  postJson<{ ok: true }>(
    "/api/change-password",
    { current, next },
    "Ndryshimi i fjalëkalimit dështoi.",
  );

export const forgotPassword = (email: string) =>
  postJson<{ ok: true; devToken?: string }>(
    "/api/forgot-password",
    { email },
    "Kërkesa dështoi.",
  );

export const resetPassword = (token: string, password: string) =>
  postJson<{ ok: true }>(
    "/api/reset-password",
    { token, password },
    "Rivendosja dështoi.",
  );

export const verifyEmailApi = (email: string, code: string) =>
  postJson<{ ok: true }>("/api/verify-email", { email, code }, "Verifikimi dështoi.");

export const resendVerification = (email: string) =>
  postJson<{ ok: true; devCode?: string }>(
    "/api/resend-verification",
    { email },
    "Ri-dërgimi dështoi.",
  );

export async function generateExam(req: ExamRequest, token?: string | null): Promise<ExamData> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch("/api/exam-generate", {
    method: "POST",
    headers,
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let msg = "Gabim gjatë gjenerimit të provimit.";
    try {
      const e = await res.json();
      if (e?.error) msg = e.error;
    } catch {
      /* injoro */
    }
    throw new Error(msg);
  }
  return (await res.json()) as ExamData;
}

function examFileName(data: ExamData): string {
  const parts: string[] = [];
  if (data.lenda?.trim()) parts.push(data.lenda.trim());
  if (data.klasa?.trim()) parts.push("Klasa " + data.klasa.trim());
  if (data.tremujori?.trim()) parts.push("Tremujori " + data.tremujori.trim());
  const name = (parts.join(" - ") || "Provim").replace(/[\\/:*?"<>|]+/g, "").trim();
  return name + ".docx";
}

export async function assist(req: AssistRequest): Promise<AssistResult> {
  return postJson<AssistResult>("/api/assist", req, "Asistenti nuk u përgjigj.");
}

export async function listTests(token: string): Promise<SavedTestSummary[]> {
  return getJson<SavedTestSummary[]>("/api/tests", token, "Nuk u morën dot provimet.");
}

export async function getTest(id: string, token: string): Promise<SavedTest> {
  return getJson<SavedTest>(`/api/tests/${encodeURIComponent(id)}`, token, "Provimi nuk u gjet.");
}

export async function deleteTest(id: string, token: string): Promise<void> {
  const res = await fetch(`/api/tests/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let msg = "Fshirja dështoi.";
    try {
      const e = await res.json();
      if (e?.error) msg = e.error;
    } catch {
      /* injoro */
    }
    throw new Error(msg);
  }
}

export async function downloadExamDocx(data: ExamData, token: string): Promise<void> {
  const res = await fetch("/api/exam-docx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let msg = "Gabim gjatë krijimit të skedarit.";
    try {
      const e = await res.json();
      if (e?.error) msg = e.error;
    } catch {
      /* injoro */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = examFileName(data);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- API të rejat për nxënësit ----

export async function getVirtualTeachers(): Promise<{ teachers: VirtualTeacher[] }> {
  return getJson<{ teachers: VirtualTeacher[] }>("/api/student/teachers", null, "Nuk u morën dot mësuesit.");
}

export async function generateStudentLesson(
  topic: string,
  subject: string,
  teacherId: string,
  difficulty?: string,
): Promise<LessonResult & { teacherId: string; teacherName: string; subject: string }> {
  return postJson<LessonResult & { teacherId: string; teacherName: string; subject: string }>(
    "/api/student/lesson",
    { topic, subject, teacherId, difficulty },
    "Nuk u krijua dot mësimi.",
  );
}

export async function generateStudentQuiz(
  topic: string,
  subject: string,
  teacherId: string,
  numQuestions?: number,
): Promise<QuizResult & { teacherId: string; teacherName: string; subject: string }> {
  return postJson<QuizResult & { teacherId: string; teacherName: string; subject: string }>(
    "/api/student/quiz",
    { topic, subject, teacherId, numQuestions },
    "Nuk u krijua dot kuizi.",
  );
}

export async function gradeStudentQuiz(
  answers: number[],
  questions: QuizResult["questions"],
  topic: string,
  subject: string,
): Promise<QuizGradeResult> {
  return postJson<QuizGradeResult>(
    "/api/student/quiz/grade",
    { answers, questions, topic, subject },
    "Nuk u vlerësua dot kuizi.",
  );
}

export async function generateStudentFlashcards(
  topic: string,
  subject: string,
  teacherId: string,
): Promise<FlashcardResult & { teacherId: string; teacherName: string; subject: string }> {
  return postJson<FlashcardResult & { teacherId: string; teacherName: string; subject: string }>(
    "/api/student/flashcards",
    { topic, subject, teacherId },
    "Nuk u krijuan dot fletët.",
  );
}

export async function generateStudentPractice(
  topic: string,
  subject: string,
  teacherId: string,
): Promise<PracticeResult & { teacherId: string; teacherName: string; subject: string }> {
  return postJson<PracticeResult & { teacherId: string; teacherName: string; subject: string }>(
    "/api/student/practice",
    { topic, subject, teacherId },
    "Nuk u krijuan dot ushtrimet.",
  );
}

export async function getStudentProgress(token: string): Promise<ProgressReport> {
  return getJson<ProgressReport>("/api/student/progress", token, "Nuk u morën dot të dhënat e përparimit.");
}

export async function getStudentHistory(token: string, limit = 20): Promise<{ activities: Activity[] }> {
  return getJson<{ activities: Activity[] }>(
    `/api/student/history?limit=${encodeURIComponent(String(limit))}`,
    token,
    "Nuk u morën dot aktivitetet.",
  );
}

export async function getStudentGoals(token: string): Promise<{ goals: DailyGoal[] }> {
  return getJson<{ goals: DailyGoal[] }>("/api/student/goals", token, "Nuk u morën dot qëllimet.");
}

export async function saveStudentGoal(_token: string, dailyTarget: number, completedToday: number): Promise<DailyGoal> {
  return postJson<DailyGoal>("/api/student/goals", { dailyTarget, completedToday }, "Nuk u ruajt dot qëllimi.");
}

export async function getStudentAchievements(token: string): Promise<{ achievements: Achievement[] }> {
  return getJson<{ achievements: Achievement[] }>("/api/student/achievements", token, "Nuk u morën dot arritjet.");
}
