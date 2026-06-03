import fs from "fs";
import path from "path";
import crypto from "crypto";

// Llogaritë ruhen në users.json; fjalëkalimet ruhen të enkriptuara (scrypt + salt).
const USERS_FILE = path.join(process.cwd(), "users.json");
const SECRET_FILE = path.join(process.cwd(), ".authsecret");

interface StoredUser {
  email: string;
  salt: string;
  hash: string;
}

function loadUsers(): StoredUser[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
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

export function registerUser(emailRaw: string, password: string): AuthResult {
  const email = normEmail(emailRaw);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Email-i nuk është i vlefshëm." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Fjalëkalimi duhet të ketë të paktën 6 shkronja." };
  }
  const users = loadUsers();
  if (users.some((u) => u.email === email)) {
    return { ok: false, error: "Ky email ka tashmë një llogari. Provo të hysh." };
  }
  const salt = crypto.randomBytes(16).toString("hex");
  users.push({ email, salt, hash: hashPassword(password, salt) });
  saveUsers(users);
  return { ok: true, email };
}

export function verifyUser(emailRaw: string, password: string): AuthResult {
  const email = normEmail(emailRaw);
  const user = loadUsers().find((u) => u.email === email);
  if (!user) return { ok: false, error: "Email ose fjalëkalim i gabuar." };
  const h = hashPassword(password, user.salt);
  const a = Buffer.from(h);
  const b = Buffer.from(user.hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: "Email ose fjalëkalim i gabuar." };
  }
  return { ok: true, email };
}

// ---- Token (i nënshkruar, mbijeton rinisjen e serverit) ----
let _secret: string | null = null;
function getSecret(): string {
  if (_secret) return _secret;
  if (process.env.AUTH_SECRET) {
    _secret = process.env.AUTH_SECRET;
    return _secret;
  }
  try {
    _secret = fs.readFileSync(SECRET_FILE, "utf8").trim();
    if (_secret) return _secret;
  } catch {
    /* do ta krijojmë */
  }
  _secret = crypto.randomBytes(32).toString("hex");
  try {
    fs.writeFileSync(SECRET_FILE, _secret);
  } catch {
    /* injoro */
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
