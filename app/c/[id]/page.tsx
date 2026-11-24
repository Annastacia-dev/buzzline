import { Suspense } from 'react';
import type { Metadata } from 'next';
import { challengeInfo } from '@/lib/challenge';
import { SITE } from '@/lib/site';
import ChallengePlay from './ChallengePlay';

/** A challenge link: play a quiz alone on your phone, any time, and see where you rank. */
export async function generateMetadata({ params }: PageProps<'/c/[id]'>): Promise<Metadata> {
  const { id } = await params;
  try {
    const c = await challengeInfo(id);
    const title = `Challenge: ${c.title}`;
    const description = `${c.total} questions. Play on your phone and see how you rank against ${c.players ? `${c.players} player${c.players === 1 ? '' : 's'}` : 'everyone else'}. Free, no app.`;
    return { title, description, robots: { index: false }, openGraph: { title: `${title} · ${SITE.name}`, description } };
  } catch {
    return { title: 'Challenge not found', robots: { index: false } };
  }
}

async function Load({ params }: { params: PageProps<'/c/[id]'>['params'] }) {
  const { id } = await params;
  return <ChallengePlay id={id} />;
}

export default function ChallengePage({ params }: PageProps<'/c/[id]'>) {
  return (
    <Suspense fallback={<div className="center"><div className="spinner" /></div>}>
      <Load params={params} />
    </Suspense>
  );
}
