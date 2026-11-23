// Builds Buzzline's brand assets from the brand font: logos (SVG + PNG), app icons, favicon.ico.
// Run with `pnpm brand` after changing colours or shapes; the outputs are committed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import opentype from 'opentype.js';
import sharp from 'sharp';

const INK = '#161616', BUTTER = '#fbe18a', PINK_INK = '#c2177c', PINK = '#f7bddf', CREAM = '#fbf6ec';

const buf = readFileSync('assets/fonts/BricolageGrotesque-ExtraBold.ttf');
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

/** Text as one SVG path, baseline at y=0, with tight tracking (a touch looser than the site's -0.04em so the z's don't touch) and kerning. */
function textPath(str, size, tracking = -0.025) {
  const scale = size / font.unitsPerEm;
  const glyphs = [...str].map(c => font.charToGlyph(c)); // plain Latin: no shaping needed
  const path = new opentype.Path();
  let x = 0;
  glyphs.forEach((g, i) => {
    path.extend(g.getPath(x, 0, size));
    x += g.advanceWidth * scale + (glyphs[i + 1] ? (font.getKerningValue(g, glyphs[i + 1]) || 0) * scale : 0) + tracking * size;
  });
  // Round and write the path ourselves: opentype.js 2.0's formatter emits NaN for tiny floats and re-flips Y.
  for (const c of path.commands) for (const k of ['x', 'y', 'x1', 'y1', 'x2', 'y2']) if (k in c) c[k] = Math.round(c[k] * 100) / 100;
  const bb = path.getBoundingBox();
  const d = path.commands.map(c => c.type === 'Z' ? 'Z' : c.type + [c.x1, c.y1, c.x2, c.y2, c.x, c.y].filter(v => v !== undefined).join(' ')).join('');
  return { d, width: x - tracking * size, x1: bb.x1, x2: bb.x2, y1: bb.y1, y2: bb.y2 };
}

/** The wordmark "Buzzline" plus the dot that sits on its baseline (as in the site header). */
function wordmark(size, color, dotColor) {
  const t = textPath('Buzzline', size);
  const r = size * 0.17, cx = t.x2 + size * 0.05 + r, cy = -r;
  return { svg: `<path d="${t.d}" fill="${color}"/><circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${dotColor}"/>`, x1: t.x1, x2: cx + r, y1: t.y1, y2: Math.max(t.y2, 0) };
}

/** The mark: a lowercase "b" with the pink dot, centred on a butter tile. */
function glyph(box) {
  const size = box * 0.78;
  const t = textPath('b', size, 0);
  const r = size * 0.11, gap = size * 0.04;
  const w = (t.x2 - t.x1) + gap + 2 * r, h = t.y2 - t.y1;
  const ox = (box - w) / 2 - t.x1, oy = (box - h) / 2 - t.y1 + box * 0.01;
  const cx = t.x2 + gap + r;
  return `<g transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)})"><path d="${t.d}" fill="${INK}"/><circle cx="${cx.toFixed(2)}" cy="${(-r).toFixed(2)}" r="${r.toFixed(2)}" fill="${PINK_INK}"/></g>`;
}

const svgDoc = (w, h, body, title = 'Buzzline') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">${body}</svg>\n`;

// Rounded tile with a chunky ink border; `shadow` adds the offset card shadow used across the UI.
function mark({ shadow = false, bleed = false } = {}) {
  const S = 512;
  if (bleed) return svgDoc(S, S, `<rect width="${S}" height="${S}" fill="${BUTTER}"/><g transform="translate(${S * 0.17} ${S * 0.17}) scale(0.66)">${glyph(S)}</g>`);
  const pad = shadow ? 20 : 14, off = shadow ? 26 : 0, side = S - 2 * pad - off, rx = side * 0.27, sw = shadow ? 22 : 30;
  const tile = `<rect x="${pad}" y="${pad}" width="${side}" height="${side}" rx="${rx}" fill="${BUTTER}" stroke="${INK}" stroke-width="${sw}"/>`;
  const shade = shadow ? `<rect x="${pad + off}" y="${pad + off}" width="${side}" height="${side}" rx="${rx}" fill="${INK}"/>` : '';
  return svgDoc(S, S, `${shade}${tile}<g transform="translate(${pad} ${pad}) scale(${side / S})">${glyph(S)}</g>`);
}

