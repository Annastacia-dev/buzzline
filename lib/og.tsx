// Shared pieces for the social share images (Open Graph / X cards), rendered by next/og at build time.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { SHAPE_PATHS } from './shapes';

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

/** Logo, headline and pills on the left; an illustration on the right. */
export function OgFrame({ mark, title, accent, subtitle, pills, children }: {
  mark: string; title: string; accent?: string; subtitle: string; pills: string[]; children: ReactNode;
}) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: C.bg, fontFamily: 'DM Sans', color: C.ink, padding: '56px 0 56px 72px', position: 'relative', overflow: 'hidden' }}>
      {/* soft blobs */}
      <div style={{ position: 'absolute', right: -120, top: -140, width: 520, height: 520, borderRadius: 999, background: C.pink, opacity: 0.45 }} />
      <div style={{ position: 'absolute', right: 300, bottom: -200, width: 380, height: 380, borderRadius: 999, background: C.sage, opacity: 0.45 }} />

      <div style={{ display: 'flex', flexDirection: 'column', width: 600, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={mark} width={64} height={64} />
          <div style={{ display: 'flex', alignItems: 'flex-end', fontFamily: 'Bricolage', fontSize: 44, letterSpacing: -1.6 }}>
            Buzzline<div style={{ width: 14, height: 14, borderRadius: 99, background: C.pinkInk, margin: '0 0 10px 4px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Bricolage', fontSize: 74, lineHeight: 1.02, letterSpacing: -2.6 }}>
            <span>{title}</span>{accent && <span style={{ color: C.pinkInk }}>{accent}</span>}
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, color: C.muted, fontWeight: 500 }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pills.map((p, i) => (
            <div key={p} style={{ display: 'flex', flexShrink: 0, padding: '9px 18px', borderRadius: 999, border: `2.5px solid ${C.ink}`, background: [C.butter, C.lilac, C.paper][i % 3], fontSize: 21, fontWeight: 700 }}>{p}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>{children}</div>
    </div>
  );
}

/** A tilted flashcard with a little deck behind it, as in the quiz studio. */
export function Deck({ children, width = 440, height = 400 }: { children: ReactNode; width?: number; height?: number }) {
  const card = { position: 'absolute' as const, width, height, borderRadius: 34, border: `4px solid ${C.ink}` };
  return (
    <div style={{ display: 'flex', position: 'relative', width: width + 40, height: height + 40, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...card, background: C.butter, transform: 'rotate(7deg) translate(14px, 8px)' }} />
      <div style={{ ...card, background: C.lilac, transform: 'rotate(-4deg) translate(-10px, 10px)' }} />
      <div style={{ ...card, display: 'flex', flexDirection: 'column', background: C.paper, transform: 'rotate(-2.5deg)', boxShadow: `10px 10px 0 ${C.ink}`, padding: 28, gap: 18 }}>
        {children}
      </div>
    </div>
  );
}
