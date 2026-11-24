import Link from 'next/link';
import { Shape } from '@/lib/client';
import { Blob, Icon, Scallop, Squircle, Sticker, Tag, type IconName } from '@/lib/deco';
import QuickJoin from './QuickJoin';
import styles from './landing.module.css';
import { FAQ, FEATURES, SITE, SITE_URL } from '@/lib/site';
import { Doodle } from '@/lib/doodles';
import { THEMES, hasDoodles, type ThemeId } from '@/lib/themes';

const steps = [
  { n: '01', title: 'Build your quiz', bg: 'var(--butter)', rows: ['Write questions', 'Set the timers', 'Pick double-points rounds'] },
  { n: '02', title: 'Share the PIN', bg: 'var(--olive)', rows: ['Host screen on the TV', 'Players open the link', 'Type the 6-digit PIN'] },
  { n: '03', title: 'Play it live', bg: 'var(--pink)', rows: ['Everyone answers at once', 'Fastest right answers win', 'Podium at the end'] },
];

const features: { title: string; body: string; bg: string; ink: string; icon: IconName }[] = [
  { title: 'Speed scoring', body: '500 to 1,000 points per right answer. The quicker the tap, the bigger the score.', bg: 'var(--peach)', ink: 'var(--peach-ink)', icon: 'bolt' },
  { title: 'Streak bonuses', body: '+100 for every answer in a row, up to +500. Hot streaks flip the scoreboard.', bg: 'var(--lilac)', ink: 'var(--lilac-ink)', icon: 'flame' },
  { title: 'Double points', body: 'Flag the big questions for 2× so nobody gives up early.', bg: 'var(--mint)', ink: 'var(--mint-ink)', icon: 'sparkle' },
  { title: 'No app, no accounts', body: 'Players join from any phone browser with just a nickname.', bg: 'var(--coral)', ink: 'var(--coral-ink)', icon: 'smile' },
  { title: 'Live answer chart', body: 'See how the room split after every question, then reveal.', bg: 'var(--peri)', ink: 'var(--peri-ink)', icon: 'cursor' },
  { title: 'AI & Kahoot import', body: 'Type a topic and Claude writes the quiz, or import a Kahoot-style spreadsheet. Saved in your browser.', bg: 'var(--butter)', ink: 'var(--butter-ink)', icon: 'star' },
];

// One sample question per theme for the themes section, each shown in that theme's own styles.
const themeSamples: Record<ThemeId, { q: string; answers: string[]; right: number; note: string }> = {
  classic: { q: 'Which planet is known as the Red Planet?', answers: ['Venus', 'Mars', 'Jupiter', 'Mercury'], right: 1, note: 'The default. Bright and loud, made for a TV across the room.' },
  doodlebug: { q: 'How many legs does a bee have?', answers: ['Four', 'Six', 'Eight', 'Ten'], right: 1, note: 'Feels like a notebook. Great for classrooms and family nights.' },
  inkblot: { q: 'Which element has the symbol Fe?', answers: ['Gold', 'Iron', 'Lead', 'Tin'], right: 1, note: 'Crisp and graphic. Suits offices, projectors and team socials.' },
  toybox: { q: 'How many sides does a cube have?', answers: ['Four', 'Six', 'Eight', 'Twelve'], right: 1, note: 'Soft and squishy, like modelling clay. Kids and party crowds love tapping it.' },
  glass: { q: 'Which gas makes up most of the air?', answers: ['Oxygen', 'Nitrogen', 'Argon', 'Helium'], right: 1, note: 'Glowing and dreamy. Looks stunning on a big screen in a dim room.' },
};

const scoring = [
  { k: 'Max points', v: '1,000' },
  { k: 'Streak bonus', v: '+500' },
  { k: 'Double round', v: '2×' },
  { k: 'Players', v: '200' },
];

