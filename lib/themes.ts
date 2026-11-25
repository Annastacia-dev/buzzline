// Quiz themes. A quiz carries its theme id; the host screen, players' phones and the studio preview
// set it as data-theme, and globals.css restyles everything under that attribute.

export const THEMES = [
  { id: 'classic', name: 'Classic', blurb: 'Pastel blocks, black pills and stickers', swatch: ['#fbf6ec', '#161616', '#f7bddf', '#fbe18a'] },
  { id: 'doodlebug', name: 'Doodlebug', blurb: 'Blue ink on beige paper, handwriting and doodles', swatch: ['#f2e9d6', '#1f3fb9', '#cdd6f5', '#fbf6ea'] },
  { id: 'inkblot', name: 'Inkblot', blurb: 'Black and white line art, bold type, solid ink accents', swatch: ['#ffffff', '#111111', '#e4e4e2', '#111111'] },
  { id: 'toybox', name: 'Toybox', blurb: 'Soft pastel clay: puffy matte shapes with gentle light and soft shadows', swatch: ['#f9dfe6', '#c9bff3', '#a9e0cf', '#f8dc8c'] },
  { id: 'glass', name: 'Glass', blurb: 'Clear frosted glass floating over vivid, glowing bokeh', swatch: ['#3b1e80', '#ff7a35', '#3f7dff', '#ff3ea5'] },
  { id: 'retro', name: 'Retro', blurb: 'An old desktop: grey windows, blue title bars, chunky buttons and pixel art', swatch: ['#d6d5d2', '#1f4bb8', '#f2c530', '#c62f3c'] },
  { id: 'receipt', name: 'Receipt', blurb: 'Till receipts on a grey counter: torn edges, dashed lines and barcodes', swatch: ['#fbfbfa', '#27282b', '#c9cbce', '#f6c9d0'] },
  { id: 'polaroid', name: 'Polaroid', blurb: 'A photo album: white frames, handwritten captions and masking tape', swatch: ['#fffdf8', '#d4bd97', '#5d8fb8', '#d9705a'] },
  { id: 'messages', name: 'Messages', blurb: 'A phone chat: grey and coloured text bubbles, typing dots and timestamps', swatch: ['#ffffff', '#0a6ee8', '#e9e9ee', '#1f8a3d'] },
  { id: 'comic', name: 'Comic', blurb: 'A comic book: inked panels, halftone dots, speech bubbles and starbursts', swatch: ['#ffe066', '#d8291f', '#1666c4', '#14110f'] },
  { id: 'tarot', name: 'Tarot', blurb: 'Gilded tarot cards dealt on a midnight cloth full of gold stars', swatch: ['#1c1438', '#f7ecd0', '#c79a3a', '#962a4a'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: ThemeId = 'classic';

/** Any stored or posted value → a known theme id (unknown or missing means the default). */
export const themeOf = (v: unknown): ThemeId => (THEMES.some(t => t.id === v) ? (v as ThemeId) : DEFAULT_THEME);

/** The ink colour for things drawn outside CSS, such as the lobby QR code. */
export const themeInk = (t: ThemeId) => (t === 'doodlebug' ? '#1f3fb9' : t === 'inkblot' ? '#111111' : t === 'glass' ? '#2c1d63' : t === 'messages' ? '#111114' : t === 'comic' ? '#14110f' : t === 'tarot' ? '#2b1c46' : t === 'polaroid' ? '#35291f' : t === 'receipt' ? '#27282b' : t === 'retro' ? '#14161f' : t === 'toybox' ? '#3a3d6b' : '#161616');

/** Themes with their own drawings in lib/doodles.tsx (the others decorate with shapes or colour). */
export const hasDoodles = (t: ThemeId) => t === 'doodlebug' || t === 'inkblot' || t === 'retro';
