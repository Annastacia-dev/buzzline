// Shared pieces for the social share images (Open Graph / X cards), rendered by next/og at build time.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { SHAPE_PATHS } from './shapes';
import type { ThemeId } from './themes';

export const OG_SIZE = { width: 1200, height: 630 };

export const C = {
  bg: '#fbf6ec', paper: '#ffffff', ink: '#161616', muted: '#5f5a52',
  butter: '#fbe18a', lilac: '#d4cdf8', pink: '#f7bddf', pinkInk: '#c2177c', sage: '#bfdc94',
  tiles: [['#d4cdf8', '#4d2fa3'], ['#f7bddf', '#c2177c'], ['#bfdc94', '#2d6a28'], ['#fbe18a', '#a4560a']] as const,
};

// Read once when the module loads (literal paths keep file tracing to just these files).
const assets = Promise.all([
  readFile(join(process.cwd(), 'assets/fonts/BricolageGrotesque-ExtraBold.ttf')),
  readFile(join(process.cwd(), 'assets/fonts/DMSans-Medium.ttf')),
  readFile(join(process.cwd(), 'assets/fonts/DMSans-Bold.ttf')),
  readFile(join(process.cwd(), 'public/brand/buzzline-mark-flat.svg')),
]);

/** The brand fonts (static TTFs: next/og can't read the site's woff2 files) and the logo mark. */
export async function ogAssets() {
  const [display, medium, bold, mark] = await assets;
  return {
    mark: `data:image/svg+xml;base64,${mark.toString('base64')}`,
    fonts: [
      { name: 'Bricolage', data: display, weight: 800 as const, style: 'normal' as const },
      { name: 'DM Sans', data: medium, weight: 500 as const, style: 'normal' as const },
      { name: 'DM Sans', data: bold, weight: 700 as const, style: 'normal' as const },
    ],
  };
}

/** An answer shape, drawn as a tiny SVG image (inline <svg> gets squashed by the image renderer). */
export function ShapeIcon({ i, color, size = 30 }: { i: number; color: string; size?: number }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${SHAPE_PATHS[i]}" fill="${color}"/></svg>`;
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`} width={size} height={size} style={{ flexShrink: 0, width: size, height: size, minWidth: size, minHeight: size }} />;
}

/** Share-image colours for each quiz theme (the same values as the theme's CSS variables). */
export type OgPalette = {
  bg: string; paper: string; ink: string; muted: string; accent: string;
  blobs: readonly [string, string]; pills: readonly [string, string, string]; deck: readonly [string, string];
  /** answer-tile [fill, text] pairs, in answer order */
  tiles: readonly (readonly [string, string])[];
};
export const PALETTES: Record<ThemeId, OgPalette> = {
  classic: {
    bg: C.bg, paper: C.paper, ink: C.ink, muted: C.muted, accent: C.pinkInk,
    blobs: [C.pink, C.sage], pills: [C.butter, C.lilac, C.paper], deck: [C.butter, C.lilac], tiles: C.tiles.map(([fill]) => [fill, C.ink] as const),
  },
  doodlebug: {
    bg: '#f2e9d6', paper: '#fbf6ea', ink: '#1f3fb9', muted: '#5a68a6', accent: '#1f3fb9',
    blobs: ['#cdd6f5', '#e9dcbd'], pills: ['#e9dcbd', '#cdd6f5', '#fbf6ea'], deck: ['#e9dcbd', '#cdd6f5'],
    tiles: [['#1f3fb9', '#fbf6ea'], ['#fbf6ea', '#1f3fb9'], ['#cdd6f5', '#1f3fb9'], ['#e9dcbd', '#1f3fb9']],
  },
  glass: {
    bg: '#eef0fb', paper: '#ffffff', ink: '#1d1b3a', muted: '#5d5b7a', accent: '#7c3aed',
    blobs: ['#ffc6e6', '#bfe6ff'], pills: ['#e4e0ff', '#d4f3ea', '#ffffff'], deck: ['#e4e0ff', '#ffe0f0'],
    tiles: [['#e4dcff', '#5b21b6'], ['#ffd9ec', '#be185d'], ['#d1f3ec', '#0f766e'], ['#ffecc7', '#b45309']],
  },
  inkblot: {
    bg: '#f4f4f2', paper: '#ffffff', ink: '#111111', muted: '#6b6b6b', accent: '#111111',
    blobs: ['#e4e4e2', '#ececea'], pills: ['#ececea', '#e2e2e0', '#ffffff'], deck: ['#ececea', '#e2e2e0'],
    tiles: [['#111111', '#ffffff'], ['#ffffff', '#111111'], ['#e2e2e0', '#111111'], ['#ececea', '#111111']],
  },
};

/** Logo, headline and pills on the left; an illustration on the right. */
export function OgFrame({ mark, title, accent, subtitle, pills, children, p = PALETTES.classic }: {
  mark: string; title: string; accent?: string; subtitle: string; pills: string[]; children: ReactNode; p?: OgPalette;
}) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: p.bg, fontFamily: 'DM Sans', color: p.ink, padding: '56px 0 56px 72px', position: 'relative', overflow: 'hidden' }}>
      {/* soft blobs */}
      <div style={{ position: 'absolute', right: -120, top: -140, width: 520, height: 520, borderRadius: 999, background: p.blobs[0], opacity: 0.45 }} />
      <div style={{ position: 'absolute', right: 300, bottom: -200, width: 380, height: 380, borderRadius: 999, background: p.blobs[1], opacity: 0.45 }} />

      <div style={{ display: 'flex', flexDirection: 'column', width: 600, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={mark} width={64} height={64} />
          <div style={{ display: 'flex', alignItems: 'flex-end', fontFamily: 'Bricolage', fontSize: 44, letterSpacing: -1.6 }}>
            Buzzline<div style={{ width: 14, height: 14, borderRadius: 99, background: p.accent, margin: '0 0 10px 4px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Bricolage', fontSize: 74, lineHeight: 1.02, letterSpacing: -2.6 }}>
            <span>{title}</span>{accent && <span style={{ color: p.accent }}>{accent}</span>}
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, color: p.muted, fontWeight: 500 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pills.map((label, i) => (
            <div key={label} style={{ display: 'flex', flexShrink: 0, padding: '9px 18px', borderRadius: 999, border: `2.5px solid ${p.ink}`, background: p.pills[i % 3], fontSize: 21, fontWeight: 700 }}>{label}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>{children}</div>
    </div>
  );
}

/** A tilted flashcard with a little deck behind it, as in the quiz studio. */
export function Deck({ children, width = 440, height = 400, p = PALETTES.classic }: { children: ReactNode; width?: number; height?: number; p?: OgPalette }) {
  const card = { position: 'absolute' as const, width, height, borderRadius: 34, border: `4px solid ${p.ink}` };
  return (
    <div style={{ display: 'flex', position: 'relative', width: width + 40, height: height + 40, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...card, background: p.deck[0], transform: 'rotate(7deg) translate(14px, 8px)' }} />
      <div style={{ ...card, background: p.deck[1], transform: 'rotate(-4deg) translate(-10px, 10px)' }} />
      <div style={{ ...card, display: 'flex', flexDirection: 'column', background: p.paper, transform: 'rotate(-2.5deg)', boxShadow: `10px 10px 0 ${p.ink}`, padding: 28, gap: 18 }}>
        {children}
      </div>
    </div>
  );
}
