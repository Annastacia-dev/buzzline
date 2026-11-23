import { ImageResponse } from 'next/og';
import { C, Deck, OG_SIZE, OgFrame, ShapeIcon, ogAssets } from '@/lib/og';

export const alt = 'Buzzline quiz studio: write a quiz, generate one with AI or import a Kahoot spreadsheet, then host it live.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  const { mark, fonts } = await ogAssets();
  const qs = ['Who sang “Wannabe” in 1996?', 'Which band made “Nevermind”?', 'Who had a hit with “Vogue”?'];
  return new ImageResponse(
    (
      <OgFrame mark={mark} title="Make a quiz" accent="in a minute." subtitle="Write your own, let AI draft one from a topic, or import a Kahoot spreadsheet."
        pills={['AI generator', 'Kahoot import', 'Free']}>
        <Deck width={430} height={420}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 700 }}>
            <div style={{ display: 'flex', padding: '8px 16px', borderRadius: 999, background: C.lilac, border: `3px solid ${C.ink}` }}>✨ Generate with AI</div>
          </div>
          <div style={{ display: 'flex', flexShrink: 0, height: 58, borderRadius: 16, border: `3px solid ${C.ink}`, alignItems: 'center', padding: '0 18px', fontSize: 24, fontWeight: 700 }}>90s pop music</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {qs.map((q, i) => (
              <div key={q} style={{ display: 'flex', flexShrink: 0, height: 54, alignItems: 'center', gap: 12, padding: '0 16px', borderRadius: 16, background: C.tiles[i][0], fontSize: 19, fontWeight: 700 }}>
                <ShapeIcon i={i} color={C.tiles[i][1]} size={26} />
                {q}
              </div>
            ))}
          </div>
        </Deck>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
