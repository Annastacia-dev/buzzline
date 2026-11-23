// Line illustrations for the illustrated quiz themes, as inline SVG inked in currentColor.
// Every theme draws the same set of names in its own style:
// - Doodlebug: pen sketches with a bee mascot, wobbled by a displacement filter.
// - Inkblot: bold black line art with solid black accents on flat grey circles, and a buzzer mascot.
import { useId, type CSSProperties, type ReactNode } from 'react';
import type { ThemeId } from './themes';

const ink = { fill: 'none', stroke: 'currentColor', strokeWidth: 3.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const PAPER = 'var(--paper)', TINT = 'var(--sage)', SAND = 'var(--butter)';

/** A five-point star around (cx, cy), slightly uneven so it reads as drawn by hand. */
function star(cx: number, cy: number, R: number) {
  const wobble = [1, .94, 1.04, .97, 1.02];
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? R * 0.46 : R * wobble[i / 2];
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join('L')}Z`;
}

/** A four-point sparkle. */
const sparkle = (x: number, y: number, s: number) => `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

type Art = { box: [number, number, number, number]; art: ReactNode };
export type DoodleName = 'mascot' | 'bulb' | 'stopwatch' | 'trophy' | 'question' | 'cloud' | 'star' | 'arrow' | 'squiggle' | 'sparkles';

const DOODLES: Record<DoodleName, Art> = {
  /** The Doodlebug mascot: a round little bee, mid-buzz. */
  mascot: {
    box: [0, 30, 200, 140],
    art: <>
      <path {...ink} fill={PAPER} fillOpacity={0.85} d="M104 74C88 40 108 22 124 34C136 44 128 66 112 76" />
      <path {...ink} fill={PAPER} fillOpacity={0.85} d="M122 72C124 38 154 30 162 48C168 64 146 78 128 78" />
      <path {...ink} fill={SAND} d="M78 98C80 72 112 62 138 66C166 70 182 92 176 114C170 138 140 148 112 144C88 140 76 122 78 98Z" />
      <path {...ink} strokeWidth={9} d="M114 69C105 92 105 120 112 142M142 68C133 92 133 120 140 144" />
      <path {...ink} strokeWidth={6} d="M166 79C161 96 161 117 166 131" />
      <path {...ink} d="M176 108L192 104L177 118" />
      <path {...ink} d="M104 143l-6 12M124 146l-2 13M146 141l4 12" />
      <circle {...ink} fill={PAPER} cx="66" cy="104" r="28" />
      <circle cx="49" cy="109" r="4.5" fill={TINT} />
      <circle cx="56" cy="98" r="3.8" fill="currentColor" /><circle cx="75" cy="96" r="3.8" fill="currentColor" />
      <path {...ink} d="M56 112Q66 121 77 110" />
      <path {...ink} d="M56 78C52 62 44 54 34 52M72 77C76 60 84 52 94 50" />
      <circle cx="32" cy="51" r="4.6" fill="currentColor" /><circle cx="96" cy="49" r="4.6" fill="currentColor" />
      <path {...ink} d="M186 136l10 4M180 148l12 6" />
    </>,
  },
  bulb: {
    box: [-20, -20, 160, 180],
    art: <>
      <path {...ink} fill={PAPER} d="M60 14C32 14 16 36 18 60C20 80 34 90 38 106L82 106C86 90 100 80 102 60C104 36 88 14 60 14Z" />
      <path {...ink} d="M46 100C46 80 52 72 56 84C58 72 64 72 66 84C70 72 74 80 74 100" />
      <path {...ink} d="M34 46C36 36 42 30 50 28" />
      <path {...ink} fill={SAND} d="M38 106H82L80 132C70 136 50 136 40 132Z" />
      <path {...ink} d="M40 118C52 121 68 121 80 118M50 142H70" />
      <path {...ink} d="M60 2V-10M10 18L0 8M110 18L120 8M2 62H-10M118 62H130" />
    </>,
  },
  stopwatch: {
    box: [-6, 10, 160, 150],
    art: <>
      <path {...ink} d="M60 24H82M71 24V40M110 44L120 34" />
      <circle {...ink} fill={PAPER} cx="71" cy="92" r="52" />
      <path {...ink} d="M71 46V55M117 92H108M71 138V129M25 92H34" />
      <path {...ink} d="M71 92V62M71 92L93 104" />
      <circle cx="71" cy="92" r="4.5" fill="currentColor" />
      <path {...ink} d="M2 72H14M-2 94H12M2 116H14" />
    </>,
  },
  trophy: {
    box: [0, 0, 160, 165],
    art: <>
      <path {...ink} d="M44 38C20 38 20 76 48 80M116 38C140 38 140 76 112 80" />
      <path {...ink} fill={SAND} d="M44 24H116V58C116 90 98 106 80 106C62 106 44 90 44 58Z" />
      <path {...ink} fill={PAPER} d={star(80, 60, 15)} />
      <path {...ink} d="M80 106V128M68 128H92" />
      <path {...ink} fill={PAPER} d="M54 128H106L110 150H50Z" />
      <path {...ink} strokeWidth={2.6} fill={PAPER} d={sparkle(20, 20, 10)} />
      <path {...ink} strokeWidth={2.6} fill={PAPER} d={sparkle(144, 108, 9)} />
      <path {...ink} d="M140 14l6-6M150 26h8" />
    </>,
  },
  question: {
    box: [10, 4, 145, 132],
    art: <>
      <path {...ink} fill={PAPER} d="M20 56C20 26 46 12 82 12C120 12 142 28 142 56C142 84 118 98 86 98L62 124L66 96C38 92 20 80 20 56Z" />
      <path {...ink} strokeWidth={5} d="M68 42C68 26 98 26 98 44C98 56 82 58 82 72" />
      <circle cx="82" cy="84" r="4.6" fill="currentColor" />
    </>,
  },
  cloud: {
    box: [8, 20, 160, 130],
    art: <>
      <path {...ink} fill={PAPER} d="M40 92C18 92 16 62 40 62C40 36 76 28 88 50C98 30 136 34 134 62C156 60 160 92 138 92Z" />
      <circle cx="72" cy="72" r="3.4" fill="currentColor" /><circle cx="100" cy="72" r="3.4" fill="currentColor" />
      <path {...ink} d="M77 85Q86 79 95 85" />
      <path {...ink} d="M54 106l-6 14M84 106l-6 14M114 106l-6 14M70 128l-5 12M100 128l-5 12" />
    </>,
  },
  star: {
    box: [0, 0, 130, 130],
    art: <>
      <path {...ink} fill={SAND} d={star(64, 68, 54)} />
      <circle cx="54" cy="66" r="3.4" fill="currentColor" /><circle cx="74" cy="66" r="3.4" fill="currentColor" />
      <path {...ink} d="M56 78Q64 85 72 78" />
      <path {...ink} strokeWidth={2.6} fill={PAPER} d={sparkle(116, 18, 9)} />
      <path {...ink} d="M10 20l8 6M6 36h10" />
    </>,
  },
  arrow: {
    box: [0, 10, 180, 100],
    art: <>
      <path {...ink} d="M10 90C30 30 90 20 86 58C84 80 56 76 62 56C70 30 120 24 166 46" />
      <path {...ink} d="M150 30L168 46L148 58" />
    </>,
  },
  squiggle: {
    box: [0, 0, 200, 30],
    art: <path {...ink} d="M4 18C20 2 32 30 48 16S76 2 92 16S120 30 136 16S164 2 180 16S194 24 197 18" />,
  },
  sparkles: {
    box: [0, 0, 100, 100],
    art: <>
      <path {...ink} fill={PAPER} d={sparkle(40, 46, 26)} />
      <path {...ink} strokeWidth={3} fill={TINT} d={sparkle(78, 20, 12)} />
      <path {...ink} strokeWidth={3} fill={PAPER} d={sparkle(80, 78, 9)} />
    </>,
  },
};

// ---------- Inkblot: bold black line art, solid black accents, a flat grey circle behind each ----------
const bold = { ...ink, strokeWidth: 4.2 } as const;
const DISC = 'var(--disc, #e4e4e2)', SOLID = 'currentColor';
const onInk = { fill: 'none', stroke: PAPER, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const drop = (x: number, y: number) => `M${x} ${y}c-4 7-6 10-6 13a6 6 0 0 0 12 0c0-3-2-6-6-13z`;

const INKS: Record<DoodleName, Art> = {
  /** The Inkblot mascot: a big quiz buzzer with a face. */
  mascot: {
    box: [10, 20, 190, 150],
    art: <>
      <circle cx="126" cy="108" r="56" fill={DISC} />
      <path {...bold} d="M70 150v10h-9M130 150v10h9" />
      <path {...bold} fill={PAPER} d="M40 114H160L152 150H48Z" />
      <path {...bold} d="M56 130H144" />
      <path {...bold} fill={PAPER} d="M46 114C46 100 154 100 154 114C154 124 46 124 46 114Z" />
      <path {...bold} fill={SOLID} d="M64 110C64 62 136 62 136 110Z" />
      <path {...onInk} strokeWidth={5} d="M78 88C80 79 87 73 95 71" />
      <circle cx="89" cy="93" r="4.6" fill={PAPER} /><circle cx="112" cy="93" r="4.6" fill={PAPER} />
      <path {...onInk} strokeWidth={3.6} d="M92 102Q100 108 109 102" />
      <path {...bold} d="M38 70L26 58M162 70L174 58M100 52V38" />
      <path fill={SOLID} d={sparkle(30, 34, 11)} /><path fill={SOLID} d={sparkle(174, 32, 7)} />
    </>,
  },
  bulb: {
    box: [-20, -20, 160, 180],
    art: <>
      <circle cx="78" cy="78" r="50" fill={DISC} />
      <path {...bold} fill={PAPER} d="M60 14C32 14 16 36 18 60C20 80 34 90 38 106L82 106C86 90 100 80 102 60C104 36 88 14 60 14Z" />
      <path {...bold} d="M46 100C46 80 52 72 56 84C58 72 64 72 66 84C70 72 74 80 74 100" />
      <path {...bold} fill={SOLID} d="M38 106H82L80 132C70 136 50 136 40 132Z" />
      <path {...bold} d="M50 144H70" />
      <path {...bold} d="M60 2V-10M10 18L0 8M110 18L120 8M2 62H-10M118 62H130" />
    </>,
  },
  stopwatch: {
    box: [-6, 10, 160, 150],
    art: <>
      <circle cx="98" cy="112" r="48" fill={DISC} />
      <path {...bold} d="M71 24V40M110 44L120 34" />
      <rect x="58" y="16" width="26" height="10" rx="4" fill={SOLID} />
      <circle {...bold} fill={PAPER} cx="71" cy="92" r="52" />
      <path fill={SOLID} d="M71 92V46A46 46 0 0 1 117 92Z" />
      <path {...bold} d="M71 138V129M25 92H34" />
      <circle cx="71" cy="92" r="5" fill={SOLID} />
      <path {...bold} d="M2 72H14M-2 94H12M2 116H14" />
    </>,
  },
  trophy: {
    box: [0, 0, 160, 165],
    art: <>
      <circle cx="104" cy="96" r="52" fill={DISC} />
      <path {...bold} d="M44 38C20 38 20 76 48 80M116 38C140 38 140 76 112 80" />
      <path {...bold} fill={SOLID} d="M44 24H116V58C116 90 98 106 80 106C62 106 44 90 44 58Z" />
      <path fill={PAPER} d={star(80, 60, 15)} />
      <path {...bold} d="M80 106V128M68 128H92" />
      <path {...bold} fill={PAPER} d="M54 128H106L110 150H50Z" />
      <path fill={SOLID} d={sparkle(20, 22, 11)} /><path fill={SOLID} d={sparkle(146, 112, 8)} />
    </>,
  },
  question: {
    box: [10, 4, 145, 132],
    art: <>
      <circle cx="104" cy="74" r="46" fill={DISC} />
      <path {...bold} fill={SOLID} d="M20 56C20 26 46 12 82 12C120 12 142 28 142 56C142 84 118 98 86 98L62 124L66 96C38 92 20 80 20 56Z" />
      <path {...onInk} strokeWidth={6} d="M68 42C68 26 98 26 98 44C98 56 82 58 82 70" />
      <circle cx="82" cy="83" r="5" fill={PAPER} />
    </>,
  },
  cloud: {
    box: [8, 20, 160, 130],
    art: <>
      <circle cx="112" cy="86" r="44" fill={DISC} />
      <path {...bold} fill={PAPER} d="M40 92C18 92 16 62 40 62C40 36 76 28 88 50C98 30 136 34 134 62C156 60 160 92 138 92Z" />
      <circle cx="72" cy="72" r="3.8" fill={SOLID} /><circle cx="100" cy="72" r="3.8" fill={SOLID} />
      <path {...bold} d="M77 85Q86 79 95 85" />
      <path fill={SOLID} d={drop(54, 104) + drop(84, 104) + drop(114, 104) + drop(70, 124) + drop(100, 124)} />
    </>,
  },
  star: {
    box: [0, 0, 130, 130],
    art: <>
      <circle cx="80" cy="84" r="40" fill={DISC} />
      <path {...bold} fill={SOLID} d={star(64, 68, 54)} />
      <circle cx="54" cy="66" r="3.8" fill={PAPER} /><circle cx="74" cy="66" r="3.8" fill={PAPER} />
      <path {...onInk} strokeWidth={3.6} d="M56 78Q64 85 72 78" />
      <path fill={SOLID} d={sparkle(116, 18, 10)} />
    </>,
  },
  arrow: {
    box: [0, 10, 180, 100],
    art: <>
      <path {...bold} d="M10 90C30 30 90 20 86 58C84 80 56 76 62 56C70 30 120 24 160 42" />
      <path fill={SOLID} stroke="currentColor" strokeWidth={3} strokeLinejoin="round" d="M148 26L172 46L146 58Z" />
    </>,
  },
  squiggle: { box: [0, 0, 200, 30], art: <path {...bold} d="M4 18C20 2 32 30 48 16S76 2 92 16S120 30 136 16S164 2 180 16S194 24 197 18" /> },
  sparkles: {
    box: [0, 0, 100, 100],
    art: <>
      <path fill={SOLID} d={sparkle(40, 46, 28)} />
      <path fill={SOLID} d={sparkle(80, 18, 12)} />
      <path fill={SOLID} d={sparkle(82, 80, 9)} />
    </>,
  },
};

/** One illustration in the given theme's style, `size` px wide. Decorative unless given a label. Classic has none. */
export function Doodle({ theme, name, size = 120, rotate = 0, className = '', style, label }: {
  theme: ThemeId; name: DoodleName; size?: number; rotate?: number; className?: string; style?: CSSProperties; label?: string;
}) {
  const id = 'wob' + useId().replace(/[^\w-]/g, '');
  if (theme === 'classic') return null;
  const sketch = theme === 'doodlebug';
  const { box, art } = (sketch ? DOODLES : INKS)[name];
  return (
    <svg viewBox={box.join(' ')} width={size} height={(size * box[3]) / box[2]} className={`doodle ${className}`}
      style={{ rotate: rotate ? `${rotate}deg` : undefined, ...style }} overflow="visible"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      {sketch ? <>
        <defs>
          <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="2.6" />
          </filter>
        </defs>
        <g filter={`url(#${id})`}>{art}</g>
      </> : art}
    </svg>
  );
}
