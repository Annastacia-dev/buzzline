import { resultCard } from '@/lib/og-result';
import { decodeResult } from '@/lib/results';

/** A safe file name for the card: "buzzline-flags-of-the-world-1st.png". */
const fileName = (title: string, rank: number) => {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `buzzline-${slug || 'quiz'}-${rank === 1 ? 'winner' : `rank-${rank}`}.png`;
};

/** GET /r/<code>/card → the share image for a result link. With ?download it is sent as a file to save. */
export async function GET(req: Request, ctx: RouteContext<'/r/[code]/card'>) {
  const r = decodeResult((await ctx.params).code);
  if (!r) return new Response('Not found', { status: 404 });
  const card = await resultCard(r);
  if (!new URL(req.url).searchParams.has('download')) return card;
  const headers = new Headers(card.headers);
  headers.set('Content-Disposition', `attachment; filename="${fileName(r.title, r.rank)}"`);
  return new Response(card.body, { status: card.status, headers });
}
