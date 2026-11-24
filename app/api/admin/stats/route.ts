import { requireAdmin } from '@/lib/admin';
import { respond } from '@/lib/route';
import { db } from '@/lib/supabase-server';
import { GameError } from '@/lib/game';

const PERIODS = [7, 30, 90, 365];

/** Offset of a time zone from UTC at an instant, in ms (positive east of Greenwich). */
function offset(tz: string, at: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(at / 1000) * 1000;
}

/** Midnight in `tz`, `back` days before today there. */
function midnight(tz: string, back: number, now = Date.now()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now); // YYYY-MM-DD
  const [y, m, d] = today.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d - back);
  return guess - offset(tz, guess);
}

async function stats(from: number, to: number, tz: string) {
  const { data, error } = await db().rpc('buzz_admin_stats', { p_from: new Date(from).toISOString(), p_to: new Date(to).toISOString(), p_tz: tz });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * GET /api/admin/stats?days=30&tz=Africa/Nairobi → this period's numbers (whole days in tz, today included)
 * and the totals for the period of the same length just before it, for the "vs previous" comparison.
 */
export async function GET(req: Request) {
  return respond(async () => {
    await requireAdmin();
    const q = new URL(req.url).searchParams;
    const days = PERIODS.includes(Number(q.get('days'))) ? Number(q.get('days')) : 30;
    let tz = q.get('tz') || 'UTC';
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'UTC'; }
    if (tz.length > 64) throw new GameError('Bad time zone', 400);
    const now = Date.now();
    const from = midnight(tz, days - 1, now);
    const prevFrom = midnight(tz, 2 * days - 1, now);
    const [cur, prev] = await Promise.all([stats(from, now, tz), stats(prevFrom, from, tz)]);
    return { days, tz, from: new Date(from).toISOString(), ...cur, previous: prev.totals };
  }, { 'Cache-Control': 'no-store' });
}
