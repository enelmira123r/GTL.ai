import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import type {
  SavedTest,
  Lesson,
  Quiz,
  Flashcard,
  Practice,
  Activity,
  DailyGoal,
  Achievement,
  ProgressReport,
  SubjectProgress,
} from "../shared/types";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const DATA_DIR = process.env.STORE_DIR
  ? path.resolve(process.env.STORE_DIR)
  : path.join(process.cwd(), "data");

function safeKey(key: string): string {
  return key.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120);
}

async function readCollection<T>(key: string): Promise<T[]> {
  if (redis) {
    const v = await redis.get<T[]>(key);
    return Array.isArray(v) ? v : [];
  }
  try {
    return JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, `${safeKey(key)}.json`), "utf8"),
    ) as T[];
  } catch {
    return [];
  }
}

async function writeCollection<T>(key: string, items: T[]): Promise<void> {
  if (redis) {
    await redis.set(key, items);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, `${safeKey(key)}.json`),
    JSON.stringify(items, null, 2),
  );
}

export function newId(): string {
  return crypto.randomUUID();
}

const testsKey = (email: string) => `tests:${email.toLowerCase()}`;

export async function listTests(email: string): Promise<SavedTest[]> {
  const all = await readCollection<SavedTest>(testsKey(email));
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getTest(email: string, id: string): Promise<SavedTest | null> {
  const all = await readCollection<SavedTest>(testsKey(email));
  return all.find((t) => t.id === id) ?? null;
}

export async function saveTest(test: SavedTest): Promise<void> {
  const key = testsKey(test.email);
  const all = await readCollection<SavedTest>(key);
  const i = all.findIndex((t) => t.id === test.id);
  if (i >= 0) all[i] = test;
  else all.push(test);
  await writeCollection(key, all);
}

export async function deleteTest(email: string, id: string): Promise<void> {
  const key = testsKey(email);
  const all = await readCollection<SavedTest>(key);
  await writeCollection(key, all.filter((t) => t.id !== id));
}

// ---- Mësimet e nxënësit ----

const lessonsKey = (email: string) => `lessons:${email.toLowerCase()}`;

export async function listLessons(email: string): Promise<Lesson[]> {
  const all = await readCollection<Lesson>(lessonsKey(email));
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getLesson(email: string, id: string): Promise<Lesson | null> {
  const all = await readCollection<Lesson>(lessonsKey(email));
  return all.find((l) => l.id === id) ?? null;
}

export async function saveLesson(lesson: Lesson): Promise<void> {
  const key = lessonsKey(lesson.email);
  const all = await readCollection<Lesson>(key);
  const i = all.findIndex((l) => l.id === lesson.id);
  if (i >= 0) all[i] = lesson;
  else all.push(lesson);
  await writeCollection(key, all);
}

const quizzesKey = (email: string) => `quizzes:${email.toLowerCase()}`;

export async function listQuizzes(email: string): Promise<Quiz[]> {
  const all = await readCollection<Quiz>(quizzesKey(email));
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getQuiz(email: string, id: string): Promise<Quiz | null> {
  const all = await readCollection<Quiz>(quizzesKey(email));
  return all.find((q) => q.id === id) ?? null;
}

export async function saveQuiz(quiz: Quiz): Promise<void> {
  const key = quizzesKey(quiz.email);
  const all = await readCollection<Quiz>(key);
  const i = all.findIndex((q) => q.id === quiz.id);
  if (i >= 0) all[i] = quiz;
  else all.push(quiz);
  await writeCollection(key, all);
}

const flashcardsKey = (email: string) => `flashcards:${email.toLowerCase()}`;

export async function listFlashcards(email: string): Promise<Flashcard[]> {
  const all = await readCollection<Flashcard>(flashcardsKey(email));
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getFlashcards(email: string, id: string): Promise<Flashcard | null> {
  const all = await readCollection<Flashcard>(flashcardsKey(email));
  return all.find((f) => f.id === id) ?? null;
}

export async function saveFlashcards(flashcard: Flashcard): Promise<void> {
  const key = flashcardsKey(flashcard.email);
  const all = await readCollection<Flashcard>(key);
  const i = all.findIndex((f) => f.id === flashcard.id);
  if (i >= 0) all[i] = flashcard;
  else all.push(flashcard);
  await writeCollection(key, all);
}

const practicesKey = (email: string) => `practices:${email.toLowerCase()}`;

export async function listPractices(email: string): Promise<Practice[]> {
  const all = await readCollection<Practice>(practicesKey(email));
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getPractice(email: string, id: string): Promise<Practice | null> {
  const all = await readCollection<Practice>(practicesKey(email));
  return all.find((p) => p.id === id) ?? null;
}

export async function savePractice(practice: Practice): Promise<void> {
  const key = practicesKey(practice.email);
  const all = await readCollection<Practice>(key);
  const i = all.findIndex((p) => p.id === practice.id);
  if (i >= 0) all[i] = practice;
  else all.push(practice);
  await writeCollection(key, all);
}

const activitiesKey = (email: string) => `activities:${email.toLowerCase()}`;

export async function listActivities(email: string, limit = 20): Promise<Activity[]> {
  const all = await readCollection<Activity>(activitiesKey(email));
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}

export async function saveActivity(activity: Activity): Promise<void> {
  const key = activitiesKey(activity.email);
  const all = await readCollection<Activity>(key);
  const i = all.findIndex((a) => a.id === activity.id);
  if (i >= 0) all[i] = activity;
  else all.push(activity);
  if (all.length > 200) all.splice(0, all.length - 200);
  await writeCollection(key, all);
}

const progressKey = (email: string) => `progress:${email.toLowerCase()}`;

export async function getActivityProgress(email: string): Promise<Record<string, SubjectProgress>> {
  try {
    const all = await readCollection<SubjectProgress>(progressKey(email));
    const map: Record<string, SubjectProgress> = {};
    for (const p of all) {
      map[p.subject] = p;
    }
    return map;
  } catch {
    return {};
  }
}

export async function saveActivityProgress(
  email: string,
  subject: string,
  type: Activity["type"],
  score?: number,
  total?: number,
): Promise<void> {
  const key = progressKey(email);
  const all = await readCollection<SubjectProgress>(key);
  const i = all.findIndex((p) => p.subject === subject);
  const now = new Date().toISOString();
  if (i >= 0) {
    all[i].totalActivities += 1;
    if (type === "quiz_submit" && typeof score === "number" && typeof total === "number") {
      all[i].quizzesTaken += 1;
      all[i].totalScore += score;
      all[i].totalPossible += total;
      if (score === total) all[i].perfectQuizzes += 1;
    } else if (type === "practice") {
      all[i].practices += 1;
    } else if (type === "flashcards") {
      all[i].flashcardsReviewed += 1;
    }
    all[i].lastActiveAt = now;
    all[i].streakDays = calcStreak(all[i].lastStreakDate, now);
    all[i].lastStreakDate = now.split("T")[0];
  } else {
    const progress: SubjectProgress = {
      subject,
      totalActivities: 1,
      quizzesTaken: type === "quiz_submit" ? 1 : 0,
      totalScore: type === "quiz_submit" ? score || 0 : 0,
      totalPossible: type === "quiz_submit" ? total || 0 : 0,
      perfectQuizzes: type === "quiz_submit" && score === total ? 1 : 0,
      practices: type === "practice" ? 1 : 0,
      flashcardsReviewed: type === "flashcards" ? 1 : 0,
      lastActiveAt: now,
      streakDays: 1,
      lastStreakDate: now.split("T")[0],
    };
    all.push(progress);
  }
  await writeCollection(key, all);
}

function calcStreak(lastDateStr: string | undefined, nowStr: string): number {
  if (!lastDateStr) return 1;
  const last = new Date(lastDateStr);
  const now = new Date(nowStr);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 1 ? 1 : 1;
}

export async function getProgressReport(email: string): Promise<ProgressReport> {
  const progress = await getActivityProgress(email);
  const activities = await listActivities(email, 50);
  const subjects = Object.keys(progress).sort();
  const totalActivities = activities.length;
  const totalQuizzes = activities.filter((a) => a.type === "quiz" || a.type === "quiz_submit").length;
  const perfectQuizzes = activities.filter((a) => a.type === "quiz_submit" && a.score === a.total).length;
  const currentStreak = Math.max(...Object.values(progress).map((p) => p.streakDays), 0);
  const totalScore = activities.reduce((s, a) => s + (a.score || 0), 0);
  const totalPossible = activities.reduce((s, a) => s + (a.total || 0), 0);
  const accuracy = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
  return {
    subjects,
    totalActivities,
    totalQuizzes,
    perfectQuizzes,
    currentStreak,
    totalScore,
    totalPossible,
    accuracy,
    bySubject: progress,
    recentActivities: activities.slice(0, 10),
  };
}

const goalsKey = (email: string) => `goals:${email.toLowerCase()}`;

export async function listGoals(email: string): Promise<DailyGoal[]> {
  const all = await readCollection<DailyGoal>(goalsKey(email));
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 7);
}

export async function saveGoal(goal: DailyGoal): Promise<void> {
  const key = goalsKey(goal.email);
  const all = await readCollection<DailyGoal>(key);
  const i = all.findIndex((g) => g.id === goal.id);
  if (i >= 0) all[i] = goal;
  else all.unshift(goal);
  if (all.length > 30) all.length = 30;
  await writeCollection(key, all);
}

const achievementsKey = (email: string) => `achievements:${email.toLowerCase()}`;

export async function getAchievements(email: string): Promise<Achievement[]> {
  const all = await readCollection<Achievement>(achievementsKey(email));
  const now = new Date();
  const checked: Achievement[] = [];
  const progress = await getActivityProgress(email);
  const activities = await listActivities(email, 200);
  const totalScore = activities.reduce((s, a) => s + (a.score || 0), 0);
  const totalPossible = activities.reduce((s, a) => s + (a.total || 0), 0);
  const totalQuizzes = activities.filter((a) => a.type === "quiz" || a.type === "quiz_submit").length;
  const perfectQuizzes = activities.filter((a) => a.type === "quiz_submit" && a.score === a.total).length;
  const currentStreak = Math.max(...Object.values(progress).map((p) => p.streakDays), 0);

  const candidates: Omit<Achievement, "unlockedAt">[] = [
    { id: "first_lesson", name: "Mësimi i parë", description: "Krijo mësimin tënd të parë.", icon: "📖", unlocked: activities.some((a) => a.type === "lesson") },
    { id: "first_quiz", name: "Kuizi i parë", description: "Zgjidh kuizin tënd të parë.", icon: "📝", unlocked: totalQuizzes >= 1 },
    { id: "quiz_master", name: "Mjeshtër kuizesh", description: "Zgjidh 10 kuize.", icon: "🏆", unlocked: totalQuizzes >= 10 },
    { id: "perfect_score", name: "Notë e përkryer", description: "Merr notën maksimale në një kuiz.", icon: "💯", unlocked: perfectQuizzes >= 1 },
    { id: "streak_3", name: "Seria 3 ditë", description: "Studio për 3 ditë me radhë.", icon: "🔥", unlocked: currentStreak >= 3 },
    { id: "streak_7", name: "Seria 7 ditë", description: "Studio për 7 ditë me radhë.", icon: "⭐", unlocked: currentStreak >= 7 },
    { id: "flashcards_pro", name: "Fleta studimi", description: "Krijo fletë studimi për herë të parë.", icon: "🗂️", unlocked: activities.some((a) => a.type === "flashcards") },
    { id: "practice_pro", name: "Ushtrime", description: "Përfundo ushtrimin tënd të parë.", icon: "✏️", unlocked: activities.some((a) => a.type === "practice") },
    { id: "points_100", name: "100 pikë", description: "Aksumuaj 100 pikë gjithsej.", icon: "🌟", unlocked: totalScore >= 100 },
    { id: "points_500", name: "500 pikë", description: "Aksumuaj 500 pikë gjithsej.", icon: "🌈", unlocked: totalScore >= 500 },
  ];

  for (const c of candidates) {
    const existing = all.find((a) => a.id === c.id);
    if (existing) {
      checked.push(existing);
    } else if (c.unlocked) {
      const unlocked: Achievement = {
        ...c,
        unlockedAt: now.toISOString(),
      };
      checked.push(unlocked);
      await saveAchievement(unlocked);
    }
  }
  return checked;
}

export async function saveAchievement(achievement: Achievement): Promise<void> {
  const key = achievementsKey(achievement.email);
  const all = await readCollection<Achievement>(key);
  const i = all.findIndex((a) => a.id === achievement.id);
  if (i >= 0) all[i] = achievement;
  else all.push(achievement);
  await writeCollection(key, all);
}
