import { generateQuiz } from '@/lib/generate';
import { GameError } from '@/lib/game';

// Generation can take a while; give the function room beyond the default timeout.
export const maxDuration = 120;

/** POST /api/generate { topic, count, time, difficulty? } → a Quiz written by Claude. */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
    return Response.json(await generateQuiz(body, ip));
  } catch (e) {
    const status = e instanceof GameError ? e.status : 500;
    if (status === 500) console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : 'Server error' }, { status });
  }
}
