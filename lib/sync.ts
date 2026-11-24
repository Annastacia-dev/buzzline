// Sync links: the same quiz library on every device that opens a private link. Shared by the studio and the
// server. Each quiz carries `updated` (ms); deletes are kept as tombstones so they reach the other devices.
import type { Quiz } from './types';

export type Tombstone = { id: string; at: number };
export type Library = { quizzes: Quiz[]; deleted: Tombstone[] };

const KEEP_TOMBSTONES_MS = 120 * 86400e3;

/**
 * Combines two copies of a library: the newest version of each quiz wins, and a quiz deleted after its last
 * change stays deleted. Keeps `a`'s order, then adds quizzes only `b` has.
 */
export function mergeLibraries(a: Library, b: Library): Library {
  const cutoff = Date.now() - KEEP_TOMBSTONES_MS;
  const gone = new Map<string, number>();
  for (const t of [...a.deleted, ...b.deleted]) {
    if (t && typeof t.id === 'string' && Number.isFinite(t.at) && t.at > cutoff) gone.set(t.id, Math.max(gone.get(t.id) ?? 0, t.at));
  }
  const best = new Map<string, Quiz>();
  const order: string[] = [];
  for (const q of [...a.quizzes, ...b.quizzes]) {
    if (!q?.id) continue;
    const cur = best.get(q.id);
    if (!cur) order.push(q.id);
    if (!cur || (q.updated ?? 0) > (cur.updated ?? 0)) best.set(q.id, q);
  }
  return {
    quizzes: order.map(id => best.get(id)!).filter(q => !(gone.has(q.id!) && gone.get(q.id!)! >= (q.updated ?? 0))),
    deleted: [...gone].map(([id, at]) => ({ id, at })),
  };
}

/** True if two libraries hold the same quizzes at the same versions (so there is nothing to save). */
export function sameLibrary(a: Library, b: Library) {
  if (a.quizzes.length !== b.quizzes.length || a.deleted.length !== b.deleted.length) return false;
  return a.quizzes.every((q, i) => q.id === b.quizzes[i].id && (q.updated ?? 0) === (b.quizzes[i].updated ?? 0));
}

/** A new sync secret: 24 random characters, the private part of the link. */
export function newSyncSecret() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), b => chars[b % chars.length]).join('');
}

export const validSyncSecret = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9]{24}$/.test(s);
