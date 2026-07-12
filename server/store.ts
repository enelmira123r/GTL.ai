import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import type { SavedTest } from "../shared/types";

// Ruajtja e të dhënave të strukturuara (provime të ruajtura, etj.):
//  - Vercel (serverless, pa disk): Upstash Redis.
//  - Lokalisht: skedare JSON te dosja data/ (konfigurueshme me STORE_DIR).
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

/** Koleksion i thjeshtë i objekteve me `id`, i ruajtur si listë JSON. */
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

// ---- Provimet e ruajtura ----
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
  await writeCollection(
    key,
    all.filter((t) => t.id !== id),
  );
}
