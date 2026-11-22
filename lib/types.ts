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
