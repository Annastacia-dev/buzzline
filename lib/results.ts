// Shareable end-of-game results ("Maya came 1st in Flags of the World"). Server only.
// The result travels in the link itself, signed with a server secret, so links can't be faked, need no
// database table and keep working after the game is cleaned up.
import crypto from 'crypto';
import { GameError } from './game';
import { THEMES, themeOf, type ThemeId } from './themes';

export type Result = { name: string; avatar: number; rank: number; players: number; score: number; title: string; theme: ThemeId };

/** Short form stored in the link: keeps the URL compact. */
type Packed = { n: string; a: number; r: number; p: number; s: number; t: string; h: string };

const b64url = (b: Buffer) => b.toString('base64url');
function key() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new GameError('Sharing results is not set up on this server', 503);
  // A key just for result links, derived from the server secret.
  return crypto.createHmac('sha256', secret).update('buzzline:result-links:v1').digest();
}
const sign = (data: string) => b64url(crypto.createHmac('sha256', key()).update(data).digest().subarray(0, 12));

/** The link code for a result: `<data>.<signature>`. */
export function encodeResult(r: Result): string {
  const packed: Packed = { n: r.name, a: r.avatar, r: r.rank, p: r.players, s: r.score, t: r.title, h: r.theme };
  const data = b64url(Buffer.from(JSON.stringify(packed)));
  return `${data}.${sign(data)}`;
}

/** The result in a link code, or null if the code was changed or is malformed. */
export function decodeResult(code: string): Result | null {
  const [data, sig] = String(code).split('.');
  if (!data || !sig || data.length > 1200) return null;
  const want = Buffer.from(sign(data)), got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Packed;
    const int = (n: unknown, max: number) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max ? (n as number) : null);
    const rank = int(p.r, 10000), players = int(p.p, 10000), score = int(p.s, 10_000_000), avatar = int(p.a, 1000);
    if (rank === null || players === null || score === null || avatar === null || typeof p.n !== 'string' || typeof p.t !== 'string') return null;
    const theme = THEMES.some(t => t.id === p.h) ? (p.h as ThemeId) : themeOf(null);
    return { name: p.n.slice(0, 40), avatar, rank, players, score, title: p.t.slice(0, 120), theme };
  } catch { return null; }
}

/** "1st", "2nd", "3rd", "11th"… */
export const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${s}`;
};

/** One line for chats and the page title: "Maya came 1st of 12 in “Flags of the World”". */
export const resultLine = (r: Result) => `${r.name} came ${ordinal(r.rank)}${r.players > 1 ? ` of ${r.players}` : ''} in “${r.title}”`;
