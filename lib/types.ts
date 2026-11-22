export type State = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'end';

export interface Question { q: string; answers: string[]; correct: number; time: number; double?: boolean }
export interface Quiz { id?: string; title: string; questions: Question[] }

export interface HostView {
  role: 'host'; state: State; pin: string; title: string; qIndex: number; total: number;
  players: { id: string; name: string; avatar: number; score: number }[];
  question?: { q: string; answers: string[]; time: number; double?: boolean };
  answered?: number; remaining?: number; startsIn?: number;
  correct?: number; distribution?: number[];
  leaderboard?: { name: string; avatar: number; score: number; streak: number; gained: number; up: number }[];
}

export interface PlayerView {
  role: 'player'; state: State; pin: string; title: string; name: string; avatar: number;
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
