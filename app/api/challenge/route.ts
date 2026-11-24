import { challengeInfo, createChallenge, runAnswer, runNext, runView, startRun } from '@/lib/challenge';
import { GameError } from '@/lib/game';
import { ipOf, respond } from '@/lib/route';

/**
 * POST /api/challenge { action, ... }
 *   create { quiz }                  → { id }
 *   start  { id, name }              → { run, token, view }
 *   view   { id, run, token }        → the run's current screen
 *   answer { id, run, token, choice | text | order }
 *   next   { id, run, token }
 */
export async function POST(req: Request) {
  return respond(async () => {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    switch (b.action) {
      case 'create': return createChallenge(b.quiz, ipOf(req));
      case 'start': return startRun(b.id, b.name);
      case 'view': return runView(b.id, b.run, b.token);
      case 'answer': return runAnswer(b.id, b.run, b.token, { choice: b.choice, text: b.text, order: b.order });
      case 'next': return runNext(b.id, b.run, b.token);
    }
    throw new GameError('Unknown action', 400);
  }, { 'Cache-Control': 'no-store' });
}

/** GET /api/challenge?id= → title, theme and leaderboard. */
export async function GET(req: Request) {
  return respond(() => challengeInfo(new URL(req.url).searchParams.get('id')), { 'Cache-Control': 'no-store' });
}
