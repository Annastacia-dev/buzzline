// The site's share images (Open Graph / X cards), drawn with next/og. They are served as PNG drafts at /og/<name>
// and saved as JPEG files in public/share/ by `pnpm og` (scripts/og.mjs): plain image files at fixed addresses
// are what WhatsApp and other chat apps show most reliably.
import { ImageResponse } from 'next/og';
import { C, Deck, OG_SIZE, OgFrame, ShapeIcon, ogAssets } from './og';
import { JOIN_CARD_ALT, joinCard } from './og-join';
import { SITE_URL } from './site';

/** One entry per file in public/share/ (<name>.jpg), with the alt text pages use for it. */
export const SHARE_IMAGES = {
  home: { alt: 'Buzzline: a free live multiplayer quiz game. Questions on the big screen, answers on every phone.', draw: () => homeCard() },
  host: { alt: 'Buzzline quiz studio: write a quiz, generate one with AI or import a Kahoot spreadsheet, then host it live.', draw: () => hostCard() },
  join: { alt: JOIN_CARD_ALT, draw: () => joinCard(null) },
} as const;
export type ShareImage = keyof typeof SHARE_IMAGES;

/** Metadata image entry for a saved share image. */
export const shareImage = (name: ShareImage) => ({
  url: `/share/${name}.jpg`, secureUrl: `${SITE_URL}/share/${name}.jpg`,
  width: OG_SIZE.width, height: OG_SIZE.height, type: 'image/jpeg', alt: SHARE_IMAGES[name].alt,
});

export async function homeCard() {
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
    { ...OG_SIZE, fonts },
  );
}

export async function hostCard() {
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
    { ...OG_SIZE, fonts },
  );
}
