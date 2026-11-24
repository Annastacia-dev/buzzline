import type { Metadata } from 'next';
import Link from 'next/link';
import { CATEGORIES, PACKS } from '@/lib/packs';
import { SITE, SITE_URL } from '@/lib/site';
import styles from './quiz.module.css';
import { QuizFooter, QuizNav } from './chrome';

export const metadata: Metadata = {
  title: 'Free ready-made quizzes with answers',
  description: 'Christmas, New Year, pub, office party and classroom quizzes with answers. Host any of them live in one click: players join from their phones with a PIN. Free, no sign-up.',
  alternates: { canonical: '/quiz' },
  openGraph: { title: `Free ready-made quizzes · ${SITE.name}`, url: '/quiz' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Free ready-made quizzes',
  url: `${SITE_URL}/quiz`,
  hasPart: PACKS.map(p => ({ '@type': 'Quiz', name: p.title, url: `${SITE_URL}/quiz/${p.slug}`, description: p.blurb })),
};

export default function QuizIndex() {
  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <QuizNav />
      <header className={styles.head}>
        <span className={styles.tag}>🎄 Christmas packs are in</span>
        <h1>Ready-made quizzes, free to host</h1>
        <p>Every quiz comes with its answers. Press <b>Host this quiz</b> and it opens in your studio, ready to play on a big
          screen while everyone answers from their phones. Change anything you like first.</p>
      </header>
      {CATEGORIES.map(cat => (
        <section key={cat.id} className={styles.section} aria-labelledby={`cat-${cat.id}`}>
          <h2 id={`cat-${cat.id}`}>{cat.title}</h2>
          <p>{cat.blurb}</p>
          <div className={styles.grid}>
            {PACKS.filter(p => p.category === cat.id).map(p => (
              <Link key={p.slug} href={`/quiz/${p.slug}`} className={styles.packCard}>
                <span className={styles.emoji} aria-hidden>{p.emoji}</span>
                <b>{p.title}</b>
                <span>{p.blurb}</span>
                <small>{p.questions.length} questions →</small>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <section className={styles.cta}>
        <h2>Got a topic of your own?</h2>
        <p>Type it in and AI writes the quiz in under a minute.</p>
        <Link href="/host?ai" className="btn">✨ Create a free quiz with AI</Link>
      </section>
      <QuizFooter />
    </div>
  );
}
