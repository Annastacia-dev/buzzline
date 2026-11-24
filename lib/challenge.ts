// Challenge links (/c/<id>): a quiz anyone plays alone on their phone, whenever they like, with a shared
// leaderboard. Server only. The server keeps the clock (each question's start time), so answers are timed and
// scored here exactly like a live game, and phones never see the right answer before they've answered.
import crypto from 'crypto';
import { db } from './supabase-server';
import { GameError, cleanQuiz } from './game';
import { READY_MS, type Quiz, type QuestionKind } from './types';
import { answersShown, checkedKinds, choiceFor, kindOf, points, shuffleSeed, type Submission } from './kinds';
import { avatarCount } from './avatars';
import { themeOf, type ThemeId } from './themes';
import { effectsOf, type EffectId, type FallId } from './effect-ids';

const GRACE_MS = 300;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const shortId = (n: number) => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

interface ChallengeRow { id: string; quiz: Quiz; created_at: string; expires_at: string }
interface RunRow {
  id: string; challenge_id: string; token: string; name: string; avatar: number; score: number; streak: number;
  q_index: number; q_start: string; answered_q: number; finished_at: string | null;
  last: RunResult | null; history: { q: number; correct: boolean; points: number; ms: number | null }[];
}
export interface RunResult { q: number; correct: boolean; points: number; bonus: number; missed?: boolean; poll?: boolean; choice?: number | null }

/** What a challenge player's phone shows. */
export interface RunView {
  title: string; theme: ThemeId; effect: EffectId; fall: FallId; total: number; qIndex: number; name: string; avatar: number; score: number; streak: number;
  /** question: answering (startsIn / remaining in ms). result: this question is done. finished: all done. */
  phase: 'question' | 'result' | 'finished';
  question?: { q: string; answers: string[]; double?: boolean; kind?: QuestionKind; image?: string; time: number };
  startsIn?: number; remaining?: number;
  result?: RunResult & { answers: string[]; correctIndex: number; solution?: string[]; kind?: QuestionKind };
  rank?: number; players?: number;
  /** The next question's picture, to download ahead of time. */
  nextImage?: string;
}

/** The public part: title, theme and the top of the leaderboard. */
export interface ChallengeInfo {
  id: string; title: string; theme: ThemeId; effect: EffectId; fall: FallId; total: number; players: number;
  board: { name: string; avatar: number; score: number; finished: boolean }[];
}

async function loadChallenge(idIn: unknown): Promise<ChallengeRow> {
  const id = String(idIn ?? '');
  if (!/^[A-Za-z0-9]{10}$/.test(id)) throw new GameError('That challenge link is not valid', 400);
  const { data, error } = await db().from('buzz_challenges').select('*').eq('id', id).maybeSingle();
  fail(error);
  if (!data || Date.parse(data.expires_at) < Date.now()) throw new GameError('That challenge has ended or never existed', 404);
  return data as ChallengeRow;
}

// Per-instance limit on new challenges, like share links.
const hits = new Map<string, { n: number; since: number }>();
function rateLimit(key: string, limit: number) {
  const now = Date.now(), h = hits.get(key);
  if (!h || now - h.since > 3600e3) { hits.set(key, { n: 1, since: now }); return; }
  if (++h.n > limit) throw new GameError('Too many challenge links — try again in a while', 429);
}

export async function createChallenge(quiz: unknown, ip: string) {
  rateLimit(`challenge:${ip}`, 30);
  const clean = cleanQuiz(quiz as Quiz);
  // Housekeeping: drop expired challenges (their runs go with them).
  await db().from('buzz_challenges').delete().lt('expires_at', new Date().toISOString());
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = shortId(10);
    const { error } = await db().from('buzz_challenges').insert({ id, quiz: clean });
    if (!error) return { id };
    if (error.code !== '23505') throw new Error(error.message);
  }
  throw new GameError('Could not create a link, try again', 503);
}

