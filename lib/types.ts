import type { ThemeId } from './themes';
import type { EffectId, FallId } from './effect-ids';

export type State = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'end';

/** Every question shows for READY_MS (with a 3-2-1) before answers open. */
export const READY_MS = 3000;
/** The first question also waits INTRO_MS before that, behind a "get ready" countdown after Start game. */
export const INTRO_MS = 10000;

/**
 * `image`: optional picture shown with the question, a URL in Buzzline's image bucket (see lib/images.ts).
 * `reveal`: the picture starts behind a grid of tiles that clear while the question runs (lib/reveal.tsx).
 */
export type QuestionKind = 'choice' | 'type' | 'order' | 'poll';
/**
 * `kind`: how players answer (lib/kinds.ts). Default 'choice'. For 'type' the answers are the accepted spellings,
 * for 'order' the items in the right order, and for 'poll' there is no right answer. `correct` is 0 for those.
 */
export interface Question { q: string; answers: string[]; correct: number; time: number; double?: boolean; image?: string; reveal?: boolean; kind?: QuestionKind }
/**
 * `from`: the share id or pack this quiz was opened from, so opening the same link twice doesn't add it twice.
 * `updated`: when it was last changed in the studio (ms), so sync links keep the newest copy.
 */
/** `plays`: the ids of this quiz's games that were hosted to the end (lib/plays.ts). */
export interface Quiz { id?: string; plays?: string[]; title: string; questions: Question[]; theme?: ThemeId; effect?: EffectId; fall?: FallId; from?: string; updated?: number }

/** A team in team mode: its number (0–3), name, and score, the average of its players' scores. */
export interface TeamScore { team: number; name: string; emoji: string; score: number; players: number }

export interface HostView {
  role: 'host'; state: State; pin: string; title: string; theme: ThemeId; effect?: EffectId; fall?: FallId; qIndex: number; total: number;
  players: { id: string; name: string; avatar: number; score: number }[];
  question?: { q: string; answers: string[]; time: number; double?: boolean; image?: string; reveal?: boolean; kind?: QuestionKind };
  answered?: number; remaining?: number; startsIn?: number;
  /** The next question's picture, so the screen can download it before it is needed. */
  nextImage?: string;
  /** At the reveal. For type and order questions `distribution` is [right, wrong] and `solution` the accepted answers or the right order. */
  correct?: number; distribution?: number[]; solution?: string[];
  /** Team mode only: the number of teams, each player's team, and the standings. */
  teams?: number; playerTeams?: Record<string, number>; teamBoard?: TeamScore[];
  leaderboard?: { name: string; avatar: number; score: number; streak: number; gained: number; up: number }[];
}

export interface PlayerView {
  role: 'player'; state: State; pin: string; title: string; theme: ThemeId; effect?: EffectId; fall?: FallId; name: string; avatar: number;
  score: number; rank: number; playerCount: number; qIndex: number; total: number;
  question?: { q: string; answers: string[]; double?: boolean; kind?: QuestionKind; image?: string; reveal?: boolean };
  remaining?: number; startsIn?: number; myAnswer?: number | null;
  /** The next question's picture, so the phone can download it before it is needed. */
  nextImage?: string;
  last?: { correct: boolean; points: number; bonus: number; missed?: boolean; poll?: boolean } | null;
  streak?: number; correct?: number; answers?: string[]; kind?: QuestionKind; solution?: string[];
  /** Team mode only: this player's team and where it stands. */
  team?: TeamScore & { rank: number; of: number };
  behind?: { name: string; by: number };
}

/** Terminal messages pushed when a game ends or a player is removed. */
export type EndView = { state: 'closed' | 'kicked' };

/** End-of-game report for the host. Times in ms. Only scored questions are included. */
export interface GameAnalytics {
  title: string;
  summary: { players: number; questions: number; accuracy: number; avgMs: number | null; hardest: number | null; easiest: number | null };
  questions: {
    q: string; answers: string[]; correct: number; double?: boolean; time: number;
    counts: number[];          // players per answer
    answered: number; correctCount: number; missed: number; players: number;
    avgMs: number | null;      // over players who answered
    fastest: { name: string; ms: number } | null; // fastest correct answer
  }[];
  players: {
    name: string; avatar: number; rank: number; score: number;
    correct: number; answered: number; avgMs: number | null; bestStreak: number;
  }[];
}
