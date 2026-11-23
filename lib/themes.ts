// Quiz themes. A quiz carries its theme id; the host screen, players' phones and the studio preview
// set it as data-theme, and globals.css restyles everything under that attribute.

export const THEMES = [
  { id: 'classic', name: 'Classic', blurb: 'Pastel blocks, black pills and stickers', swatch: ['#fbf6ec', '#161616', '#f7bddf', '#fbe18a'] },
  { id: 'doodlebug', name: 'Doodlebug', blurb: 'Blue ink on beige paper, handwriting and doodles', swatch: ['#f2e9d6', '#1f3fb9', '#cdd6f5', '#fbf6ea'] },
  { id: 'inkblot', name: 'Inkblot', blurb: 'Black and white line art, bold type, solid ink accents', swatch: ['#ffffff', '#111111', '#e4e4e2', '#111111'] },
  { id: 'toybox', name: 'Toybox', blurb: 'Chunky 3D blocks that press down, with glossy light and deep edges', swatch: ['#dfe9ff', '#3b6cf6', '#ff5c8a', '#ffb020'] },
  { id: 'glass', name: 'Glass', blurb: 'Thick clear glass with bright rims and soft coloured glows', swatch: ['#eceef1', '#c4b8ff', '#a9e6d4', '#ffc9b5'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: ThemeId = 'classic';

/** Any stored or posted value → a known theme id (unknown or missing means the default). */
export const themeOf = (v: unknown): ThemeId => (THEMES.some(t => t.id === v) ? (v as ThemeId) : DEFAULT_THEME);

/** The ink colour for things drawn outside CSS, such as the lobby QR code. */
export const themeInk = (t: ThemeId) => (t === 'doodlebug' ? '#1f3fb9' : t === 'inkblot' ? '#111111' : t === 'glass' ? '#17171d' : t === 'toybox' ? '#1e2a5a' : '#161616');

/** Themes with their own line drawings in lib/doodles.tsx (the others decorate with shapes or colour). */
export const hasDoodles = (t: ThemeId) => t === 'doodlebug' || t === 'inkblot';
