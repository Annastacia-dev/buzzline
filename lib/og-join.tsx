// The share image for join links. /join gets the general invite; /join?pin=… gets one with the quiz's
// name and PIN, in the quiz's theme colours. Served by app/join/card/route.ts.
import { ImageResponse } from 'next/og';
import { Deck, OG_SIZE, OgFrame, PALETTES, ogAssets } from './og';
import type { ThemeId } from './themes';

export const JOIN_CARD_ALT = 'Join a Buzzline quiz: open the link on your phone, enter the 6-digit game PIN and pick a nickname.';

/** Shortens a quiz title to fit three lines of the headline. */
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export async function joinCard(game: { pin: string; title: string; theme: ThemeId } | null) {
  const { mark, fonts } = await ogAssets();
  const p = PALETTES[game?.theme ?? 'classic'];
  const pin = game?.pin ?? '482917';
  return new ImageResponse(
    (
      <OgFrame mark={mark} p={p}
        title={game ? "You're invited to" : "You're invited"}
        accent={game ? clip(game.title, 48) : 'to buzz in.'}
        subtitle={game ? 'A live quiz: open the link on your phone and pick a nickname. No app needed.' : 'Open the link on your phone, type the game PIN and pick a nickname. No app needed.'}
        pills={['Any phone', 'No sign-up', 'Play live']}>
        <Deck width={420} height={380} p={p}>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: p.muted }}>Game PIN</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {pin.split('').map((d, i) => (
              <div key={i} style={{ display: 'flex', width: 52, height: 70, borderRadius: 14, border: `3px solid ${p.ink}`, background: p.tiles[i % 4][0], color: p.tiles[i % 4][1], alignItems: 'center', justifyContent: 'center', fontFamily: 'Bricolage', fontSize: 38 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'flex', height: 62, borderRadius: 16, border: `3px solid ${p.ink}`, alignItems: 'center', padding: '0 18px', fontSize: 24, fontWeight: 500, color: p.muted }}>Your nickname</div>
          <div style={{ display: 'flex', height: 66, borderRadius: 999, background: p.ink, color: p.paper, alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700 }}>Ready to buzz in →</div>
        </Deck>
      </OgFrame>
    ),
    {
      ...OG_SIZE, fonts,
      // A game's card can change only if the PIN is reused for a new game; the general one rarely changes.
      headers: { 'Cache-Control': game ? 'public, max-age=300, s-maxage=300' : 'public, max-age=3600, s-maxage=86400' },
    },
  );
}
