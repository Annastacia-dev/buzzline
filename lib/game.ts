// Buzzline game engine. In-memory state: run with `next dev` or `next start` (one long-lived
// Node process). Serverless hosting would split state across instances.
import crypto from 'crypto';
import type { Quiz, Question, HostView, PlayerView, State } from './types';

type Send = (data: unknown) => void;

interface Player {
  id: string; token: string; name: string;
  score: number; streak: number; rank: number; prevRank: number;
  answer: { choice: number; ms: number } | null;
  last: { correct: boolean; points: number; bonus: number; missed?: boolean } | null;
  joined: number;
  streams: Set<Send>;
}

interface Game {
  pin: string; hostToken: string; quiz: Quiz;
  state: State; qIndex: number; qStart: number;
  timer: ReturnType<typeof setTimeout> | undefined;
  players: Map<string, Player>;
  hosts: Set<Send>;
  touched: number;
}

// Survive hot module reloads in dev.
const g0 = globalThis as unknown as { __buzz?: Map<string, Game>; __buzzSweep?: boolean };
const games: Map<string, Game> = (g0.__buzz ??= new Map());
if (!g0.__buzzSweep) {
  g0.__buzzSweep = true;
  setInterval(() => {
    for (const [pin, g] of games) if (Date.now() - g.touched > 3 * 3600e3) { clearTimeout(g.timer); games.delete(pin); }
  }, 600e3).unref?.();
}

const token = () => crypto.randomBytes(12).toString('hex');
const newPin = () => {
  let pin;
  do pin = String(crypto.randomInt(100000, 1000000)); while (games.has(pin));
  return pin;
};

export class GameError extends Error { constructor(msg: string, public status = 409) { super(msg); } }

export function validateQuiz(quiz: Quiz | undefined): string | null {
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) return 'Quiz needs at least one question';
  for (const [i, q] of quiz.questions.entries()) {
    if (!q.q || !String(q.q).trim()) return `Question ${i + 1} has no text`;
    if (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 4) return `Question ${i + 1} needs 2–4 answers`;
    if (q.answers.some(a => !String(a).trim())) return `Question ${i + 1} has an empty answer`;
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.answers.length) return `Question ${i + 1} has no correct answer`;
  }
  return null;
}

export function createGame(quiz: Quiz) {
  const err = validateQuiz(quiz);
  if (err) throw new GameError(err, 400);
  const g: Game = {
    pin: newPin(), hostToken: token(),
    quiz: {
      title: String(quiz.title || 'Untitled quiz').slice(0, 80),
      questions: quiz.questions.map((q): Question => ({
        q: String(q.q).slice(0, 240),
        answers: q.answers.map(a => String(a).slice(0, 90)),
        correct: q.correct,
        time: Math.min(120, Math.max(5, Number(q.time) || 20)),
        double: !!q.double,
      })),
    },
    state: 'lobby', qIndex: -1, qStart: 0, timer: undefined,
    players: new Map(), hosts: new Set(), touched: Date.now(),
  };
  games.set(g.pin, g);
  return { pin: g.pin, token: g.hostToken };
}

const currentQ = (g: Game) => g.quiz.questions[g.qIndex];
const remaining = (g: Game) => Math.max(0, g.qStart + currentQ(g).time * 1000 - Date.now());
const ranked = (g: Game) => [...g.players.values()].sort((a, b) => b.score - a.score || a.joined - b.joined);
const READY_MS = 3000;

function startQuestion(g: Game) {
  g.qIndex++;
  g.state = 'question';
  g.qStart = Date.now() + READY_MS;
  for (const p of g.players.values()) p.answer = null;
  clearTimeout(g.timer);
  g.timer = setTimeout(() => endQuestion(g), currentQ(g).time * 1000 + READY_MS + 300);
  broadcast(g);
}

function endQuestion(g: Game) {
  if (g.state !== 'question') return;
  clearTimeout(g.timer);
  const q = currentQ(g);
  for (const p of g.players.values()) {
    const a = p.answer;
    if (a && a.choice === q.correct) {
      p.streak++;
      const speed = 1 - a.ms / (q.time * 1000) / 2; // 1.0 (instant) → 0.5 (buzzer)
      const base = Math.round(1000 * speed) * (q.double ? 2 : 1);
      const bonus = Math.min(p.streak - 1, 5) * 100;
      p.last = { correct: true, points: base + bonus, bonus };
    } else {
      p.streak = 0;
      p.last = { correct: false, points: 0, bonus: 0, missed: !a };
    }
    p.prevRank = p.rank;
    p.score += p.last.points;
  }
  ranked(g).forEach((p, i) => (p.rank = i + 1));
  g.state = 'reveal';
  broadcast(g);
}

function getGame(pin: unknown) {
  const g = games.get(String(pin ?? '').trim());
  if (!g) throw new GameError('No game with that PIN', 404);
  return g;
}

function getPlayer(g: Game, id: unknown, tok: unknown) {
  const p = g.players.get(String(id));
  if (!p || p.token !== tok) throw new GameError('Not in this game', 403);
  return p;
}

export function join(pinIn: unknown, nameIn: unknown) {
  const g = getGame(pinIn);
  if (g.state !== 'lobby') throw new GameError('That game has already started');
  const name = String(nameIn ?? '').trim().replace(/\s+/g, ' ').slice(0, 16);
  if (!name) throw new GameError('Pick a nickname', 400);
  if ([...g.players.values()].some(x => x.name.toLowerCase() === name.toLowerCase())) throw new GameError('That nickname is taken');
  if (g.players.size >= 200) throw new GameError('Game is full');
  const p: Player = { id: token(), token: token(), name, score: 0, streak: 0, rank: 0, prevRank: 0, answer: null, last: null, joined: Date.now(), streams: new Set() };
  g.players.set(p.id, p);
  broadcast(g);
  return { id: p.id, token: p.token, pin: g.pin };
}

