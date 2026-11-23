import { shareQuiz, sharedQuiz } from '@/lib/library';
import { ipOf, respond } from '@/lib/route';

/** POST /api/share { quiz } → { id }: saves a copy of the quiz for a share link. */
export async function POST(req: Request) {
  return respond(async () => shareQuiz(((await req.json().catch(() => ({}))) as { quiz?: unknown }).quiz, ipOf(req)));
}

/** GET /api/share?id= → the shared quiz. */
export async function GET(req: Request) {
  return respond(() => sharedQuiz(new URL(req.url).searchParams.get('id')), { 'Cache-Control': 'no-store' });
}
