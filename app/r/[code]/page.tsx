import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/lib/avatars';
import { Scallop } from '@/lib/deco';
import { decodeResult, ordinal, resultLine } from '@/lib/results';
import { SITE } from '@/lib/site';

/** A shared result ("Maya came 1st of 12 in Flags of the World"), with a nudge to host a quiz of your own. */
export async function generateMetadata({ params }: PageProps<'/r/[code]'>): Promise<Metadata> {
  const { code } = await params;
  const r = decodeResult(code);
  if (!r) return { title: 'Result not found', robots: { index: false } };
  const title = resultLine(r);
  const description = `${r.score.toLocaleString('en')} points in a live ${SITE.name} quiz. Make your own free quiz with AI and play it with your crowd.`;
  const image = { url: `/r/${code}/card`, width: 1200, height: 630, alt: `${title}. ${description}` };
  return {
    title, description,
    robots: { index: false }, // personal results stay out of search
    openGraph: { type: 'website', siteName: SITE.name, locale: 'en_US', url: `/r/${code}`, title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

async function ResultView({ params }: { params: PageProps<'/r/[code]'>['params'] }) {
  const { code } = await params;
  const r = decodeResult(code);
  if (!r) notFound();
  const podium = r.rank <= 3;
  return (
    <div className="center join-page result-page" data-theme={r.theme}>
      <Link href="/" className="logo" style={{ position: 'relative' }}>Buzzline<span className="dot" /></Link>
      <div className="card result-card pop">
        <span className="pill">{r.title}</span>
        <div className="result-who"><Avatar i={r.avatar} size={64} /><b>{r.name}</b></div>
        <Scallop color={['var(--butter)', 'var(--lilac)', 'var(--pink)'][r.rank - 1] ?? 'var(--paper)'} size={150}>
          <span className="bignum">#{r.rank}</span>
        </Scallop>
        <h1>{podium ? <>Came <em>{ordinal(r.rank)}</em></> : <>Finished <em>{ordinal(r.rank)}</em></>}</h1>
        <p className="muted">{r.score.toLocaleString('en')} points · {r.players} player{r.players === 1 ? '' : 's'}</p>
        {/* A plain link: the card route sends the picture as a file to save. */}
        <a className="btn light result-download" href={`/r/${code}/card?download`} download>
          <span aria-hidden>⬇</span> Download card
        </a>
      </div>
      <div className="result-cta">
        <h2>Think you can <em>beat that?</em></h2>
        <p>Make your own quiz in a minute: type a topic and AI writes it. Free, no sign-up.</p>
        <Link href="/host?ai" className="btn">✨ Create a free quiz with AI</Link>
        <Link href="/join" className="result-join">Got a game PIN? Join a game →</Link>
      </div>
    </div>
  );
}

export default function ResultPage({ params }: PageProps<'/r/[code]'>) {
  return (
    <Suspense fallback={<div className="center"><div className="spinner" /></div>}>
      <ResultView params={params} />
    </Suspense>
  );
}
