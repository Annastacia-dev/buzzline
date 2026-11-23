// "Grid reveal" pictures: the image starts hidden behind a grid of tiles that clear one by one
// while the question runs, so players guess what it is before they can see all of it.

export const REVEAL_COLS = 5;
export const REVEAL_ROWS = 4;
const N = REVEAL_COLS * REVEAL_ROWS;

/** The order the tiles clear in: a fixed shuffle from `seed`, so re-renders and reloads agree. */
function clearOrder(seed: number) {
  let s = (seed >>> 0) || 1;
  const rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const order = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order;
}

/**
 * How many tiles are cleared `progress` (0…1) of the way through the question. One is open from the start and
 * the last one goes only when time runs out, so the whole picture is never on show while answers are open.
 */
export const clearedAt = (progress: number) => Math.min(N, 1 + Math.floor(Math.max(0, progress) * (N - 1)));

/** A seed for one question of one game, so each question (and each game) clears in its own order. */
export const revealSeed = (key: string, qIndex: number) => [...key].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261 + qIndex * 7919);

export function GridReveal({ src, cleared, seed, size, alt = '' }: {
  src: string; cleared: number; seed: number; size: 'stage' | 'preview'; alt?: string;
}) {
  const order = clearOrder(seed);
  const open = new Set(order.slice(0, cleared));
  return (
    <div className={`reveal reveal-${size}`} role="img" aria-label={alt || `Picture, ${cleared} of ${N} tiles uncovered`}>
      <img src={src} alt="" draggable={false} />
      <div className="reveal-grid" aria-hidden style={{ gridTemplateColumns: `repeat(${REVEAL_COLS}, 1fr)`, gridTemplateRows: `repeat(${REVEAL_ROWS}, 1fr)` }}>
        {Array.from({ length: N }, (_, k) => (
          <div key={k} className={`reveal-tile c${(k + Math.floor(k / REVEAL_COLS)) % 4} ${open.has(k) ? 'off' : ''}`}><span>?</span></div>
        ))}
      </div>
    </div>
  );
}