export function answer(pin: unknown, id: unknown, tok: unknown, choice: unknown) {
  const g = getGame(pin);
  const p = getPlayer(g, id, tok);
  if (g.state !== 'question' || p.answer) throw new GameError('Too late');
  const q = currentQ(g);
  const ms = Date.now() - g.qStart;
  if (ms < 0) throw new GameError('Not open yet');
  if (!Number.isInteger(choice) || (choice as number) < 0 || (choice as number) >= q.answers.length) throw new GameError('Bad choice', 400);
  p.answer = { choice: choice as number, ms: Math.min(ms, q.time * 1000) };
  if ([...g.players.values()].every(x => x.answer)) endQuestion(g);
  else broadcast(g);
}

export function hostAction(pin: unknown, tok: unknown, action: unknown, playerId?: unknown) {
  const g = getGame(pin);
  if (g.hostToken !== tok) throw new GameError('Not the host', 403);
  switch (action) {
    case 'start':
      if (g.state !== 'lobby') throw new GameError('Already started');
      if (g.players.size === 0) throw new GameError('Wait for at least one player');
      return startQuestion(g);
    case 'skip':
      return endQuestion(g);
    case 'next':
      if (g.state === 'reveal') {
        g.state = g.qIndex + 1 >= g.quiz.questions.length ? 'end' : 'leaderboard';
        broadcast(g);
      } else if (g.state === 'leaderboard') startQuestion(g);
      return;
    case 'kick': {
      const p = g.players.get(String(playerId));
      if (!p) throw new GameError('No such player', 404);
      g.players.delete(p.id);
      p.streams.forEach(s => s({ state: 'kicked' }));
      return broadcast(g);
    }
    case 'end':
      clearTimeout(g.timer);
      for (const p of g.players.values()) p.streams.forEach(s => s({ state: 'closed' }));
      g.hosts.forEach(s => s({ state: 'closed' }));
      games.delete(g.pin);
      return;
  }
  throw new GameError('Unknown action', 400);
}

// ---------- views: what each screen is allowed to see ----------

function hostView(g: Game): HostView {
  const all = [...g.players.values()];
  const v: HostView = {
    role: 'host', state: g.state, pin: g.pin, title: g.quiz.title,
    qIndex: g.qIndex, total: g.quiz.questions.length,
    players: all.map(p => ({ id: p.id, name: p.name, score: p.score })),
  };
  if (g.state === 'question' || g.state === 'reveal') {
    const q = currentQ(g);
    v.question = { q: q.q, answers: q.answers, time: q.time, double: q.double };
    v.answered = all.filter(p => p.answer).length;
  }
  if (g.state === 'question') {
    v.remaining = remaining(g);
    v.startsIn = Math.max(0, g.qStart - Date.now());
  }
  if (g.state === 'reveal') {
    const q = currentQ(g);
    v.correct = q.correct;
    v.distribution = q.answers.map((_, i) => all.filter(p => p.answer?.choice === i).length);
  }
  if (g.state === 'leaderboard' || g.state === 'end') {
    v.leaderboard = ranked(g).slice(0, g.state === 'end' ? 10 : 5).map(p => ({
      name: p.name, score: p.score, streak: p.streak, gained: p.last?.points ?? 0,
      up: p.prevRank ? p.prevRank - p.rank : 0,
    }));
  }
  return v;
}

function playerView(g: Game, p: Player): PlayerView {
  const v: PlayerView = {
    role: 'player', state: g.state, pin: g.pin, title: g.quiz.title, name: p.name,
    score: p.score, rank: p.rank, playerCount: g.players.size,
    qIndex: g.qIndex, total: g.quiz.questions.length,
  };
  if (g.state === 'question') {
    const q = currentQ(g);
    v.question = { q: q.q, answers: q.answers, double: q.double };
    v.remaining = remaining(g);
    v.startsIn = Math.max(0, g.qStart - Date.now());
    v.myAnswer = p.answer ? p.answer.choice : null;
  }
  if (g.state === 'reveal' || g.state === 'leaderboard' || g.state === 'end') {
    v.last = p.last; v.streak = p.streak;
    if (g.state === 'reveal') {
      const q = currentQ(g);
      v.correct = q.correct; v.answers = q.answers; v.myAnswer = p.answer ? p.answer.choice : null;
    }
    const r = ranked(g); const i = r.indexOf(p);
    if (i > 0) v.behind = { name: r[i - 1].name, by: r[i - 1].score - p.score };
  }
  return v;
}

function broadcast(g: Game) {
  g.touched = Date.now();
  const hv = hostView(g);
  g.hosts.forEach(s => s(hv));
  for (const p of g.players.values()) { const pv = playerView(g, p); p.streams.forEach(s => s(pv)); }
}

// Registers an event-stream listener; returns an unsubscribe fn, or null with a terminal message sent.
export function subscribe(params: URLSearchParams, send: Send): (() => void) | null {
  const g = games.get(params.get('pin') ?? '');
  if (!g) { send({ state: 'closed' }); return null; }
  if (params.get('role') === 'host') {
    if (params.get('token') !== g.hostToken) { send({ state: 'closed' }); return null; }
    g.hosts.add(send); send(hostView(g));
    return () => g.hosts.delete(send);
  }
  const p = g.players.get(params.get('id') ?? '');
  if (!p || p.token !== params.get('token')) { send({ state: 'kicked' }); return null; }
  p.streams.add(send); send(playerView(g, p));
  return () => p.streams.delete(send);
}
