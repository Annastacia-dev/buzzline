// Header and footer shared by the ready-made quiz pages.
import Link from 'next/link';
import styles from './quiz.module.css';

export function QuizNav() {
  return (
    <nav className={styles.nav}>
      <Link href="/" className="logo">Buzzline<span className="dot" /></Link>
      <div className={styles.navCta}>
        <Link href="/join" className="btn ghost small">Join a game</Link>
        <Link href="/host" className="btn small">Host a quiz</Link>
      </div>
    </nav>
  );
}

export function QuizFooter() {
  return (
    <footer className={styles.footer}>
      <span><Link href="/">Buzzline</Link>: free live quizzes for classrooms, parties and teams.</span>
      <span><Link href="/quiz">All quizzes</Link> · <Link href="/host">Host</Link> · <Link href="/join">Join</Link></span>
    </footer>
  );
}