// Structured data for search engines and AI answer engines: the app itself, the site, and the FAQ below.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE.name, url: SITE_URL, description: SITE.description, inLanguage: 'en' },
    {
      '@type': 'WebApplication', '@id': `${SITE_URL}/#app`, name: SITE.name, url: SITE_URL, description: SITE.description,
      applicationCategory: 'GameApplication', applicationSubCategory: 'Quiz game', operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires a modern web browser with JavaScript', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: FEATURES, image: `${SITE_URL}/share/home.jpg`, screenshot: `${SITE_URL}/share/home.jpg`,
      audience: { '@type': 'Audience', audienceType: 'Teachers, event hosts, teams and friends running quiz nights' },
    },
    {
      '@type': 'FAQPage', '@id': `${SITE_URL}/#faq`,
      mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ],
};

export default function Landing() {
  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className={styles.nav}>
        <Link href="/" className="logo">Buzzline<span className="dot" /></Link>
        <div className={styles.navLinks}>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#themes">Themes</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className={styles.navCta}>
          <Link href="/join" className="btn ghost small">Join a game</Link>
          <Link href="/host" className="btn small">Host a quiz</Link>
        </div>
      </nav>

      {/* ---------- hero ---------- */}
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <Tag icon="sparkle" bg="var(--lilac)" ink="var(--lilac-ink)" rotate={-3}>Live multiplayer quizzes</Tag>
          <h1>Quiz night,<br /><em>just for your</em><br />crowd.</h1>
          <p>Questions on the big screen, answers on every phone, and the quickest right answers climb the board.</p>
          <div className={styles.ctaRow}>
            <Link href="/host" className="btn">Host a quiz <span aria-hidden>→</span></Link>
            <QuickJoin />
          </div>
        </div>

        <div className={styles.collage} aria-hidden>
          <Blob color="var(--olive)" size={150} className={styles.cBlob} />
          <Squircle color="var(--butter)" size={230} rotate={-14} className={styles.cSquare}>
            <div className={styles.shapeLabel}><b>Pop quiz</b><span>21/11</span></div>
          </Squircle>
          <Scallop color="var(--pink)" size={190} rotate={-28} className={styles.cScallop}>
            <div className={styles.shapeLabel}><b>Trivia night</b><span>05/12</span></div>
          </Scallop>
          <div className={styles.cCircle}>
            <div className={styles.shapeLabel} style={{ rotate: '24deg' }}><b>Team social</b><span>every Friday</span></div>
          </div>

          <div className={styles.liveCard}>
            <div className={styles.liveTop}><span className="pill dark">Q 3 / 10</span><span className={styles.liveTimer}>12</span></div>
            <div className={styles.liveQ}>Which planet is known as the Red Planet?</div>
            <div className={styles.liveTiles}>
              {['Venus', 'Mars', 'Jupiter', 'Mercury'].map((a, i) => (
                <div key={a} className={`tile c${i} ${i === 1 ? 'right' : ''}`}><Shape i={i} />{a}</div>
              ))}
            </div>
          </div>

          <Sticker text="fastest finger first · buzz in · " icon="bolt" bg="var(--sage)" ink="var(--sage-ink)" size={136} rotate={12} className={styles.cSticker} />
          <div className={styles.cBubble}>+940 <Icon name="flame" size={18} /></div>
        </div>
      </header>

      {/* ---------- tag strip ---------- */}
      <div className={styles.tagStrip} aria-hidden>
        <Tag icon="smile" bg="var(--peri)" ink="var(--peri-ink)" rotate={-4}>Fearless</Tag>
        <Tag icon="bolt" bg="var(--lilac)" ink="var(--lilac-ink)" rotate={3}>Quick-fire</Tag>
        <Sticker text="doing my best · doing my best · " icon="star" bg="var(--butter)" ink="var(--butter-ink)" size={110} rotate={-8} />
        <Tag icon="sparkle" bg="var(--pink)" ink="var(--pink-ink)" rotate={-2}>Brainy</Tag>
        <Tag icon="flame" bg="var(--sage)" ink="var(--sage-ink)" rotate={4}>On a streak</Tag>
        <Tag icon="cursor" bg="var(--butter)" ink="var(--butter-ink)" rotate={-3}>Tap fast</Tag>
      </div>

      {/* ---------- how it works ---------- */}
      <section id="how" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Three steps to <em>a loud room</em></h2>
        </div>
        <div className={styles.steps}>
          {steps.map(s => (
            <div key={s.n} className={styles.step} style={{ background: s.bg }}>
              <div className={styles.stepTop}><h3>{s.title}</h3><span className={styles.stepN}>{s.n}</span></div>
              <div className={styles.stepRows}>
                {s.rows.map((r, i) => (
                  <div key={r} className={`${styles.stepRow} ${i === 0 ? styles.stepRowOn : ''}`}>{r}<span aria-hidden>›</span></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- scoring card ---------- */}
      <section className={styles.scoreCard}>
        <div className={styles.scoreHead}>
          <span className={styles.scoreIcon}><Icon name="trophy" size={22} stroke={7} /></span>
          <div><b>How scoring works</b><span>Speed + accuracy + streaks</span></div>
        </div>
        <div className={styles.scoreGrid}>
          {scoring.map(s => <div key={s.k}><span>{s.k}</span><b>{s.v}</b></div>)}
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Built for <em>game-show</em> energy</h2>
        </div>
        <div className={styles.features}>
          {features.map(f => (
            <div key={f.title} className={styles.feature} style={{ background: f.bg }}>
              <div className={styles.featureTop}>
                <h3>{f.title}</h3>
                <span className={styles.featureIcon} style={{ color: f.ink }}><Icon name={f.icon} size={20} stroke={7} /></span>
              </div>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- themes ---------- */}
      <section id="themes" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Pick a look <em>for the room</em></h2>
          <p className={styles.sectionLede}>
            Every quiz can wear a theme. Choose it in the studio and the host screen, the join page and every
            player&apos;s phone all match.
          </p>
        </div>
        <div className={styles.themes}>
          {THEMES.map((t, i) => {
            const ex = themeSamples[t.id];
            return (
              <figure key={t.id} className={styles.theme}>
                <div className={styles.themeStage} data-theme={t.id} aria-hidden>
                  {!hasDoodles(t.id)
                    ? <Scallop color="var(--pink)" size={120} rotate={-18} className={styles.themeDeco} />
                    : <Doodle theme={t.id} name="mascot" size={66} className={`bob ${styles.themeMascot}`} />}
                  <div className={`card ${styles.themeCard}`}>
                    <div className={styles.liveTop}><span className="pill dark">Q {i + 2} / 10</span><span className={styles.liveTimer}>{[12, 9, 15, 11, 7][i]}</span></div>
                    <div className={styles.liveQ}>{ex.q}</div>
                    <div className={styles.liveTiles}>
                      {ex.answers.map((a, j) => <div key={a} className={`tile c${j} ${j === ex.right ? 'right' : ''}`}><Shape i={j} />{a}</div>)}
                    </div>
                  </div>
                </div>
                <figcaption>
                  <h3>{t.name}</h3>
                  <p>{t.blurb}. {ex.note}</p>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      {/* ---------- FAQ (also published as structured data above) ---------- */}
      <section id="faq" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Questions, <em>answered</em></h2>
        </div>
        <div className={styles.faq}>
          {FAQ.map((f, i) => (
            <details key={f.q} className={styles.faqItem} open={i === 0}>
              <summary><h3>{f.q}</h3><span className={styles.faqIcon} aria-hidden>+</span></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- closing ---------- */}
      <section className={styles.closing}>
        <h2>Ask.<br />Buzz.<br />Repeat.</h2>
        <div className={styles.closingSide}>
          <Sticker text="create with purpose · " icon="bolt" bg="var(--lilac)" ink="var(--lilac-ink)" size={150} rotate={-10} />
          <Sticker text="quiz is my superpower · " icon="flame" bg="var(--pink)" ink="var(--pink-ink)" size={130} rotate={14} />
          <p>Your first quiz is already waiting in the studio. Hit host, share the PIN, and let the room do the rest.</p>
          <Link href="/host" className="btn">Start hosting <span aria-hidden>→</span></Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className="logo" style={{ fontSize: 20 }}>Buzzline<span className="dot" /></span>
        <nav className={styles.footerLinks} aria-label="Footer">
          <Link href="/host">Host a quiz</Link>
          <Link href="/join">Join a game</Link>
          <a href="#faq">FAQ</a>
        </nav>
        <span>Made for classrooms, team socials and quiz nights.</span>
      </footer>
    </div>
  );
}
