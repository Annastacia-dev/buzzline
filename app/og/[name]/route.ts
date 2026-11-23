import { SHARE_IMAGES, type ShareImage } from '@/lib/og-cards';

/** GET /og/<name> → the PNG draft of a share image. `pnpm og` saves these as public/share/<name>.jpg. */
export async function GET(_req: Request, ctx: RouteContext<'/og/[name]'>) {
  const { name } = await ctx.params;
  if (!Object.hasOwn(SHARE_IMAGES, name)) return new Response('Not found', { status: 404 });
  const res = await SHARE_IMAGES[name as ShareImage].draw();
  res.headers.set('X-Robots-Tag', 'noindex');
  return res;
}
