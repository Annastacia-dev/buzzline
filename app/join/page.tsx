import { Suspense } from 'react';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { gameTitle } from '@/lib/game';
import { SITE } from '@/lib/site';
import JoinForm from './JoinForm';

/**
 * A game link (/join?pin=123456) shared in a chat previews as that quiz: its name, and a share image in its
 * theme. Plain /join keeps the general title and image from layout.tsx.
 */
export async function generateMetadata({ searchParams }: PageProps<'/join'>): Promise<Metadata> {
  const { pin } = await searchParams;
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) return {};
  const game = await gameTitle(pin).catch(() => null);
  if (!game) return {};
  const title = `Join “${game.title}”`;
  const description = `You're invited to a live ${SITE.name} quiz. Open the link on your phone, check the PIN is ${pin}, pick a nickname and buzz in.`;
  const image = { url: `/join/card?pin=${pin}`, width: 1200, height: 630, alt: `${title}, a live ${SITE.name} quiz. Game PIN ${pin}.` };
  return {
    title, description,
    robots: { index: false }, // game links are short-lived; /join itself stays indexed
    openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US', url: `/join?pin=${pin}`, title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

// The metadata above reads the URL, so it is worked out per request; this marks that as intended
// while the form itself stays in the static shell.
async function PerRequest() {
  await connection();
  return null;
}

export default function JoinPage() {
  return (
    <>
      <JoinForm />
      <Suspense><PerRequest /></Suspense>
    </>
  );
}
