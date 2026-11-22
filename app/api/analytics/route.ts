import { getAnalytics, GameError } from '@/lib/game';

/** GET /api/analytics?pin=&token= — the host's end-of-game report. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  try {
    return Response.json(await getAnalytics(p.get('pin'), p.get('token')), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const status = e instanceof GameError ? e.status : 500;
    if (status === 500) console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : 'Server error' }, { status });
  }
}
