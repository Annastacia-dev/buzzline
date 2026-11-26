import { requireAdmin } from '@/lib/admin';
import { respond } from '@/lib/route';
import { db } from '@/lib/supabase-server';
import { GameError } from '@/lib/game';

/** Offset of a time zone from UTC at an instant, in ms (positive east of Greenwich). */
function offset(tz: string, at: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(at / 1000) * 1000;
}

/** The calendar date (YYYY-MM-DD) in `tz` at an instant. */
const dateIn = (tz: string, at: number) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(at);

/** Midnight in `tz` at the start of a calendar date, `plus` days on. */
function midnight(tz: string, date: string, plus = 0) {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d + plus);
  return guess - offset(tz, guess);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 731; // two years

async function stats(from: number, to: number, tz: string) {
  const { data, error } = await db().rpc('buzz_admin_stats', { p_from: new Date(from).toISOString(), p_to: new Date(to).toISOString(), p_tz: tz });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * GET /api/admin/stats?from=2026-11-01&to=2026-11-26&tz=Africa/Nairobi → numbers for those whole days in tz (both
 * included; a range reaching today stops at now), and the totals for the same number of days just before, for the
 * "vs previous" comparison. The older ?days=30 (the last 30 days, today included) still works.
 */
export async function GET(req: Request) {
  return respond(async () => {
    await requireAdmin();
    const q = new URL(req.url).searchParams;
    let tz = q.get('tz') || 'UTC';
    if (tz.length > 64) throw new GameError('Bad time zone', 400);
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'UTC'; }
    const now = Date.now();
    const today = dateIn(tz, now);

    let fromDate = q.get('from') ?? '', toDate = q.get('to') ?? '';
    if (!DATE.test(fromDate) || !DATE.test(toDate)) {
      const days = Math.min(Math.max(Math.round(Number(q.get('days')) || 30), 1), MAX_DAYS);
      fromDate = dateIn(tz, midnight(tz, today, -(days - 1)) + 1);
      toDate = today;
    }
    if (toDate > today) toDate = today;
    if (fromDate > toDate) throw new GameError('The start date is after the end date', 400);
    const from = midnight(tz, fromDate);
    const to = Math.min(midnight(tz, toDate, 1), now);
    const days = Math.round((midnight(tz, toDate, 1) - from) / 86_400_000);
    if (!Number.isFinite(from) || days < 1) throw new GameError('Bad dates', 400);
    if (days > MAX_DAYS) throw new GameError('Pick a range of two years or less', 400);
    const prevFrom = midnight(tz, fromDate, -days);

    const [cur, prev] = await Promise.all([stats(from, to, tz), stats(prevFrom, from, tz)]);
    return { days, tz, from: new Date(from).toISOString(), fromDate, toDate, ...cur, previous: prev.totals };
  }, { 'Cache-Control': 'no-store' });
}
