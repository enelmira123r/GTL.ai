import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Redis } from "@upstash/redis";

// Ruajtja e llogarive:
//  - Në Vercel (serverless) skedarët nuk ruhen → përdor Upstash Redis (falas).
//  - Lokalisht (pa Redis) → përdor skedarin users.json.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const USERS_FILE = path.join(process.cwd(), "users.json");
const SECRET_FILE = path.join(process.cwd(), ".authsecret");

interface StoredUser {
  email: string;
  salt: string;
  hash: string;
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
  users.push(user);
  saveFile(users);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type AuthResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export async function registerUser(emailRaw: string, password: string): Promise<AuthResult> {
  const email = normEmail(emailRaw);
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
  await putUser({ email, salt, hash: hashPassword(password, salt) });
  return { ok: true, email };
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
  return { ok: true, email };
}

// ---- Token (i nënshkruar) ----
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

export function makeToken(email: string): string {
  const payload = Buffer.from(normEmail(email)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function tokenEmail(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expect = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return Buffer.from(payload, "base64url").toString();
}
