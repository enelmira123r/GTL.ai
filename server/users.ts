import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import type { Role } from "../shared/types";
import { sendEmail } from "./email";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const USERS_FILE = path.join(process.cwd(), "users.json");
const SECRET_FILE = path.join(process.cwd(), ".authsecret");
const MAX_AGE_DAYS = 60;

interface StoredUser {
  email: string;
  salt: string;
  hash: string;
  role: Role;
  name?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

function loadFile(): StoredUser[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}
function saveFile(users: StoredUser[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function getUser(email: string): Promise<StoredUser | null> {
  if (redis) return (await redis.get<StoredUser>(`user:${email}`)) ?? null;
  return loadFile().find((u) => u.email === email) ?? null;
}
async function putUser(user: StoredUser): Promise<void> {
  if (redis) {
    await redis.set(`user:${user.email}`, user);
    return;
  }
  const users = loadFile();
  const i = users.findIndex((u) => u.email === user.email);
  if (i >= 0) users[i] = user;
  else users.push(user);
  saveFile(users);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Kornizat e reset-it dhe verifikimit ruhen në kujtesë (zhvillim).
// Në prodhim (Vercel) zëvendëso me Redis për qëndrueshmëri ndër instanca.
const pwResets = new Map<string, { token: string; expires: number }>();
const emailCodes = new Map<string, { code: string; expires: number }>();

export type AuthResult =
  | { ok: true; email: string; role: Role }
  | { ok: false; error: string };

export async function registerUser(
  emailRaw: string,
  password: string,
  roleRaw: string,
): Promise<AuthResult> {
  const email = normEmail(emailRaw);
  const role: Role = roleRaw === "student" ? "student" : "teacher";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Email-i nuk është i vlefshëm." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Fjalëkalimi duhet të ketë të paktën 6 shkronja." };
  }
  if (await getUser(email)) {
    return { ok: false, error: "Ky email ka tashmë një llogari. Provo të hysh." };
  }
  const salt = crypto.randomBytes(16).toString("hex");
  await putUser({
    email,
    salt,
    hash: hashPassword(password, salt),
    role,
    emailVerified: false,
    createdAt: new Date().toISOString(),
  });
  const code = await generateEmailCode(email);
  await sendEmail({
    to: email,
    subject: "Verifiko email-in – GTL.ai",
    text: `Kodi i verifikimit: ${code}`,
  });
  return { ok: true, email, role };
}

export async function verifyUser(emailRaw: string, password: string): Promise<AuthResult> {
  const email = normEmail(emailRaw);
  const user = await getUser(email);
  if (!user) return { ok: false, error: "Email ose fjalëkalim i gabuar." };
  const a = Buffer.from(hashPassword(password, user.salt));
  const b = Buffer.from(user.hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Email ose fjalëkalim i gabuar." };
  }
  return { ok: true, email, role: user.role || "teacher" };
}

export async function changePassword(
  email: string,
  current: string,
  next: string,
): Promise<AuthResult> {
  const user = await getUser(email);
  if (!user) return { ok: false, error: "Llogaria nuk u gjet." };
  if (hashPassword(current, user.salt) !== user.hash) {
    return { ok: false, error: "Fjalëkalimi aktual është i gabuar." };
  }
  if (next.length < 6) {
    return { ok: false, error: "Fjalëkalimi i ri duhet të ketë të paktën 6 shkronja." };
  }
  user.hash = hashPassword(next, user.salt);
  await putUser(user);
  return { ok: true, email, role: user.role || "teacher" };
}

export async function requestPasswordReset(
  emailRaw: string,
): Promise<{ ok: true; devToken?: string } | { ok: false; error: string }> {
  const email = normEmail(emailRaw);
  const user = await getUser(email);
  if (!user) return { ok: false, error: "Nuk u gjet llogari me këtë email." };
  const token = crypto.randomBytes(24).toString("hex");
  pwResets.set(email, { token, expires: Date.now() + 3_600_000 });
  const link = `${process.env.APP_URL ?? "http://localhost:5173"}/reset?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Rikthim fjalëkalimi – GTL.ai",
    text: `Lidhja për rikthim: ${link}\nKodi: ${token}`,
  });
  return { ok: true, devToken: token };
}

export async function resetPassword(
  token: string,
  next: string,
): Promise<AuthResult> {
  if (!token) return { ok: false, error: "Token i pavlefshëm." };
  const found = [...pwResets.entries()].find(
    ([, v]) => v.token === token && v.expires > Date.now(),
  );
  if (!found) return { ok: false, error: "Token-i ka skaduar ose është i pavlefshëm." };
  const [email] = found;
  const user = await getUser(email);
  if (!user) return { ok: false, error: "Llogaria nuk u gjet." };
  if (next.length < 6) {
    return { ok: false, error: "Fjalëkalimi duhet të ketë të paktën 6 shkronja." };
  }
  user.hash = hashPassword(next, user.salt);
  await putUser(user);
  pwResets.delete(email);
  return { ok: true, email, role: user.role || "teacher" };
}

export async function generateEmailCode(email: string): Promise<string> {
  const code = String(crypto.randomInt(100000, 999999));
  emailCodes.set(email, { code, expires: Date.now() + 86_400_000 });
  return code;
}

export async function verifyEmail(
  emailRaw: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normEmail(emailRaw);
  const rec = emailCodes.get(email);
  const user = await getUser(email);
  if (!user) return { ok: false, error: "Llogaria nuk u gjet." };
  if (!rec || rec.expires < Date.now() || rec.code !== String(code).trim()) {
    return { ok: false, error: "Kodi është i gabuar ose ka skaduar." };
  }
  user.emailVerified = true;
  await putUser(user);
  emailCodes.delete(email);
  return { ok: true };
}

export async function resendEmailCode(
  emailRaw: string,
): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  const email = normEmail(emailRaw);
  if (!(await getUser(email))) return { ok: false, error: "Llogaria nuk u gjet." };
  const code = await generateEmailCode(email);
  await sendEmail({
    to: email,
    subject: "Kodi i verifikimit – GTL.ai",
    text: `Kodi i verifikimit: ${code}`,
  });
  return { ok: true, devCode: code };
}

// ---- Token (i nënshkruar, me rol dhe skadim) ----
let _secret: string | null = null;
function getSecret(): string {
  if (_secret) return _secret;
  if (process.env.AUTH_SECRET) {
    _secret = process.env.AUTH_SECRET;
    return _secret;
  }
  try {
    const s = fs.readFileSync(SECRET_FILE, "utf8").trim();
    if (s) {
      _secret = s;
      return _secret;
    }
  } catch {
    /* do ta krijojmë */
  }
  _secret = crypto.randomBytes(32).toString("hex");
  try {
    fs.writeFileSync(SECRET_FILE, _secret);
  } catch {
    /* fs vetëm-lexim (p.sh. Vercel) — përdor sekretin në memorie; vendos AUTH_SECRET */
  }
  return _secret;
}

export function makeToken(email: string, role: Role): string {
  const payload = Buffer.from(
    JSON.stringify({ e: normEmail(email), r: role, i: Date.now() }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export interface TokenUser {
  email: string;
  role: Role;
}

export function tokenUser(token: string | undefined): TokenUser | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expect = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (obj && typeof obj.e === "string") {
      if (Date.now() - (Number(obj.i) || 0) > MAX_AGE_DAYS * 86_400_000) return null;
      return { email: obj.e, role: obj.r === "student" ? "student" : "teacher" };
    }
  } catch {
    /* format i vjetër */
  }
  try {
    const email = Buffer.from(payload, "base64url").toString();
    if (email.includes("@")) return { email, role: "teacher" };
  } catch {
    /* injoro */
  }
  return null;
}

export function tokenEmail(token: string | undefined): string | null {
  return tokenUser(token)?.email ?? null;
}
