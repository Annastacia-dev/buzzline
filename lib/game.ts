// Buzzline game engine, backed by Supabase so it works across serverless instances (e.g. Vercel).
// Every state change is a conditional update ("only if still in state X"), so concurrent requests
// can't apply the same step twice. Scoring runs in the buzz_end_question() database function.
import crypto from 'crypto';
import { db, notify } from './supabase-server';
import type { Quiz, Question, HostView, PlayerView, State } from './types';

interface GameRow {
  pin: string; host_token: string; quiz: Quiz; state: State; q_index: number; q_start: string | null; updated_at: string;
}
interface PlayerRow {
  id: string; pin: string; token: string; name: string; score: number; streak: number; rank: number; prev_rank: number;
  answer: { q: number; choice: number; ms: number } | null;
  last: { correct: boolean; points: number; bonus: number; missed?: boolean } | null;
  joined_at: string;
}

const READY_MS = 3000;  // "get ready" before answers open
const GRACE_MS = 300;   // network slack after the buzzer
const MAX_PLAYERS = 200;

export class GameError extends Error { constructor(msg: string, public status = 409) { super(msg); } }

const token = () => crypto.randomBytes(12).toString('hex');
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

export function validateQuiz(quiz: Quiz | undefined): string | null {
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) return 'Quiz needs at least one question';
  if (quiz.questions.length > 100) return 'Quiz can have at most 100 questions';
  for (const [i, q] of quiz.questions.entries()) {
    if (!q.q || !String(q.q).trim()) return `Question ${i + 1} has no text`;
    if (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 4) return `Question ${i + 1} needs 2–4 answers`;
    if (q.answers.some(a => !String(a).trim())) return `Question ${i + 1} has an empty answer`;
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.answers.length) return `Question ${i + 1} has no correct answer`;
  }
  return null;
}

// ---------- reads ----------

async function loadGame(pin: unknown): Promise<GameRow | null> {
  const { data, error } = await db().from('buzz_games').select('*').eq('pin', String(pin ?? '').trim()).maybeSingle();
  fail(error);
  return data as GameRow | null;
}

async function mustGame(pin: unknown) {
  const g = await loadGame(pin);
  if (!g) throw new GameError('No game with that PIN', 404);
  return g;
}

async function loadPlayers(pin: string): Promise<PlayerRow[]> {
  const { data, error } = await db().from('buzz_players').select('*').eq('pin', pin).order('joined_at');
  fail(error);
  return (data ?? []) as PlayerRow[];
}

const currentQ = (g: GameRow): Question => g.quiz.questions[g.q_index];
const openAt = (g: GameRow) => (g.q_start ? Date.parse(g.q_start) : 0);
const deadline = (g: GameRow) => openAt(g) + currentQ(g).time * 1000;
const answeredNow = (g: GameRow, p: PlayerRow) => !!p.answer && p.answer.q === g.q_index;
const ranked = (ps: PlayerRow[]) => [...ps].sort((a, b) => b.score - a.score || Date.parse(a.joined_at) - Date.parse(b.joined_at));

// ---------- transitions ----------

/** Moves a game from (fromState, fromIndex) to the next question. Returns false if someone else already did. */
async function startQuestion(g: GameRow, fromState: State) {
  const { data, error } = await db().from('buzz_games')
    .update({ state: 'question', q_index: g.q_index + 1, q_start: new Date(Date.now() + READY_MS).toISOString(), updated_at: new Date().toISOString() })
    .eq('pin', g.pin).eq('state', fromState).eq('q_index', g.q_index)
    .select('pin');
  fail(error);
  if (data?.length) await notify(g.pin, { to: 'all' });
}

async function endQuestion(pin: string, q: number) {
  const { data, error } = await db().rpc('buzz_end_question', { p_pin: pin, p_q: q });
  fail(error);
  if (data === true) await notify(pin, { to: 'all' });
}

/** Ends the question if its timer has run out. Called whenever anyone reads the game, so no server timer is needed. */
async function expireIfDue(g: GameRow) {
  if (g.state === 'question' && Date.now() > deadline(g) + GRACE_MS) {
    await endQuestion(g.pin, g.q_index);
    return true;
  }
  return false;
}

// ---------- actions ----------

