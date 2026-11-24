// Question types beyond "pick one": polls, type-the-answer and put-in-order. Shared by the server (checking
// answers), the studio (editing) and the phones (answering), so it must stay free of server-only imports.
import type { Question, QuestionKind } from './types';

export const KINDS: { id: QuestionKind; name: string; icon: string; hint: string }[] = [
  { id: 'choice', name: 'Multiple choice', icon: '🔘', hint: 'Pick the right answer out of 2–4' },
  { id: 'type', name: 'Type answer', icon: '⌨️', hint: 'Players type it in. Add other spellings that also count.' },
  { id: 'order', name: 'Put in order', icon: '↕️', hint: 'Type the items in the right order; players see them shuffled' },
  { id: 'poll', name: 'Poll', icon: '📊', hint: 'No right answer and no points: see what the room thinks' },
];

export const kindOf = (q: Pick<Question, 'kind'>): QuestionKind => q.kind ?? 'choice';
/** Kinds the server marks right (0) or wrong (1) itself, from typed text or an order. */
export const checkedKinds: QuestionKind[] = ['type', 'order'];

/** Lower case, no accents or punctuation, no leading "the/a/an", single spaces. */
export function normalize(s: string) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .replace(/^(the|a|an) /, '');
}

function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** A typed answer matches if it equals an accepted one, give or take case, accents, punctuation and a small typo. */
export function typedMatches(text: string, accepted: string[]) {
  const t = normalize(text);
  if (!t) return false;
  return accepted.some(a => {
    const n = normalize(a);
    if (!n) return false;
    if (t === n || t.replace(/ /g, '') === n.replace(/ /g, '')) return true;
    // Numbers must be exact; words may have one typo (two for long words).
    if (/^\d+$/.test(n)) return false;
    return n.length >= 5 && distance(t, n) <= (n.length >= 10 ? 2 : 1);
  });
}

/** A small seeded random generator (same seed, same numbers on every device). */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

/**
 * The shuffled order an order question is shown in: shown[d] is the index (in the right order) of the item
 * displayed d-th. Never the right order itself. The same for a given seed, so the host and phones agree.
 */
export function orderShown(n: number, seed: string) {
  const rnd = seeded(seed);
  for (let tries = 0; tries < 20; tries++) {
    const p = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    if (n < 2 || p.some((x, i) => x !== i)) return p;
  }
  return Array.from({ length: n }, (_, i) => (i + 1) % n);
}

/** True if `picked` (displayed positions in the order the player put them) is the right order. */
export function orderRight(picked: unknown, shown: number[]) {
  if (!Array.isArray(picked) || picked.length !== shown.length) return false;
  if (new Set(picked).size !== picked.length || picked.some(d => !Number.isInteger(d) || d < 0 || d >= shown.length)) return false;
  return picked.every((d, i) => shown[d as number] === i);
}

/** What a player sent: a tile, typed text or an order of displayed positions. */
export type Submission = { choice?: unknown; text?: unknown; order?: unknown };

/**
 * Turns a submission into the stored choice. For type and order questions: 0 if right, 1 if wrong.
 * Returns null if the submission doesn't fit the question.
 */
export function choiceFor(q: Question, sub: Submission, seed: string): number | null {
  const kind = kindOf(q);
  if (kind === 'type') return typeof sub.text === 'string' && sub.text.trim() ? (typedMatches(sub.text.slice(0, 120), q.answers) ? 0 : 1) : null;
  if (kind === 'order') return Array.isArray(sub.order) ? (orderRight(sub.order, orderShown(q.answers.length, seed)) ? 0 : 1) : null;
  return Number.isInteger(sub.choice) && (sub.choice as number) >= 0 && (sub.choice as number) < q.answers.length ? (sub.choice as number) : null;
}

/** What a screen may show of a question's answers before the reveal: nothing for typed ones, shuffled for order. */
export function answersShown(q: Question, seed: string): string[] {
  const kind = kindOf(q);
  if (kind === 'type') return [];
  if (kind === 'order') return orderShown(q.answers.length, seed).map(i => q.answers[i]);
  return q.answers;
}

/** The seed for a question's shuffle in a live game or a challenge. */
export const shuffleSeed = (where: string, qi: number) => `${where}:${qi}`;

/** Checks the answers of one question for its kind. Returns an error message or null. */
export function kindError(q: Question, n: number): string | null {
  const kind = kindOf(q);
  if (!KINDS.some(k => k.id === kind)) return `Question ${n} has an unknown type`;
  const filled = Array.isArray(q.answers) ? q.answers.map(a => String(a ?? '').trim()) : [];
  if (kind === 'type') {
    if (filled.length < 1 || filled.length > 4 || filled.some(a => !a)) return `Question ${n} needs 1–4 accepted answers`;
    return null;
  }
  if (filled.length < 2 || filled.length > 4) return `Question ${n} needs 2–4 ${kind === 'order' ? 'items' : 'answers'}`;
  if (filled.some(a => !a)) return `Question ${n} has an empty ${kind === 'order' ? 'item' : 'answer'}`;
  if (kind === 'order' && new Set(filled.map(normalize)).size !== filled.length) return `Question ${n} has two items that are the same`;
  if (kind === 'choice' && (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= filled.length)) return `Question ${n} has no correct answer`;
  return null;
}

/** Scoring shared with buzz_end_question: 1000 for an instant answer down to 500 at the buzzer, ×2 on double rounds, plus a streak bonus. */
export function points(ms: number, timeSecs: number, double: boolean | undefined, streak: number) {
  const t = timeSecs * 1000;
  const bonus = Math.min(streak, 5) * 100;
  return { gained: Math.round(1000 * (1 - Math.min(Math.max(ms, 0), t) / t / 2)) * (double ? 2 : 1) + bonus, bonus };
}