export async function challengeInfo(idIn: unknown): Promise<ChallengeInfo> {
  const c = await loadChallenge(idIn);
  const [{ data, error }, { count }] = await Promise.all([
    db().from('buzz_challenge_runs').select('name, avatar, score, finished_at').eq('challenge_id', c.id)
      .order('score', { ascending: false }).order('created_at').limit(20),
    db().from('buzz_challenge_runs').select('id', { count: 'exact', head: true }).eq('challenge_id', c.id),
  ]);
  fail(error);
  return {
    id: c.id, title: c.quiz.title || 'Untitled quiz', theme: themeOf(c.quiz.theme), ...effectsOf(c.quiz), total: c.quiz.questions.length, players: count ?? 0,
    board: (data ?? []).map(r => ({ name: r.name, avatar: r.avatar, score: r.score, finished: !!r.finished_at })),
  };
}

async function loadRun(c: ChallengeRow, runId: unknown, token: unknown): Promise<RunRow> {
  const { data, error } = await db().from('buzz_challenge_runs').select('*')
    .eq('id', String(runId ?? '')).eq('challenge_id', c.id).eq('token', String(token ?? '')).maybeSingle();
  if (error && error.code !== '22P02') fail(error); // 22P02: not a uuid
  if (!data) throw new GameError('That run has ended — start again from the challenge link', 404);
  return data as RunRow;
}

/** Starts a run for a nickname: the first question opens after the usual 3-2-1. */
export async function startRun(idIn: unknown, nameIn: unknown) {
  const c = await loadChallenge(idIn);
  const name = String(nameIn ?? '').trim().replace(/\s+/g, ' ').slice(0, 16);
  if (!name) throw new GameError('Pick a nickname', 400);
  const token = crypto.randomBytes(12).toString('hex');
  const { data, error } = await db().from('buzz_challenge_runs').insert({
    challenge_id: c.id, token, name, avatar: crypto.randomInt(avatarCount), q_start: new Date(Date.now() + READY_MS).toISOString(),
  }).select('*').single();
  if (error?.code === '23505') throw new GameError('Someone already played with that nickname — pick another');
  fail(error);
  const run = data as RunRow;
  return { run: run.id, token, view: view(c, run) };
}

const deadline = (c: ChallengeRow, r: RunRow) => Date.parse(r.q_start) + c.quiz.questions[r.q_index].time * 1000;

/** Marks the current question missed if its time ran out without an answer. */
async function expire(c: ChallengeRow, r: RunRow): Promise<RunRow> {
  if (r.finished_at || r.answered_q >= r.q_index || Date.now() <= deadline(c, r) + GRACE_MS) return r;
  const q = c.quiz.questions[r.q_index];
  const poll = kindOf(q) === 'poll';
  const last: RunResult = { q: r.q_index, correct: false, points: 0, bonus: 0, missed: true, poll, choice: null };
  const { data, error } = await db().from('buzz_challenge_runs').update({
    answered_q: r.q_index, streak: poll ? r.streak : 0, last, history: [...r.history, { q: r.q_index, correct: false, points: 0, ms: null }],
  }).eq('id', r.id).eq('answered_q', r.answered_q).select('*');
  fail(error);
  return (data?.[0] as RunRow) ?? r;
}

async function rankOf(c: ChallengeRow, r: RunRow) {
  const [{ count: above }, { count: players }] = await Promise.all([
    db().from('buzz_challenge_runs').select('id', { count: 'exact', head: true }).eq('challenge_id', c.id).gt('score', r.score),
    db().from('buzz_challenge_runs').select('id', { count: 'exact', head: true }).eq('challenge_id', c.id),
  ]);
  return { rank: (above ?? 0) + 1, players: players ?? 1 };
}