function logo(color, dot, bg) {
  const size = 200, m = wordmark(size, color, dot), padX = 40, padY = 36;
  const w = Math.ceil(m.x2 - m.x1 + 2 * padX), h = Math.ceil(m.y2 - m.y1 + 2 * padY);
  const back = bg ? `<rect width="${w}" height="${h}" rx="${h * 0.22}" fill="${bg}"/>` : '';
  return svgDoc(w, h, `${back}<g transform="translate(${(padX - m.x1).toFixed(2)} ${(padY - m.y1).toFixed(2)})">${m.svg}</g>`);
}

function lockup(color, dot) {
  const size = 200, m = wordmark(size, color, dot);
  const tile = 300, gap = 44, padX = 30;
  const textH = m.y2 - m.y1, h = tile + 40;
  const w = Math.ceil(padX + tile + gap + (m.x2 - m.x1) + padX);
  const markSvg = mark({ shadow: true }).replace(/^<svg[^>]*>|<\/svg>\n$/g, '');
  const ty = (h - textH) / 2 - m.y1;
  return svgDoc(w, h, `<g transform="translate(${padX} 20) scale(${tile / 512})">${markSvg}</g><g transform="translate(${(padX + tile + gap - m.x1).toFixed(2)} ${ty.toFixed(2)})">${m.svg}</g>`);
}

const png = (svg, w, h = w) => sharp(Buffer.from(svg), { density: 300 }).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer();

/** favicon.ico holding PNG images (supported by every current browser). */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, o); head.writeUInt8(size >= 256 ? 0 : size, o + 1);
    head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(data.length, o + 8); head.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map(i => i.data)]);
}

mkdirSync('public/brand', { recursive: true });
mkdirSync('public/icons', { recursive: true });

const files = {
  'public/brand/buzzline-mark.svg': mark({ shadow: true }),
  'public/brand/buzzline-mark-flat.svg': mark(),
  'public/brand/buzzline-logo.svg': logo(INK, PINK_INK),
  'public/brand/buzzline-logo-white.svg': logo('#ffffff', PINK),
  'public/brand/buzzline-logo-on-cream.svg': logo(INK, PINK_INK, CREAM),
  'public/brand/buzzline-lockup.svg': lockup(INK, PINK_INK),
  'public/brand/buzzline-lockup-white.svg': lockup('#ffffff', PINK),
  'app/icon.svg': mark(),
};
for (const [f, svg] of Object.entries(files)) writeFileSync(f, svg);

const flat = mark(), bleed = mark({ bleed: true });
const out = {
  'app/apple-icon.png': await png(bleed, 180),
  'public/icons/icon-192.png': await png(flat, 192),
  'public/icons/icon-512.png': await png(flat, 512),
  'public/icons/maskable-512.png': await png(bleed, 512),
  'public/brand/buzzline-mark.png': await png(files['public/brand/buzzline-mark.svg'], 1024),
};
for (const [name, svg] of [['logo', files['public/brand/buzzline-logo.svg']], ['logo-white', files['public/brand/buzzline-logo-white.svg']], ['lockup', files['public/brand/buzzline-lockup.svg']]]) {
  const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
  out[`public/brand/buzzline-${name}.png`] = await png(svg, w * 2, h * 2);
}
for (const [f, b] of Object.entries(out)) writeFileSync(f, b);
writeFileSync('app/favicon.ico', ico(await Promise.all([16, 32, 48].map(async size => ({ size, data: await png(flat, size) })))));

console.log('Wrote', Object.keys(files).length + Object.keys(out).length + 1, 'files');
