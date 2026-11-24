// Team mode: names, colours and standings. Shared by the server and the screens.
import type { TeamScore } from './types';

export const TEAMS = [
  { name: 'Foxes', emoji: '🦊', color: 'var(--pink)' },
  { name: 'Owls', emoji: '🦉', color: 'var(--lilac)' },
  { name: 'Bees', emoji: '🐝', color: 'var(--butter)' },
  { name: 'Frogs', emoji: '🐸', color: 'var(--sage)' },
] as const;

export const TEAM_CHOICES = [0, 2, 3, 4] as const;
export const validTeams = (n: unknown) => (TEAM_CHOICES as readonly number[]).includes(n as number) ? (n as number) : 0;

/**
 * Team standings, best first. A team's score is the average of its players' scores, so a team of 3 can beat a
 * team of 5. Empty teams are left out.
 */
export function teamBoard(teams: number, players: { team?: number | null; score: number }[]): TeamScore[] {
  return TEAMS.slice(0, teams).map((t, team) => {
    const ps = players.filter(p => p.team === team);
    return { team, name: t.name, emoji: t.emoji, score: ps.length ? Math.round(ps.reduce((a, p) => a + p.score, 0) / ps.length) : 0, players: ps.length };
  }).filter(t => t.players > 0).sort((a, b) => b.score - a.score || a.team - b.team);
}

/** The team a new player joins: the one with the fewest players (the first of those on a tie). */
export function smallestTeam(teams: number, taken: { team?: number | null }[]) {
  const counts = Array.from({ length: teams }, (_, t) => taken.filter(p => p.team === t).length);
  return counts.indexOf(Math.min(...counts));
}
