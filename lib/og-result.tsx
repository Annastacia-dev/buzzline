// The share image for a result link (/r/<code>): "Maya came 1st" in the quiz's theme colours.
// Served by app/r/[code]/card/route.ts.
import { ImageResponse } from 'next/og';
import { Deck, OG_SIZE, OgFrame, PALETTES, ogAssets } from './og';
import { ordinal, type Result } from './results';

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export async function resultCard(r: Result) {
  const { mark, fonts } = await ogAssets();
  const p = PALETTES[r.theme];
  const podium = r.rank <= 3;
  return new ImageResponse(
    (
      <OgFrame mark={mark} p={p}
        title={`${clip(r.name, 16)} came ${ordinal(r.rank)}`}
        accent={`in ${clip(r.title, 40)}`}
        subtitle={r.players > 1
          ? `${r.score.toLocaleString('en')} points against ${r.players - 1} other player${r.players === 2 ? '' : 's'}. Think you can beat that?`
          : `${r.score.toLocaleString('en')} points in a live Buzzline quiz. Think you can beat that?`}
        pills={['Free', 'AI quiz maker', 'Play live']}>
        <Deck width={400} height={380} p={p}>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: p.muted }}>{podium ? 'On the podium' : 'Final position'}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ display: 'flex', fontFamily: 'Bricolage', fontSize: 150, lineHeight: 0.9, letterSpacing: -6 }}>#{r.rank}</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: p.muted, paddingBottom: 14 }}>of {r.players}</div>
          </div>
          <div style={{ display: 'flex', height: 62, borderRadius: 16, border: `3px solid ${p.ink}`, background: p.tiles[1][0], color: p.tiles[1][1], alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontSize: 26, fontWeight: 700 }}>
            <span>{clip(r.name, 14)}</span><span>{r.score.toLocaleString('en')}</span>
          </div>
          <div style={{ display: 'flex', height: 62, borderRadius: 999, background: p.ink, color: p.paper, alignItems: 'center', justifyContent: 'center', fontSize: 25, fontWeight: 700 }}>Host your own quiz →</div>
        </Deck>
      </OgFrame>
    ),
    // The picture for a link never changes, so it can be cached for good.
    { ...OG_SIZE, fonts, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=31536000, immutable' } },
  );
}
