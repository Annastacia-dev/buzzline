import { getView } from '@/lib/game';

// The current view for one screen (host or player). Screens call this on load and whenever
// a Realtime ping says something changed.
export async function GET(req: Request) {
  try {
    const view = await getView(new URL(req.url).searchParams);
    return Response.json(view, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
