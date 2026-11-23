import { gameTitle } from '@/lib/game';
import { joinCard } from '@/lib/og-join';

/** GET /join/card[?pin=] → the share image for a join link: the quiz's own card if the PIN is a live game, else the general one. */
export async function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get('pin') ?? '';
  const game = /^\d{6}$/.test(pin) ? await gameTitle(pin).catch(() => null) : null;
  return joinCard(game && { pin, title: game.title, theme: game.theme });
}
