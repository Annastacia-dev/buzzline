import { playerResult } from '@/lib/game';
import { encodeResult } from '@/lib/results';
import { respond } from '@/lib/route';

/** POST /api/result { pin, id, token } → { url }: a share link for this player's final result (/r/<code>). */
export async function POST(req: Request) {
  return respond(async () => {
    const { pin, id, token } = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return { url: `/r/${encodeResult(await playerResult(pin, id, token))}` };
  });
}
