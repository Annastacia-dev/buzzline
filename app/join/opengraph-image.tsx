import { ImageResponse } from 'next/og';
import { C, Deck, OG_SIZE, OgFrame, ogAssets } from '@/lib/og';

export const alt = 'Join a Buzzline quiz: open the link on your phone, enter the 6-digit game PIN and pick a nickname.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  const { mark, fonts } = await ogAssets();
  return new ImageResponse(
    (
      <OgFrame mark={mark} title="You're invited" accent="to buzz in." subtitle="Open the link on your phone, type the game PIN and pick a nickname. No app needed."
        pills={['Any phone', 'No sign-up', 'Play live']}>
        <Deck width={420} height={380}>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: C.muted }}>Game PIN</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {'482917'.split('').map((d, i) => (
              <div key={i} style={{ display: 'flex', width: 52, height: 70, borderRadius: 14, border: `3px solid ${C.ink}`, background: C.tiles[i % 4][0], alignItems: 'center', justifyContent: 'center', fontFamily: 'Bricolage', fontSize: 38 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'flex', height: 62, borderRadius: 16, border: `3px solid ${C.ink}`, alignItems: 'center', padding: '0 18px', fontSize: 24, fontWeight: 500, color: C.muted }}>Your nickname</div>
          <div style={{ display: 'flex', height: 66, borderRadius: 999, background: C.ink, color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700 }}>Ready to buzz in →</div>
        </Deck>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