function view(c: ChallengeRow, r: RunRow): RunView {
  const total = c.quiz.questions.length;
  const nextImage = r.finished_at ? undefined : c.quiz.questions[r.q_index + 1]?.image;
  const base = { nextImage, title: c.quiz.title || 'Untitled quiz', theme: themeOf(c.quiz.theme), ...effectsOf(c.quiz), total, qIndex: r.q_index, name: r.name, avatar: r.avatar, score: r.score, streak: r.streak };
  if (r.finished_at) return { ...base, phase: 'finished' };
  const q = c.quiz.questions[r.q_index];
  const kind = kindOf(q);
  if (r.answered_q >= r.q_index && r.last) {
    return {
      ...base, phase: 'result',
      result: {
        ...r.last, answers: q.answers, correctIndex: kind === 'poll' ? -1 : q.correct,
        ...(kind !== 'choice' ? { kind } : {}), ...(checkedKinds.includes(kind) ? { solution: q.answers } : {}),
      },
    };
  }
  const now = Date.now();
  return {
    ...base, phase: 'question',
    question: { q: q.q, answers: answersShown(q, shuffleSeed(c.id + r.id, r.q_index)), double: q.double, time: q.time, ...(q.image ? { image: q.image } : {}), ...(kind !== 'choice' ? { kind } : {}) },
    startsIn: Math.max(0, Date.parse(r.q_start) - now), remaining: Math.max(0, deadline(c, r) - now),
  };
}

/** The run's current screen (also marks a question missed once its time is up). */
export async function runView(idIn: unknown, runId: unknown, token: unknown) {
  const c = await loadChallenge(idIn);
  const r = await expire(c, await loadRun(c, runId, token));
  const v = view(c, r);
  return r.finished_at ? { ...v, ...(await rankOf(c, r)) } : v;
}

/** Scores an answer to the current question. */
export async function runAnswer(idIn: unknown, runId: unknown, token: unknown, sub: Submission) {
  const arrived = Date.now();
  const c = await loadChallenge(idIn);
  let r = await loadRun(c, runId, token);
  if (r.finished_at) throw new GameError('You have finished this challenge');
  if (r.answered_q >= r.q_index) throw new GameError('Already answered');
  const q = c.quiz.questions[r.q_index];
  const ms = arrived - Date.parse(r.q_start);
  if (ms < 0) throw new GameError('Not open yet');
  if (ms > q.time * 1000 + GRACE_MS) { r = await expire(c, r); return view(c, r); }
  const choice = choiceFor(q, sub, shuffleSeed(c.id + r.id, r.q_index));
  if (choice === null) throw new GameError('Bad choice', 400);
  const kind = kindOf(q);
  const poll = kind === 'poll';
  const correct = !poll && choice === q.correct;
  const { gained, bonus } = correct ? points(ms, q.time, q.double, r.streak) : { gained: 0, bonus: 0 };
  const last: RunResult = { q: r.q_index, correct, points: gained, bonus, poll, choice: checkedKinds.includes(kind) ? null : choice };
  const { data, error } = await db().from('buzz_challenge_runs').update({
    answered_q: r.q_index, score: r.score + gained, streak: poll ? r.streak : correct ? r.streak + 1 : 0, last,
    history: [...r.history, { q: r.q_index, correct, points: gained, ms: Math.round(Math.min(ms, q.time * 1000)) }],
  }).eq('id', r.id).eq('answered_q', r.answered_q).select('*');
  fail(error);
  if (!data?.length) throw new GameError('Already answered');
  return view(c, data[0] as RunRow);
}

/** Moves on from a result to the next question (after a 3-2-1), or finishes the run. */
export async function runNext(idIn: unknown, runId: unknown, token: unknown) {
  const c = await loadChallenge(idIn);
  const r = await expire(c, await loadRun(c, runId, token));
  if (r.finished_at) return { ...view(c, r), ...(await rankOf(c, r)) };
  if (r.answered_q < r.q_index) throw new GameError('Answer this one first');
  const last = r.q_index + 1 >= c.quiz.questions.length;
  const patch = last ? { finished_at: new Date().toISOString() } : { q_index: r.q_index + 1, q_start: new Date(Date.now() + READY_MS).toISOString() };
  const { data, error } = await db().from('buzz_challenge_runs').update(patch).eq('id', r.id).eq('q_index', r.q_index).is('finished_at', null).select('*');
  fail(error);
  const next = (data?.[0] as RunRow) ?? (await loadRun(c, runId, token));
  return next.finished_at ? { ...view(c, next), ...(await rankOf(c, next)) } : view(c, next);
}
