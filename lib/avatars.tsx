// Player avatars: a critter on a pastel disc. The index is what's stored (buzz_players.avatar).
export const AVATARS = [
  '🦊', '🐼', '🐸', '🦄', '🐙', '🐝', '🦁', '🐯',
  '🐨', '🐵', '🐧', '🦉', '🐢', '🐳', '🦖', '🐱',
  '🐶', '🐰', '🦔', '🐞', '🦩', '🐌', '🐲', '👾',
] as const;

const BG = ['var(--lilac)', 'var(--pink)', 'var(--sage)', 'var(--peach)', 'var(--mint)', 'var(--butter)'];

export const avatarCount = AVATARS.length;
export const validAvatar = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < AVATARS.length;

export function Avatar({ i, size = 40, className = '', style }: { i: number; size?: number; className?: string; style?: React.CSSProperties }) {
  const n = validAvatar(i) ? i : 0;
  return (
    <span className={`avatar ${className}`} aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.58, background: BG[n % BG.length], ...style }}>
      {AVATARS[n]}
    </span>
  );
}
