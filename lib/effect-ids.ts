// The seasonal effects a quiz can use (drawn by lib/effects.tsx). Plain data, safe for the server.
// Two independent choices that can be combined: a decoration (lights along the top, fireworks) and something
// falling (snow, leaves…), so a quiz can have Christmas lights *and* snow.
export const EFFECTS = [
  { id: 'none', name: 'No decoration', icon: '—', hint: 'Just the theme' },
  { id: 'lights', name: 'Christmas lights', icon: '🎄', hint: 'A string of twinkling bulbs along the top' },
  { id: 'fireworks', name: 'Fireworks', icon: '🎆', hint: 'Bursts of colour, for New Year' },
] as const;

export const FALLS = [
  { id: 'none', name: 'Nothing falling', icon: '—', hint: 'A still screen' },
  { id: 'snow', name: 'Falling snow', icon: '❄️', hint: 'Gentle snowfall on every screen' },
  { id: 'leaves', name: 'Autumn leaves', icon: '🍂', hint: 'Falling leaves in warm colours' },
  { id: 'confetti', name: 'Confetti', icon: '🎊', hint: 'Fluttering paper in party colours' },
  { id: 'stars', name: 'Falling stars', icon: '⭐', hint: 'Little gold stars drifting down' },
  { id: 'hearts', name: 'Floating hearts', icon: '💕', hint: 'Hearts rising, for Valentine’s Day' },
] as const;

export type EffectId = (typeof EFFECTS)[number]['id'];
export type FallId = (typeof FALLS)[number]['id'];
export const effectOf = (x: unknown): EffectId => (EFFECTS.some(e => e.id === x) ? (x as EffectId) : 'none');
export const fallOf = (x: unknown): FallId => (FALLS.some(e => e.id === x) ? (x as FallId) : 'none');

/** A quiz's decoration and falling effect. Quizzes saved before the split kept snow, leaves or hearts in `effect`. */
export function effectsOf(q: { effect?: unknown; fall?: unknown } | null | undefined): { effect: EffectId; fall: FallId } {
  const fall = fallOf(q?.fall);
  return { effect: effectOf(q?.effect), fall: fall !== 'none' ? fall : fallOf(q?.effect) };
}
