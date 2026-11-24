import { resultCard } from '@/lib/og-result';
import { decodeResult } from '@/lib/results';

/** GET /r/<code>/card → the share image for a result link. */
export async function GET(_req: Request, ctx: RouteContext<'/r/[code]/card'>) {
  const r = decodeResult((await ctx.params).code);
  if (!r) return new Response('Not found', { status: 404 });
  return resultCard(r);
}
