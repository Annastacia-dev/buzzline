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
  { id: 'postcard', name: 'Postcard', blurb: 'Postcards on a sky-blue desk: airmail stripes, perforated stamps and postmarks', swatch: ['#fffaf0', '#b9d0dc', '#c23b32', '#2b5aa8'] },
  { id: 'chalkboard', name: 'Chalkboard', blurb: 'Chalk handwriting on a green board in a wooden frame, with wavy underlines', swatch: ['#2c4a3b', '#f3f1e7', '#f5dc6e', '#a5703e'] },
  { id: 'typewriter', name: 'Typewriter', blurb: 'A typed letter: monospace on cream paper, uneven ink, a dated letterhead and a blinking cursor', swatch: ['#f5eedb', '#26221d', '#b3261e', '#2c4a8a'] },
  { id: 'ticket', name: 'Concert ticket', blurb: 'Bright concert tickets with stubs, punched notches and perforations under stage spotlights', swatch: ['#17112a', '#ff4f8b', '#3fb8ff', '#ffb02e'] },
  { id: 'recipe', name: 'Recipe card', blurb: 'Lined index cards on a gingham cloth: a red header rule, serif type and ingredient checkboxes', swatch: ['#fffdf6', '#d9534f', '#bfd4ea', '#3f8a4a'] },
  { id: 'christmas', name: 'Christmas', blurb: 'Gold-framed Christmas cards on a snowy red night, with candy canes, holly and gift-wrapped answers', swatch: ['#8f1d22', '#fff8ec', '#1f6b3a', '#d9a326'] },
  { id: 'fall', name: 'Fall', blurb: 'Cosy stitched patches on flannel plaid in pumpkin, mustard and rust, with maple leaves', swatch: ['#efd4a8', '#d0611f', '#9c3220', '#6f7a2e'] },
  { id: 'easter', name: 'Easter', blurb: 'Painted eggs on a pastel polka-dot cloth, with spring grass along every card', swatch: ['#e4f3ea', '#f7a8bf', '#9fc8f2', '#ffd76a'] },
  { id: 'valentine', name: "Valentine's", blurb: 'Lace doilies and pastel candy hearts on a pink cloth scattered with little hearts', swatch: ['#ffe1e9', '#e23d6d', '#ffc2d4', '#fffafb'] },
  { id: 'music', name: 'Music', blurb: 'Album sleeves on a dark record-shop wall, with a stave across the question and every answer on vinyl', swatch: ['#1d1828', '#fbf3e4', '#e8553d', '#f2b43a'] },
  { id: 'sports', name: 'Sports', blurb: 'A striped pitch with chalk lines, an LED scoreboard for the question and team jerseys for answers', swatch: ['#2f8f46', '#13213c', '#ffd23f', '#d7263d'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: ThemeId = 'classic';

/** Any stored or posted value → a known theme id (unknown or missing means the default). */
export const themeOf = (v: unknown): ThemeId => (THEMES.some(t => t.id === v) ? (v as ThemeId) : DEFAULT_THEME);

/** The ink colour for things drawn outside CSS, such as the lobby QR code. */
export const themeInk = (t: ThemeId) => (t === 'doodlebug' ? '#1f3fb9' : t === 'inkblot' ? '#111111' : t === 'glass' ? '#2c1d63' : t === 'music' ? '#241c2e' : t === 'sports' ? '#13213c' : t === 'christmas' ? '#2a1a14' : t === 'fall' ? '#3b2416' : t === 'easter' ? '#3c3350' : t === 'valentine' ? '#5a1530' : t === 'typewriter' ? '#26221d' : t === 'ticket' ? '#1d1530' : t === 'recipe' ? '#2b2420' : t === 'chalkboard' ? '#1f3a2c' : t === 'postcard' ? '#24324f' : t === 'messages' ? '#111114' : t === 'comic' ? '#14110f' : t === 'tarot' ? '#2b1c46' : t === 'polaroid' ? '#35291f' : t === 'receipt' ? '#27282b' : t === 'retro' ? '#14161f' : t === 'toybox' ? '#3a3d6b' : '#161616');

/** Themes with their own drawings in lib/doodles.tsx (the others decorate with shapes or colour). */
export const hasDoodles = (t: ThemeId) => t === 'doodlebug' || t === 'inkblot' || t === 'retro';
