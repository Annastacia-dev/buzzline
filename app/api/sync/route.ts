import { pullLibrary, pushLibrary } from '@/lib/sync-server';
import { ipOf, respond } from '@/lib/route';

/** POST /api/sync { secret, library? } → the merged library. Without `library` it only reads. */
export async function POST(req: Request) {
  return respond(async () => {
    const b = (await req.json().catch(() => ({}))) as { secret?: unknown; library?: unknown };
    return b.library === undefined ? pullLibrary(b.secret, ipOf(req)) : pushLibrary(b.secret, b.library, ipOf(req));
  }, { 'Cache-Control': 'no-store' });
}
