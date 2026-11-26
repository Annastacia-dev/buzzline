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
  toybox: {
    bg: '#f6e6ec', paper: '#fdfaf5', ink: '#3a3d6b', muted: '#7b7fa6', accent: '#7d6ad8',
    blobs: ['#f7bccb', '#a9e0cf'], pills: ['#f8dc8c', '#c9bff3', '#fdfaf5'], deck: ['#f8dc8c', '#c9bff3'],
    tiles: [['#c9bff3', '#3a3d6b'], ['#f7bccb', '#3a3d6b'], ['#a9e0cf', '#3a3d6b'], ['#f8dc8c', '#3a3d6b']],
  },
  glass: {
    bg: '#3b1e80', paper: '#5a3aa8', ink: '#ffffff', muted: '#d9ccff', accent: '#ffe2a3',
    blobs: ['#ff7a35', '#3f7dff'], pills: ['#ff3ea5', '#7a4fe0', '#5a3aa8'], deck: ['#ff3ea5', '#14c4ad'],
    tiles: [['#6b48c8', '#ffffff'], ['#6b48c8', '#ffffff'], ['#6b48c8', '#ffffff'], ['#6b48c8', '#ffffff']],
  },
  retro: {
    bg: '#e9e7e1', paper: '#f4f3f0', ink: '#14161f', muted: '#565a64', accent: '#1f4bb8',
    blobs: ['#c5d6f7', '#ffe79a'], pills: ['#ffe79a', '#c5d6f7', '#f4f3f0'], deck: ['#1f4bb8', '#d6d5d2'],
    tiles: [['#1f4bb8', '#ffffff'], ['#c62f3c', '#ffffff'], ['#f2c530', '#14161f'], ['#55c273', '#14161f']],
  },
  receipt: {
    bg: '#c9cbce', paper: '#fbfbfa', ink: '#27282b', muted: '#54575d', accent: '#b3272f',
    blobs: ['#dfe0e2', '#b4b7bb'], pills: ['#fbeaa0', '#f6c9d0', '#fbfbfa'], deck: ['#f3f3f1', '#e4e4e5'],
    tiles: [['#fcfcfb', '#27282b'], ['#f6c9d0', '#27282b'], ['#fbeaa0', '#27282b'], ['#c4dcf2', '#27282b']],
  },
  polaroid: {
    bg: '#d9c5a3', paper: '#fffdf8', ink: '#35291f', muted: '#64513d', accent: '#a33a26',
    blobs: ['#f6e3ad', '#c9dbe8'], pills: ['#f6e3ad', '#f3cfc6', '#fffdf8'], deck: ['#f7f0e0', '#efe4cc'],
    tiles: [['#c9dbe8', '#35291f'], ['#f3cfc6', '#35291f'], ['#cfe0c3', '#35291f'], ['#f6e3ad', '#35291f']],
  },
  messages: {
    bg: '#ffffff', paper: '#f1f1f4', ink: '#111114', muted: '#66666d', accent: '#0a6ee8',
    blobs: ['#d6e8ff', '#cdf2d6'], pills: ['#d6e8ff', '#e9e9ee', '#cdf2d6'], deck: ['#e9e9ee', '#d6e8ff'],
    tiles: [['#0a6ee8', '#ffffff'], ['#1f8a3d', '#ffffff'], ['#7a45dd', '#ffffff'], ['#d02a62', '#ffffff']],
  },
  comic: {
    bg: '#ffe066', paper: '#ffffff', ink: '#14110f', muted: '#544c40', accent: '#d8231b',
    blobs: ['#ffbf7a', '#7cc4ff'], pills: ['#ffffff', '#7cc4ff', '#ff9ab8'], deck: ['#7cc4ff', '#ff8a7a'],
    tiles: [['#d8291f', '#ffffff'], ['#1666c4', '#ffffff'], ['#ffd21f', '#14110f'], ['#15803a', '#ffffff']],
  },
  tarot: {
    bg: '#1c1438', paper: '#3a2568', ink: '#f6e6b8', muted: '#d3c5a0', accent: '#f0c65a',
    blobs: ['#4d3488', '#6b2c56'], pills: ['#3a2568', '#4d3488', '#5a2749'], deck: ['#4d3488', '#5a2749'],
    tiles: [['#2b4a94', '#ffffff'], ['#962a4a', '#ffffff'], ['#1f6b55', '#ffffff'], ['#93600f', '#ffffff']],
  },
  postcard: {
    bg: '#b9d0dc', paper: '#fffaf0', ink: '#24324f', muted: '#5d6578', accent: '#c23b32',
    blobs: ['#fffaf0', '#cddcf0'], pills: ['#fffaf0', '#f2cfc8', '#cddcf0'], deck: ['#f3ecdc', '#fffaf0'],
    tiles: [['#2b5aa8', '#ffffff'], ['#b8352d', '#ffffff'], ['#2f7a3e', '#ffffff'], ['#b97a12', '#ffffff']],
  },
  chalkboard: {
    bg: '#2c4a3b', paper: '#34543f', ink: '#f3f1e7', muted: '#b8c9bc', accent: '#f5dc6e',
    blobs: ['#3a5a46', '#335240'], pills: ['#3a5a46', '#4f5a34', '#35506a'], deck: ['#3a5a46', '#335240'],
    tiles: [['#35506a', '#f3f1e7'], ['#5a4148', '#f3f1e7'], ['#3d5e3f', '#f3f1e7'], ['#5a5530', '#f3f1e7']],
  },
  typewriter: {
    bg: '#f5eedb', paper: '#fbf6e8', ink: '#26221d', muted: '#6b6253', accent: '#b3261e',
    blobs: ['#ece2c6', '#efd2cc'], pills: ['#fbf6e8', '#efd2cc', '#d5dcea'], deck: ['#efe5cc', '#fbf6e8'],
    tiles: [['#26221d', '#fbf6e8'], ['#b3261e', '#ffffff'], ['#2c4a8a', '#ffffff'], ['#8a5a1c', '#ffffff']],
  },
  ticket: {
    bg: '#17112a', paper: '#fff4dc', ink: '#f8f1e4', muted: '#c9bedf', accent: '#ff4f8b',
    blobs: ['#3a1d4d', '#14304d'], pills: ['#fff4dc', '#ffd1e2', '#cfe9ff'], deck: ['#3a1d4d', '#14304d'],
    tiles: [['#ff4f8b', '#1d1530'], ['#3fb8ff', '#1d1530'], ['#b6f24a', '#1d1530'], ['#ffb02e', '#1d1530']],
  },
  recipe: {
    bg: '#fbf5ec', paper: '#fffdf6', ink: '#2b2420', muted: '#6e6258', accent: '#d9534f',
    blobs: ['#f6d3cf', '#d3e0f2'], pills: ['#fffdf6', '#f6d3cf', '#d6e6c9'], deck: ['#f6efe2', '#fffdf6'],
    tiles: [['#d9483b', '#ffffff'], ['#3d5fa8', '#ffffff'], ['#3f8a4a', '#ffffff'], ['#d49a14', '#ffffff']],
  },
  christmas: {
    bg: '#8f1d22', paper: '#fff8ec', ink: '#fff3e0', muted: '#f3d9c8', accent: '#ffd36b',
    blobs: ['#a8262c', '#7a1519'], pills: ['#fff8ec', '#cfe3d2', '#f7e3a8'], deck: ['#a8262c', '#7a1519'],
    tiles: [['#c8202c', '#ffffff'], ['#1f6b3a', '#ffffff'], ['#2a5ba8', '#ffffff'], ['#c8901c', '#ffffff']],
  },
  fall: {
    bg: '#efd4a8', paper: '#fdf4e3', ink: '#3b2416', muted: '#77604a', accent: '#d0611f',
    blobs: ['#f3cdb9', '#f6dfa4'], pills: ['#fdf4e3', '#f6d3ae', '#dfe3bf'], deck: ['#f4e4c6', '#fdf4e3'],
    tiles: [['#d0611f', '#ffffff'], ['#9c3220', '#ffffff'], ['#6f7a2e', '#ffffff'], ['#c99016', '#ffffff']],
  },
  easter: {
    bg: '#e4f3ea', paper: '#ffffff', ink: '#3c3350', muted: '#7a7290', accent: '#8e6fd6',
    blobs: ['#fcd9e3', '#d7e8fb'], pills: ['#ffffff', '#fcd9e3', '#e6dcfa'], deck: ['#f6f2fd', '#ffffff'],
    tiles: [['#f7a8bf', '#3c3350'], ['#9fc8f2', '#3c3350'], ['#b5e09c', '#3c3350'], ['#ffd76a', '#3c3350']],
  },
  valentine: {
    bg: '#ffe1e9', paper: '#fffafb', ink: '#5a1530', muted: '#9a5a72', accent: '#e23d6d',
    blobs: ['#ffc2d4', '#ead8f8'], pills: ['#fffafb', '#ffd3df', '#ead8f8'], deck: ['#ffeef3', '#fffafb'],
    tiles: [['#ffc2d4', '#b0174a'], ['#dcc6f6', '#b0174a'], ['#c4efd8', '#b0174a'], ['#ffe2a6', '#b0174a']],
  },
  music: {
    bg: '#1d1828', paper: '#fbf3e4', ink: '#f6eedf', muted: '#cfc4dc', accent: '#f2b43a',
    blobs: ['#2e2540', '#3a2a22'], pills: ['#fbf3e4', '#f7d4cc', '#d3e1f4'], deck: ['#2e2540', '#3a2a22'],
    tiles: [['#e8553d', '#ffffff'], ['#2f7fd1', '#ffffff'], ['#e3a21c', '#ffffff'], ['#2f9a6a', '#ffffff']],
  },
  sports: {
    bg: '#2f8f46', paper: '#ffffff', ink: '#ffffff', muted: '#e6f4ea', accent: '#ffd23f',
    blobs: ['#2a8240', '#3aa053'], pills: ['#ffffff', '#fff1b8', '#d6e2fb'], deck: ['#2a8240', '#3aa053'],
    tiles: [['#d7263d', '#ffffff'], ['#1b4fd8', '#ffffff'], ['#c77d00', '#ffffff'], ['#13915a', '#ffffff']],
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
