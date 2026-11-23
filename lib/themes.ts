// Quiz themes. A quiz carries its theme id; the host screen, players' phones and the studio preview
// set it as data-theme, and globals.css restyles everything under that attribute.

export const THEMES = [
  { id: 'classic', name: 'Classic', blurb: 'Pastel blocks, black pills and stickers', swatch: ['#fbf6ec', '#161616', '#f7bddf', '#fbe18a'] },
  { id: 'doodlebug', name: 'Doodlebug', blurb: 'Blue ink on beige paper, handwriting and doodles', swatch: ['#f2e9d6', '#1f3fb9', '#cdd6f5', '#fbf6ea'] },
  { id: 'inkblot', name: 'Inkblot', blurb: 'Black and white line art, bold type, solid ink accents', swatch: ['#ffffff', '#111111', '#e4e4e2', '#111111'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: ThemeId = 'classic';

/** Any stored or posted value → a known theme id (unknown or missing means the default). */
export const themeOf = (v: unknown): ThemeId => (THEMES.some(t => t.id === v) ? (v as ThemeId) : DEFAULT_THEME);

/** The ink colour for things drawn outside CSS, such as the lobby QR code. */
export const themeInk = (t: ThemeId) => (t === 'doodlebug' ? '#1f3fb9' : t === 'inkblot' ? '#111111' : '#161616');
