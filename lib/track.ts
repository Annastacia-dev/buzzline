// Usage counting for the admin dashboard. Server-only.
//
// No cookies, no stored IPs, no names. A visitor is a hash of (server secret, day, IP, user agent): it tells apart
// the people on one day, changes at midnight UTC, and can't be turned back into an IP.
// Events are written after the response is sent (next/server `after`), so tracking never slows anyone down,
// and a failure to record one is logged and otherwise ignored.
import crypto from 'node:crypto';
import { after } from 'next/server';
import { db } from './supabase-server';
// Inline rather than importing lib/route, which imports lib/game (which imports this file).
const ipOf = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';

export type EventKind =
  | 'visit' | 'quiz_created' | 'game_hosted' | 'game_started' | 'game_finished' | 'player_joined'
  | 'challenge_created' | 'challenge_run' | 'challenge_finished' | 'ai_quiz';

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|monitor|curl|wget|python|node-fetch|axios/i;

let salt: Buffer | undefined;
function key() {
  if (salt) return salt;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return undefined;
  return (salt = crypto.createHmac('sha256', secret).update('buzzline:visitors:v1').digest());
}

/** The day's anonymous visitor id for this request, or undefined for bots. */
export function visitorOf(req: Request): string | undefined | null {
  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || BOT.test(ua)) return null; // null = a bot: don't count it at all
  const k = key();
  if (!k) return undefined;
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHmac('sha256', k).update(`${day}|${ipOf(req)}|${ua}`).digest('base64url').slice(0, 16);
}

type Extra = { path?: string; ref?: string; meta?: Record<string, unknown> };

/** Records an event once the response has gone. Pass the request to count who did it. */
export function track(kind: EventKind, req?: Request | null, extra: Extra = {}) {
  // Local dev shares the production database: keep test clicks out of the numbers unless asked (BUZZ_TRACK_DEV=1).
  if (process.env.NODE_ENV !== 'production' && process.env.BUZZ_TRACK_DEV !== '1') return;
  const visitor = req ? visitorOf(req) : undefined;
  if (visitor === null) return;
  const row = { kind, visitor: visitor ?? null, path: extra.path ?? null, ref: extra.ref ?? null, meta: extra.meta ?? {} };
  const write = async () => {
    const { error } = await db().from('buzz_events').insert(row);
    if (error) console.error('Tracking failed', error.message);
  };
  try { after(write); } catch { void write(); } // outside a request (scripts): write now
}
