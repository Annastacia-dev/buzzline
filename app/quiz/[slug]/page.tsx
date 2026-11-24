import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORIES, PACKS, packBySlug } from '@/lib/packs';
import { KINDS, kindOf } from '@/lib/kinds';
import { SITE, SITE_URL } from '@/lib/site';
import { THEMES } from '@/lib/themes';
import { QuizFooter, QuizNav } from '../chrome';
import styles from '../quiz.module.css';

/** Every ready-made quiz is built into a static page. */
export function generateStaticParams() {
  return PACKS.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/quiz/[slug]'>): Promise<Metadata> {
  const pack = packBySlug((await params).slug);
  if (!pack) return { title: 'Quiz not found', robots: { index: false } };
  const title = `${pack.title}: ${pack.questions.length} questions and answers`;
  return {
    title, description: `${pack.blurb} Free to host live: players join from their phones.`,
    alternates: { canonical: `/quiz/${pack.slug}` },
    openGraph: { title: `${title} · ${SITE.name}`, url: `/quiz/${pack.slug}` },
  };
}

/** The right answer, written out for the page. */
function answerText(q: (typeof PACKS)[number]['questions'][number]) {
  const kind = kindOf(q);
  if (kind === 'poll') return null;
  if (kind === 'order') return q.answers.join(' → ');
  if (kind === 'type') return q.answers[0];
  return q.answers[q.correct];
}

export default async function PackPage({ params }: PageProps<'/quiz/[slug]'>) {
  const pack = packBySlug((await params).slug);
  if (!pack) notFound();
  const cat = CATEGORIES.find(c => c.id === pack.category)!;
  const theme = THEMES.find(t => t.id === pack.theme);
  const minutes = Math.max(1, Math.round(pack.questions.reduce((t, q) => t + q.time + 15, 0) / 60));
  const related = PACKS.filter(p => p.category === pack.category && p.slug !== pack.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: pack.title, description: pack.blurb, url: `${SITE_URL}/quiz/${pack.slug}`, inLanguage: 'en', isAccessibleForFree: true,
    hasPart: pack.questions.filter(q => kindOf(q) !== 'poll').map(q => ({
      '@type': 'Question', name: q.q, eduQuestionType: kindOf(q) === 'choice' ? 'Multiple choice' : kindOf(q) === 'type' ? 'Short answer' : 'Ordering',
      acceptedAnswer: { '@type': 'Answer', text: answerText(q) },
    })),
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <QuizNav />
      <header className={styles.head}>
        <span className={styles.crumbs}><Link href="/quiz">Ready-made quizzes</Link> · {cat.title}</span>
        <h1><span aria-hidden>{pack.emoji}</span> {pack.title}</h1>
        <p>{pack.blurb}</p>
        <div className={styles.meta}>
          <span className="pill">{pack.questions.length} questions</span>
          <span className="pill">About {minutes} min</span>
          {theme && <span className="pill">{theme.name} theme</span>}
          {pack.questions.some(q => q.kind === 'type') && <span className="pill">⌨️ Typed answers</span>}
          {pack.questions.some(q => q.kind === 'order') && <span className="pill">↕️ Put in order</span>}
        </div>
        <div className={styles.actions}>
          <Link href={`/host?pack=${pack.slug}`} className="btn">Host this quiz, free <span aria-hidden>→</span></Link>
          <span className="muted">Opens in your studio. No sign-up.</span>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="questions">
        <h2 id="questions">Questions and answers</h2>
        <p>Hosting it? Keep the answers hidden: players see the questions on the big screen and answer on their phones.</p>
        <ol className={styles.questions}>
          {pack.questions.map((q, i) => {
            const kind = kindOf(q);
            const answer = answerText(q);
            return (
              <li key={i} className={styles.question}>
                <h3><span className={styles.qn}>{i + 1}</span>{q.q}</h3>
                {kind !== 'choice' && <span className={styles.kind}>{KINDS.find(k => k.id === kind)?.icon} {KINDS.find(k => k.id === kind)?.name}</span>}
                {(kind === 'choice' || kind === 'poll') && (
                  <ul className={styles.options}>{q.answers.map((a, j) => <li key={j} className={`c${j}`}>{a}</li>)}</ul>
                )}
                {kind === 'order' && (
                  <ul className={styles.options}>{[...q.answers].sort((a, b) => a.localeCompare(b)).map((a, j) => <li key={j} className={`c${j}`}>{a}</li>)}</ul>
                )}
                {answer && (
                  <details>
                    <summary>Show answer</summary>
                    <span className={styles.answer}>{answer}</span>
                    {kind === 'type' && q.answers.length > 1 && <span className="muted"> (also accepted: {q.answers.slice(1).join(', ')})</span>}
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className={styles.cta}>
        <h2>Play it live with your crowd</h2>
        <p>Big screen for the questions, phones for the answers, a podium at the end.</p>
        <Link href={`/host?pack=${pack.slug}`} className="btn">Host this quiz <span aria-hidden>→</span></Link>
      </section>

      {related.length > 0 && (
        <section className={styles.section} aria-labelledby="more">
          <h2 id="more">More {cat.title.toLowerCase()} quizzes</h2>
          <div className={styles.grid}>
            {related.map(p => (
              <Link key={p.slug} href={`/quiz/${p.slug}`} className={styles.packCard}>
                <span className={styles.emoji} aria-hidden>{p.emoji}</span><b>{p.title}</b><small>{p.questions.length} questions →</small>
              </Link>
            ))}
          </div>
        </section>
      )}
      <QuizFooter />
    </div>
  );
}
