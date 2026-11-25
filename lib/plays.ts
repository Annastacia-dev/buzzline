// How often a quiz has been hosted to the end. Each finished game leaves its id on the quiz, so counting it twice
// (a refreshed podium, or two synced devices) changes nothing. Games ended early are never recorded.
import type { Quiz } from './types';

/** Where the studio keeps the quiz library in this browser. */
export const QUIZZES_KEY = 'bz.quizzes';
const MAX_PLAYS = 1000;

/** The finished games in both lists, each once. Anything that isn't a short id is dropped. */
export function unionPlays(a: unknown, b?: unknown): string[] {
  const all = [a, b].flatMap(l => (Array.isArray(l) ? l : []));
  return [...new Set(all.filter((p): p is string => typeof p === 'string' && p.length > 0 && p.length <= 40))].slice(0, MAX_PLAYS);
}

export const timesHosted = (q: Quiz) => q.plays?.length ?? 0;
export const hostedLabel = (q: Quiz) => { const n = timesHosted(q); return n === 1 ? 'hosted once' : `hosted ${n} times`; };

/**
 * Records a finished game on its quiz in this browser's library; does nothing if the quiz has been deleted.
 * Leaves `updated` alone, so a game on one device never beats an edit made on another.
 */
export function recordPlay(quizId: string, playId: string) {
  try {
    const list: Quiz[] = JSON.parse(localStorage.getItem(QUIZZES_KEY) || '[]');
    const q = list.find(x => x.id === quizId);
    if (!q || q.plays?.includes(playId)) return;
    q.plays = unionPlays(q.plays, [playId]);
    localStorage.setItem(QUIZZES_KEY, JSON.stringify(list));
  } catch {}
}