export async function createGame(quiz: Quiz) {
  const err = validateQuiz(quiz);
  if (err) throw new GameError(err, 400);
  const clean: Quiz = {
    title: String(quiz.title || 'Untitled quiz').slice(0, 80),
    questions: quiz.questions.map((q): Question => ({
      q: String(q.q).slice(0, 240),
      answers: q.answers.map(a => String(a).slice(0, 90)),
      correct: q.correct,
      time: Math.min(120, Math.max(5, Number(q.time) || 20)),
      double: !!q.double,
    })),
  };

  // Housekeeping: drop games idle for 6 hours (their players go with them).
  await db().from('buzz_games').delete().lt('updated_at', new Date(Date.now() - 6 * 3600e3).toISOString());

  const hostToken = token();
  for (let attempt = 0; attempt < 8; attempt++) {
    const pin = String(crypto.randomInt(100000, 1000000));
    const { error } = await db().from('buzz_games').insert({ pin, host_token: hostToken, quiz: clean });
    if (!error) return { pin, token: hostToken };
    if (error.code !== '23505') throw new Error(error.message); // 23505 = PIN taken, try another
  }
  throw new GameError('Could not allocate a PIN, try again', 503);
}

export async function join(pinIn: unknown, nameIn: unknown) {
  const g = await mustGame(pinIn);
  if (g.state !== 'lobby') throw new GameError('That game has already started');
  const name = String(nameIn ?? '').trim().replace(/\s+/g, ' ').slice(0, 16);
  if (!name) throw new GameError('Pick a nickname', 400);

  const { count, error: cErr } = await db().from('buzz_players').select('id', { count: 'exact', head: true }).eq('pin', g.pin);
  fail(cErr);
  if ((count ?? 0) >= MAX_PLAYERS) throw new GameError('Game is full');

  const tok = token();
  const { data, error } = await db().from('buzz_players').insert({ pin: g.pin, token: tok, name }).select('id').single();
  if (error?.code === '23505') throw new GameError('That nickname is taken');
  fail(error);
  // Host refetches; lobby phones just update their player count from the ping (no refetch storm).
  await notify(g.pin, { to: 'host', players: (count ?? 0) + 1 });
  return { id: data!.id as string, token: tok, pin: g.pin };
}

export async function answer(pin: unknown, id: unknown, tok: unknown, choice: unknown) {
  const arrived = Date.now(); // time the answer before any database round trip, so DB latency doesn't cost points
  const g = await mustGame(pin);
  if (g.state !== 'question') throw new GameError('Too late');
  const q = currentQ(g);
  const ms = arrived - openAt(g);
  if (ms < 0) throw new GameError('Not open yet');
  if (ms > q.time * 1000 + GRACE_MS) { await expireIfDue(g); throw new GameError('Too late'); }
  if (!Number.isInteger(choice) || (choice as number) < 0 || (choice as number) >= q.answers.length) throw new GameError('Bad choice', 400);

  // Only if this player hasn't answered this question yet.
  const { data, error } = await db().from('buzz_players')
    .update({ answer: { q: g.q_index, choice, ms: Math.min(ms, q.time * 1000) } })
    .eq('id', String(id)).eq('token', String(tok)).eq('pin', g.pin)
    .or(`answer.is.null,answer->>q.neq.${g.q_index}`)
    .select('id');
  fail(error);
  if (!data?.length) {
    const { data: p } = await db().from('buzz_players').select('id').eq('id', String(id)).eq('token', String(tok)).maybeSingle();
    throw p ? new GameError('Already answered') : new GameError('Not in this game', 403);
  }

  const players = await loadPlayers(g.pin);
  if (players.every(p => answeredNow(g, p))) await endQuestion(g.pin, g.q_index);
  else await notify(g.pin, { to: 'host' });
}

