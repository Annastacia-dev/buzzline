// The seasonal effects a quiz can use (drawn by lib/effects.tsx). Plain data, safe for the server.
export const EFFECTS = [
  { id: 'none', name: 'No effect', icon: '—', hint: 'Just the theme' },
  { id: 'snow', name: 'Snow', icon: '❄️', hint: 'Gentle snowfall on every screen' },
  { id: 'lights', name: 'Christmas lights', icon: '🎄', hint: 'A string of twinkling bulbs along the top' },
  { id: 'fireworks', name: 'Fireworks', icon: '🎆', hint: 'Bursts of colour, for New Year' },
  { id: 'leaves', name: 'Autumn leaves', icon: '🍂', hint: 'Falling leaves in warm colours' },
  { id: 'hearts', name: 'Hearts', icon: '💕', hint: 'Floating hearts, for Valentine’s Day' },
] as const;

export type EffectId = (typeof EFFECTS)[number]['id'];
export const effectOf = (x: unknown): EffectId => (EFFECTS.some(e => e.id === x) ? (x as EffectId) : 'none');
