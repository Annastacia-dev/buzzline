import type { ThemeId } from './themes';

export type State = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'end';

/** Every question shows for READY_MS (with a 3-2-1) before answers open. */
export const READY_MS = 3000;
/** The first question also waits INTRO_MS before that, behind a "get ready" countdown after Start game. */
export const INTRO_MS = 10000;

/**
 * `image`: optional picture shown with the question, a URL in Buzzline's image bucket (see lib/images.ts).
 * `reveal`: the picture starts behind a grid of tiles that clear while the question runs (lib/reveal.tsx).
 */
export interface Question { q: string; answers: string[]; correct: number; time: number; double?: boolean; image?: string; reveal?: boolean }
/** `from`: the share id this quiz was opened from, so opening the same link twice doesn't add it twice. */
export interface Quiz { id?: string; title: string; questions: Question[]; theme?: ThemeId; from?: string }

export interface HostView {
  role: 'host'; state: State; pin: string; title: string; theme: ThemeId; qIndex: number; total: number;
  players: { id: string; name: string; avatar: number; score: number }[];
  question?: { q: string; answers: string[]; time: number; double?: boolean; image?: string; reveal?: boolean };
  answered?: number; remaining?: number; startsIn?: number;
  correct?: number; distribution?: number[];
  leaderboard?: { name: string; avatar: number; score: number; streak: number; gained: number; up: number }[];
}

export interface PlayerView {
  role: 'player'; state: State; pin: string; title: string; theme: ThemeId; name: string; avatar: number;
  score: number; rank: number; playerCount: number; qIndex: number; total: number;
  question?: { q: string; answers: string[]; double?: boolean };
  remaining?: number; startsIn?: number; myAnswer?: number | null;
  last?: { correct: boolean; points: number; bonus: number; missed?: boolean } | null;
  streak?: number; correct?: number; answers?: string[];
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
