import type {
  ExamRequest,
  ExamData,
  AssistRequest,
  AssistResult,
  SavedTestSummary,
  SavedTest,
} from "../shared/types";

export interface AuthResult {
  token: string;
  email: string;
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

/** Krijon një llogari të re (email + fjalëkalim). */
export const register = (email: string, password: string) =>
  postJson<AuthResult>("/api/register", { email, password }, "Nuk u krijua dot llogaria.");

/** Hyn me një llogari ekzistuese. */
export const login = (email: string, password: string) =>
  postJson<AuthResult>("/api/login", { email, password }, "Hyrja dështoi.");

/** Gjeneron provimin (AI) dhe e kthen për pamje paraprake. Token-i (nëse ka) e atribuon ruajtjen. */
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

/** Ndërton emrin e skedarit nga lënda + klasa + tremujori. */
function examFileName(data: ExamData): string {
  const parts: string[] = [];
  if (data.lenda?.trim()) parts.push(data.lenda.trim());
  if (data.klasa?.trim()) parts.push("Klasa " + data.klasa.trim());
  if (data.tremujori?.trim()) parts.push("Tremujori " + data.tremujori.trim());
  const name = (parts.join(" - ") || "Provim").replace(/[\\/:*?"<>|]+/g, "").trim();
  return name + ".docx";
}

/** Asistenti i Studimit — pyetje e bazuar vetëm te materiali i ngarkuar. */
export async function assist(req: AssistRequest): Promise<AssistResult> {
  return postJson<AssistResult>("/api/assist", req, "Asistenti nuk u përgjigj.");
}

/** Liston provimet e ruajtura të mësuesit (historiku). Kërkon token. */
export async function listTests(token: string): Promise<SavedTestSummary[]> {
  const res = await fetch("/api/tests", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let msg = "Nuk u morën dot provimet e ruajtura.";
    try {
      const e = await res.json();
      if (e?.error) msg = e.error;
    } catch {
      /* injoro */
    }
    throw new Error(msg);
  }
  return (await res.json()) as SavedTestSummary[];
}

/** Merr një provim të ruajtur sipas id (me të dhënat e plota). Kërkon token. */
export async function getTest(id: string, token: string): Promise<SavedTest> {
  const res = await fetch(`/api/tests/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let msg = "Provimi nuk u gjet.";
    try {
      const e = await res.json();
      if (e?.error) msg = e.error;
    } catch {
      /* injoro */
    }
    throw new Error(msg);
  }
  return (await res.json()) as SavedTest;
}

/** Fshin një provim të ruajtur sipas id. Kërkon token. */
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

/** Shkarkon provimin si Word (.docx) nga të dhënat e gjeneruara. Kërkon token (login). */
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
