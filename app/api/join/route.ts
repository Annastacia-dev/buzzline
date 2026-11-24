import { join } from '@/lib/game';
import { post } from '@/lib/http';
import { track } from '@/lib/track';

export const POST = post(async (b, req) => {
  const r = await join(b.pin, b.name);
  track('player_joined', req, { meta: { pin: r.pin } });
  return r;
});