export async function hostAction(pin: unknown, tok: unknown, action: unknown, playerId?: unknown) {
  const g = await mustGame(pin);
  if (g.host_token !== tok) throw new GameError('Not the host', 403);

  switch (action) {
    case 'start': {
      if (g.state !== 'lobby') throw new GameError('Already started');
      const { count } = await db().from('buzz_players').select('id', { count: 'exact', head: true }).eq('pin', g.pin);
      if (!count) throw new GameError('Wait for at least one player');
      return startQuestion(g, 'lobby');
    }
    case 'skip':
      if (g.state === 'question') await endQuestion(g.pin, g.q_index);
      return;
    case 'next':
      if (g.state === 'reveal') {
        const next: State = g.q_index + 1 >= g.quiz.questions.length ? 'end' : 'leaderboard';
        const { data, error } = await db().from('buzz_games').update({ state: next, updated_at: new Date().toISOString() })
          .eq('pin', g.pin).eq('state', 'reveal').eq('q_index', g.q_index).select('pin');
        fail(error);
        if (data?.length) await notify(g.pin, { to: 'all' });
      } else if (g.state === 'leaderboard') {
        await startQuestion(g, 'leaderboard');
      }
      return;
    case 'kick': {
      const { error } = await db().from('buzz_players').delete().eq('id', String(playerId)).eq('pin', g.pin);
      fail(error);
      return notify(g.pin, { to: 'all' });
    }
    case 'end': {
      const { error } = await db().from('buzz_games').delete().eq('pin', g.pin);
      fail(error);
      return notify(g.pin, { to: 'all' });
    }
  }
  throw new GameError('Unknown action', 400);
}

// ---------- views: what each screen is allowed to see ----------

function hostView(g: GameRow, ps: PlayerRow[]): HostView {
  const v: HostView = {
    role: 'host', state: g.state, pin: g.pin, title: g.quiz.title,
    qIndex: g.q_index, total: g.quiz.questions.length,
    players: ps.map(p => ({ id: p.id, name: p.name, score: p.score })),
  };
  if (g.state === 'question' || g.state === 'reveal') {
    const q = currentQ(g);
    v.question = { q: q.q, answers: q.answers, time: q.time, double: q.double };
    v.answered = ps.filter(p => answeredNow(g, p)).length;
  }
  if (g.state === 'question') {
    v.remaining = Math.max(0, deadline(g) - Date.now());
    v.startsIn = Math.max(0, openAt(g) - Date.now());
  }
  if (g.state === 'reveal') {
    const q = currentQ(g);
    v.correct = q.correct;
    v.distribution = q.answers.map((_, i) => ps.filter(p => answeredNow(g, p) && p.answer!.choice === i).length);
  }
  if (g.state === 'leaderboard' || g.state === 'end') {
    v.leaderboard = ranked(ps).slice(0, g.state === 'end' ? 10 : 5).map(p => ({
      name: p.name, score: p.score, streak: p.streak, gained: p.last?.points ?? 0,
      up: p.prev_rank ? p.prev_rank - p.rank : 0,
    }));
  }
  return v;
}

function playerView(g: GameRow, ps: PlayerRow[], p: PlayerRow): PlayerView {
  const v: PlayerView = {
    role: 'player', state: g.state, pin: g.pin, title: g.quiz.title, name: p.name,
    score: p.score, rank: p.rank, playerCount: ps.length,
    qIndex: g.q_index, total: g.quiz.questions.length,
  };
  if (g.state === 'question') {
    const q = currentQ(g);
    v.question = { q: q.q, answers: q.answers, double: q.double };
    v.remaining = Math.max(0, deadline(g) - Date.now());
    v.startsIn = Math.max(0, openAt(g) - Date.now());
    v.myAnswer = answeredNow(g, p) ? p.answer!.choice : null;
  }
  if (g.state === 'reveal' || g.state === 'leaderboard' || g.state === 'end') {
    v.last = p.last; v.streak = p.streak;
    if (g.state === 'reveal') {
      const q = currentQ(g);
      v.correct = q.correct; v.answers = q.answers; v.myAnswer = answeredNow(g, p) ? p.answer!.choice : null;
    }
    const r = ranked(ps); const i = r.findIndex(x => x.id === p.id);
    if (i > 0) v.behind = { name: r[i - 1].name, by: r[i - 1].score - p.score };
  }
  return v;
}

/** The current view for one screen. Also ends an expired question, so timers need no background job. */
export async function getView(params: URLSearchParams): Promise<HostView | PlayerView | { state: 'closed' | 'kicked' }> {
  let g = await loadGame(params.get('pin'));
  if (!g) return { state: 'closed' };
  const isHost = params.get('role') === 'host';
  if (isHost && params.get('token') !== g.host_token) return { state: 'closed' };

  if (await expireIfDue(g)) g = (await loadGame(g.pin))!;
  if (!g) return { state: 'closed' };
  const ps = await loadPlayers(g.pin);
  if (isHost) return hostView(g, ps);

  const p = ps.find(x => x.id === params.get('id') && x.token === params.get('token'));
  return p ? playerView(g, ps, p) : { state: 'kicked' };
}
