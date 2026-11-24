// Finds a picture for an AI-written question on Wikimedia Commons (free flags, landmarks, animals, paintings…).
// Server only. The bytes are then checked and stored like an upload (lib/library.ts → storeImage).
// A wrong picture is worse than none, so a file is only used when its name clearly matches the search.
import { MAX_IMAGE_BYTES } from './images';
import { SITE_URL } from './site';

const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks API clients to identify themselves.
const HEADERS = { 'User-Agent': `Buzzline/1.0 (${SITE_URL})`, 'Api-User-Agent': `Buzzline/1.0 (${SITE_URL})` };
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const WIDTH = 960; // Commons serves a resized copy at this width (SVGs, such as most flags, come back as PNG)
const STOP = new Set(['of', 'the', 'a', 'an', 'and', 'in', 'on', 'at', 'de', 'la', 'le', 'du', 'des', 'by', 'for', 'to']);

type Page = { index?: number; title: string; missing?: boolean; imageinfo?: { thumburl?: string; thumbmime?: string }[] };

/** The image type a thumbnail URL's extension implies (storeImage still checks the real bytes). */
const typeFromUrl = (u: string) => {
  const ext = new URL(u).pathname.split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : '';
};
const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w));
/** Share of the search's key words that appear in a file title. */
const match = (title: string, key: string[]) => {
  const t = new Set(words(title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')));
  return key.filter(w => t.has(w)).length / key.length;
};

async function query(params: Record<string, string>, signal?: AbortSignal): Promise<Page[]> {
  const url = `${API}?${new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    prop: 'imageinfo', iiprop: 'url|mime|thumbmime', iiurlwidth: String(WIDTH), ...params,
  })}`;
  const res = await fetch(url, { headers: HEADERS, signal, cache: 'no-store' });
  if (!res.ok) return [];
  return ((await res.json()) as { query?: { pages?: Page[] } }).query?.pages ?? [];
}

async function download(p: Page, signal?: AbortSignal) {
  const info = p.imageinfo?.[0];
  if (p.missing || !info?.thumburl || !OK_TYPES.includes(info.thumbmime ?? typeFromUrl(info.thumburl))) return null;
  const img = await fetch(info.thumburl, { headers: HEADERS, signal, cache: 'no-store' });
  if (!img.ok) return null;
  const bytes = new Uint8Array(await img.arrayBuffer());
  return bytes.byteLength > 0 && bytes.byteLength <= MAX_IMAGE_BYTES ? bytes : null;
}

/** Image bytes for the Commons file that best matches `search`, or null if nothing clearly matches. */
export async function findPicture(search: string, signal?: AbortSignal): Promise<Uint8Array | null> {
  const q = search.replace(/\s+/g, ' ').replace(/["|]/g, '').trim().slice(0, 120);
  const key = words(q);
  if (!key.length) return null;

  // 1. The exact file name, which is how flags and many famous works are named ("Flag of Japan.svg").
  const exact = await query({ titles: ['svg', 'png', 'jpg'].map(ext => `File:${q}.${ext}`).join('|') }, signal);
  for (const p of exact) { const b = await download(p, signal); if (b) return b; }

  // 2. Titles that contain every key word, then 3. a plain search that must still share most of them.
  for (const [gsrsearch, need] of [[`${key.map(w => `intitle:${w}`).join(' ')} filetype:bitmap|drawing`, 1], [`${q} filetype:bitmap|drawing`, 0.66]] as const) {
    const pages = await query({ generator: 'search', gsrsearch, gsrnamespace: '6', gsrlimit: '8' }, signal);
    const ranked = pages
      .map(p => ({ p, score: match(p.title, key) }))
      .filter(r => r.score >= need)
      .sort((a, b) => b.score - a.score || (a.p.index ?? 99) - (b.p.index ?? 99));
    for (const { p } of ranked) { const b = await download(p, signal); if (b) return b; }
  }
  return null;
}
