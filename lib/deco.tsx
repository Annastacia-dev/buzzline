// Decorative shapes and sticker badges, all inline SVG (no image assets).
import type { CSSProperties, ReactNode } from 'react';

/** Closed path for a wavy circle: radius r, n bumps of depth amp. */
function wavyPath(n: number, amp: number, r = 44, cx = 50, cy = 50) {
  const pts: string[] = [];
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const rr = r + amp * Math.cos(n * t);
    pts.push(`${(cx + rr * Math.cos(t)).toFixed(2)},${(cy + rr * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

type ShapeProps = { size?: number | string; color: string; rotate?: number; style?: CSSProperties; className?: string; children?: ReactNode };

function ShapeBox({ size = 160, rotate = 0, style, className, children, path, color }: ShapeProps & { path: string }) {
  return (
    <div className={`shapebox ${className ?? ''}`} style={{ width: size, height: size, rotate: `${rotate}deg`, ...style }}>
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
        <path d={path} fill={color} />
      </svg>
      {children && <div style={{ position: 'relative', height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>}
    </div>
  );
}

/** Scalloped "flower" badge, like a rosette. */
export const Scallop = (p: ShapeProps & { bumps?: number }) => <ShapeBox {...p} path={wavyPath(p.bumps ?? 12, 3.2, 45)} />;
/** Soft four-lobed blob. */
export const Blob = (p: ShapeProps) => <ShapeBox {...p} path={wavyPath(4, 7, 40)} />;
/** Rounded square. */
export const Squircle = (p: ShapeProps) => <ShapeBox {...p} path="M50 4C86 4 96 14 96 50S86 96 50 96 4 86 4 50 14 4 50 4Z" />;

// ---------- outlined sticker icons (stroke = currentColor) ----------
const ICONS: Record<string, ReactNode> = {
  bolt: <path d="M54 14 28 54h20l-6 32 30-44H52z" />,
  star: <>
    <path d="M50 14l10 21 23 3-17 16 4 23-20-11-20 11 4-23-17-16 23-3z" />
    <circle cx="43" cy="44" r="1.6" fill="currentColor" /><circle cx="57" cy="44" r="1.6" fill="currentColor" />
    <path d="M44 52q6 6 12 0" />
  </>,
  smile: <><circle cx="50" cy="50" r="30" /><circle cx="40" cy="44" r="2" fill="currentColor" /><circle cx="60" cy="44" r="2" fill="currentColor" /><path d="M37 57q13 12 26 0" /></>,
  flame: <path d="M50 86c-15 0-24-10-24-23 0-14 12-20 14-34 7 5 10 12 10 19 4-3 6-8 6-13 9 7 18 17 18 29 0 13-9 22-24 22zm0 0c-6 0-10-4-10-10 0-6 5-9 7-15 6 4 13 9 13 16 0 5-4 9-10 9z" />,
  cursor: <><path d="M36 30l34 14-14 5 12 14-6 5-12-14-7 12z" /><path d="M26 22l-6-6M38 16l-1-8M22 36l-8-1" /></>,
  trophy: <><path d="M34 22h32v14c0 11-7 19-16 19s-16-8-16-19z" /><path d="M34 28H22c0 10 5 15 13 15M66 28h12c0 10-5 15-13 15M50 55v14M38 78h24M42 69h16v9H42z" /></>,
  sparkle: <path d="M50 18c3 18 8 24 26 32-18 8-23 14-26 32-3-18-8-24-26-32 18-8 23-14 26-32z" />,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, stroke = 6, style }: { name: IconName; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

/** Round sticker: pastel disc, white edge, text running round the rim, outlined icon in the middle. */
export function Sticker({ text, icon, bg, ink, size = 150, rotate = 0, style, className }: {
  text: string; icon: IconName; bg: string; ink: string; size?: number; rotate?: number; style?: CSSProperties; className?: string;
}) {
  const id = 'arc-' + text.replace(/\W+/g, '').toLowerCase();
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={`sticker ${className ?? ''}`}
      style={{ rotate: `${rotate}deg`, color: ink, ...style }} aria-label={text} role="img">
      <circle cx="100" cy="100" r="96" fill="#fff" />
      <circle cx="100" cy="100" r="88" fill={bg} />
      <defs><path id={id} d="M100 100m-64 0a64 64 0 1 1 128 0a64 64 0 1 1-128 0" /></defs>
      <text fontSize="21" fill={ink}><textPath href={`#${id}`} startOffset="0" textLength={398} lengthAdjust="spacing">{text}</textPath></text>
      <g transform="translate(64 64) scale(.72)" fill="none" stroke={ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon]}
      </g>
    </svg>
  );
}

/** Rectangular label sticker, e.g. "⚡ Fearless". */
export function Tag({ children, icon, bg, ink, rotate = 0, style }: { children: ReactNode; icon: IconName; bg: string; ink: string; rotate?: number; style?: CSSProperties }) {
  return (
    <span className="tag" style={{ background: bg, color: ink, rotate: `${rotate}deg`, ...style }}>
      <Icon name={icon} size={18} stroke={7} />{children}
    </span>
  );
}
