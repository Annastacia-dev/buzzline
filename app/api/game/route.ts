import { createGame, gameTitle, GameError } from '@/lib/game';
import { post } from '@/lib/http';
import type { Quiz } from '@/lib/types';

export const POST = post(b => createGame(b.quiz as Quiz, b.teams));

/** GET /api/game?pin= → { title, theme, started } so the join page can show the quiz's name in its theme. */
export async function GET(req: Request) {
  try {
    return Response.json(await gameTitle(new URL(req.url).searchParams.get('pin')), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const status = e instanceof GameError ? e.status : 500;
    if (status === 500) console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : 'Server error' }, { status });
  }
}
