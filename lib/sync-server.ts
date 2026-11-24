// Sync links on the server: stores a library under a hash of its secret and merges what each device sends.
import crypto from 'crypto';
import { db } from './supabase-server';
import { GameError } from './game';
import { mergeLibraries, validSyncSecret, type Library, type Tombstone } from './sync';
import type { Quiz } from './types';

const MAX_QUIZZES = 500;
const MAX_BYTES = 4 * 1024 * 1024;
const keyOf = (secret: string) => crypto.createHash('sha256').update(`buzzline:sync:${secret}`).digest('hex');
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

// Per-instance limit so one visitor can't hammer the table. Reset every hour.
const hits = new Map<string, { n: number; since: number }>();
function rateLimit(key: string) {
  const now = Date.now(), h = hits.get(key);
  if (!h || now - h.since > 3600e3) { hits.set(key, { n: 1, since: now }); return; }
  if (++h.n > 1200) throw new GameError('Syncing too often — try again in a while', 429);
}

/** Keeps only quiz-shaped objects with an id, and only the fields the studio uses. Drafts may be unfinished. */
function cleanLibrary(input: unknown): Library {
  const b = (input ?? {}) as { quizzes?: unknown; deleted?: unknown };
  const quizzes = (Array.isArray(b.quizzes) ? b.quizzes : []).filter((q): q is Quiz =>
    !!q && typeof q === 'object' && typeof (q as Quiz).id === 'string' && (q as Quiz).id!.length <= 40 && Array.isArray((q as Quiz).questions),
  ).slice(0, MAX_QUIZZES).map(q => ({
    id: q.id, title: String(q.title ?? '').slice(0, 120), questions: q.questions.slice(0, 100),
    ...(q.theme ? { theme: q.theme } : {}), ...(q.from ? { from: String(q.from).slice(0, 60) } : {}),
    updated: Number.isFinite(q.updated) ? Math.min(Number(q.updated), Date.now() + 60e3) : 0,
  }));
  const deleted = (Array.isArray(b.deleted) ? b.deleted : []).filter((t): t is Tombstone =>
    !!t && typeof (t as Tombstone).id === 'string' && Number.isFinite((t as Tombstone).at)).slice(0, 2000)
    .map(t => ({ id: t.id.slice(0, 40), at: Math.min(t.at, Date.now() + 60e3) }));
  return { quizzes, deleted };
}

async function load(key: string): Promise<Library> {
  const { data, error } = await db().from('buzz_sync_libraries').select('quizzes, deleted').eq('key', key).maybeSingle();
  fail(error);
  return data ? { quizzes: data.quizzes as Quiz[], deleted: data.deleted as Tombstone[] } : { quizzes: [], deleted: [] };
}

/** The library for a sync link. */
export async function pullLibrary(secret: unknown, ip: string): Promise<Library> {
  if (!validSyncSecret(secret)) throw new GameError('That sync link is not valid', 400);
  rateLimit(`sync:${ip}`);
  return load(keyOf(secret));
}

/** Merges a device's library into the stored one and returns the result, which the device then uses. */
export async function pushLibrary(secret: unknown, library: unknown, ip: string): Promise<Library> {
  if (!validSyncSecret(secret)) throw new GameError('That sync link is not valid', 400);
  rateLimit(`sync:${ip}`);
  const key = keyOf(secret);
  const merged = mergeLibraries(cleanLibrary(library), await load(key));
  if (JSON.stringify(merged).length > MAX_BYTES) throw new GameError('Your quizzes are too big to sync — remove some pictures or old quizzes', 413);
  const { error } = await db().from('buzz_sync_libraries').upsert({ key, quizzes: merged.quizzes, deleted: merged.deleted, updated_at: new Date().toISOString() });
  fail(error);
  return merged;
}
