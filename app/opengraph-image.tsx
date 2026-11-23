import { ImageResponse } from 'next/og';
import { C, Deck, OG_SIZE, OgFrame, ShapeIcon, ogAssets } from '@/lib/og';

export const alt = 'Buzzline: a free live multiplayer quiz game. Questions on the big screen, answers on every phone.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  const { mark, fonts } = await ogAssets();
  const answers = ['Venus', 'Mars', 'Jupiter', 'Mercury'];
  return new ImageResponse(
    (
      <OgFrame mark={mark} title="Quiz night," accent="for your crowd." subtitle="Questions on the big screen, answers on every phone. The fastest right answers win."
        pills={['Free', 'No app needed', 'Up to 200 players']}>
        <Deck>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: C.ink, color: '#fff', borderRadius: 999, padding: '8px 18px', fontSize: 20, fontWeight: 700 }}>Question 3 of 10</div>
            <div style={{ display: 'flex', width: 54, height: 54, borderRadius: 99, border: `3px solid ${C.ink}`, alignItems: 'center', justifyContent: 'center', fontFamily: 'Bricolage', fontSize: 26 }}>12</div>
          </div>
          <div style={{ fontFamily: 'Bricolage', fontSize: 38, lineHeight: 1.08, letterSpacing: -1 }}>Which planet is known as the Red Planet?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {answers.map((a, i) => (
              <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 10, width: 182, height: 62, padding: '0 16px', borderRadius: 18, background: C.tiles[i][0], border: `3px solid ${C.ink}`, fontSize: 22, fontWeight: 700, boxShadow: i === 1 ? `0 0 0 5px ${C.pinkInk}` : 'none' }}>
                <ShapeIcon i={i} color={C.tiles[i][1]} size={26} />{a}
              </div>
            ))}
          </div>
        </Deck>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
