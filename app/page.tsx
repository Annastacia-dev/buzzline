import Link from 'next/link';
import { Shape } from '@/lib/client';
import { Icon, Scallop, type IconName } from '@/lib/deco';
import { Avatar } from '@/lib/avatars';
import QuickJoin from './QuickJoin';
import styles from './landing.module.css';
import { FAQ, FEATURES, SITE, SITE_URL } from '@/lib/site';
import { Doodle } from '@/lib/doodles';
import { THEMES, hasDoodles, type ThemeId } from '@/lib/themes';

const steps = [
  { n: '1', title: 'Type a topic', body: 'AI writes the questions in seconds. Edit anything, or write your own.' },
  { n: '2', title: 'Pick a theme', body: 'The big screen, the join page and every phone take on the same look.' },
  { n: '3', title: 'Share the PIN', body: 'Players join from any phone browser with a nickname. No app, no accounts.' },
];

const features: { title: string; body: string; tint: string; ink: string; icon: IconName }[] = [
  { title: 'AI writes your quiz', body: 'Pick a topic, how many questions and how hard. Claude drafts it; you tweak what you like.', tint: 'var(--lilac)', ink: 'var(--lilac-ink)', icon: 'sparkle' },
  { title: 'Free, no sign-up', body: 'Hosting and playing are free. No accounts, no app, no ads between rounds.', tint: 'var(--sage)', ink: 'var(--sage-ink)', icon: 'smile' },
  { title: 'Eleven themes', body: 'From Classic pastels to Glass, Polaroid, Messages, Comic and Tarot, matched across every screen.', tint: 'var(--pink)', ink: 'var(--pink-ink)', icon: 'star' },
  { title: 'Speed scoring', body: '500 to 1,000 points per right answer, streak bonuses and double-points rounds.', tint: 'var(--butter)', ink: 'var(--butter-ink)', icon: 'bolt' },
  { title: 'Pictures & grid reveal', body: 'Add a picture to any question, and reveal it tile by tile as the clock runs.', tint: 'var(--peri)', ink: 'var(--peri-ink)', icon: 'cursor' },
  { title: 'Kahoot import', body: 'Bring a Kahoot-style spreadsheet, or share a quiz with a link.', tint: 'var(--peach)', ink: 'var(--peach-ink)', icon: 'flame' },
];

// One sample question per theme for the themes section, each shown in that theme's own styles.
const themeSamples: Record<ThemeId, { q: string; answers: string[]; right: number; note: string }> = {
  classic: { q: 'Which planet is known as the Red Planet?', answers: ['Venus', 'Mars', 'Jupiter', 'Mercury'], right: 1, note: 'The default. Bright and loud, made for a TV across the room.' },
  doodlebug: { q: 'How many legs does a bee have?', answers: ['Four', 'Six', 'Eight', 'Ten'], right: 1, note: 'Feels like a notebook. Great for classrooms and family nights.' },
  inkblot: { q: 'Which element has the symbol Fe?', answers: ['Gold', 'Iron', 'Lead', 'Tin'], right: 1, note: 'Crisp and graphic. Suits offices, projectors and team socials.' },
  toybox: { q: 'How many sides does a cube have?', answers: ['Four', 'Six', 'Eight', 'Twelve'], right: 1, note: 'Soft and squishy, like modelling clay. Kids and party crowds love tapping it.' },
  glass: { q: 'Which gas makes up most of the air?', answers: ['Oxygen', 'Nitrogen', 'Argon', 'Helium'], right: 1, note: 'Glowing and dreamy. Looks stunning on a big screen in a dim room.' },
  retro: { q: 'How many bits are in a byte?', answers: ['Four', 'Eight', 'Ten', 'Sixteen'], right: 1, note: 'Boots up like a 90s computer. Great for tech teams and nostalgia nights.' },
  receipt: { q: 'Which country uses the yen?', answers: ['Japan', 'China', 'India', 'Peru'], right: 0, note: 'Printed fresh for every question. Fun for cafés, shops and finance teams.' },
  polaroid: { q: 'Where is Machu Picchu?', answers: ['Chile', 'Mexico', 'Peru', 'Spain'], right: 2, note: 'Like flicking through an album. Lovely for birthdays, reunions and travel quizzes.' },
  messages: { q: 'What does “brb” stand for?', answers: ['Be right back', 'Big red bus', 'Bring real bread', 'Best read before'], right: 0, note: 'Feels like the group chat. Fun for friends, teens and pop culture rounds.' },
  comic: { q: 'Which of these is a sound word?', answers: ['Purple', 'Splash', 'Quickly', 'Cape'], right: 1, note: 'POW! Loud and punchy. Great for kids, film nights and big rooms.' },
  tarot: { q: 'Which sign is a pair of twins?', answers: ['Leo', 'Virgo', 'Gemini', 'Aries'], right: 2, note: 'Moody and magical. Made for Halloween, astrology and late-night quizzes.' },
};

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

/** The hero's moving column: real game screens, each in a different theme. Rendered twice so the loop is seamless. */
function Screens({ copy = false }: { copy?: boolean }) {
  const board = [
    { name: 'Maya', avatar: 3, score: 4820, gained: 940 },
    { name: 'Theo', avatar: 9, score: 4310, gained: 720 },
    { name: 'Priya', avatar: 13, score: 3975, gained: 610 },
  ];
  return (
    <div className={styles.screens} aria-hidden={copy || undefined}>
      <figure className={styles.screen}>
        <div className={`${styles.screenStage} ${styles.flashScreen}`} data-theme="classic">
          <div className="flash-deck preview">
            <article className="card pcard flash">
              <header><span className="pill dark">Question 3</span><span className="pill">⏱ 20s</span></header>
              <h2>Which planet is known as the Red Planet?</h2>
              <div className="pans">
                {['Venus', 'Mars', 'Jupiter', 'Mercury'].map((a, i) => <div key={a} className={`pans-tile c${i}`}><Shape i={i} /><span>{a}</span></div>)}
              </div>
            </article>
          </div>
        </div>
        <figcaption>The question · Classic</figcaption>
      </figure>

      <figure className={styles.screen}>
        <div className={`${styles.screenStage} ${styles.joinScreen}`} data-theme="glass">
          <span className="pill">Join at buzzline.click</span>
          <div className={styles.joinPin}><span>Game PIN</span><b>482 913</b></div>
          <div className={`ring ${styles.count}`}><span>5</span></div>
          <div className={styles.joinWho}>
            {[0, 5, 14, 20, 2, 11].map(a => <Avatar key={a} i={a} size={34} />)}
            <span className="pill">12 players</span>
          </div>
        </div>
        <figcaption>Countdown to start · Glass</figcaption>
      </figure>

      <figure className={styles.screen}>
        <div className={styles.screenStage} data-theme="toybox">
          <div className={styles.miniTitle}>Score<em>board</em></div>
          <div className={`board ${styles.miniBoard}`}>
            {board.map((p, i) => (
              <div key={p.name} className="row">
                <span className="r">{i + 1}</span><Avatar i={p.avatar} size={30} /><span className="n">{p.name}</span>
                <span className="g">+{p.gained}</span><b>{p.score.toLocaleString()}</b>
              </div>
            ))}
          </div>
        </div>
        <figcaption>Scoreboard · Toybox</figcaption>
      </figure>

      <figure className={styles.screen}>
        <div className={styles.screenStage} data-theme="doodlebug">
          <div className={styles.miniTitle}>And the winner <em>is…</em></div>
          <div className={`podium ${styles.miniPodium}`}>
            {[{ r: 2, h: 70, c: 'var(--lilac)', p: board[1] }, { r: 1, h: 100, c: 'var(--butter)', p: board[0] }, { r: 3, h: 50, c: 'var(--pink)', p: board[2] }].map(s => (
              <div key={s.r} className="in">
                <div className="who"><Avatar i={s.p.avatar} size={s.r === 1 ? 46 : 36} /><div className="name">{s.p.name}</div></div>
                <div className="block" style={{ height: s.h, background: s.c }}><span className="m">{s.r}</span></div>
              </div>
            ))}
          </div>
        </div>
        <figcaption>The podium · Doodlebug</figcaption>
      </figure>
    </div>
  );
}

export default function Landing() {
  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className={styles.nav}>
        <Link href="/" className="logo">Buzzline<span className="dot" /></Link>
        <div className={styles.navLinks}>
          <a href="#how">How it works</a>
          <Link href="/quiz">Quizzes</Link>
          <a href="#themes">Themes</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className={styles.navCta}>
          <Link href="/join" className="btn ghost small">Join a game</Link>
          <Link href="/host" className="btn small">Host a quiz</Link>
        </div>
      </nav>

      {/* ---------- hero: one message, one main button, the game moving beside it ---------- */}
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.freeTag}>100% free · no sign-up · no app</span>
          <h1>Type a topic.<br /><em>Play in a minute.</em></h1>
          <p>AI writes the questions, you pick a theme, and everyone plays live from their phones.</p>
          <div className={styles.ctaRow}>
            <Link href="/host?ai" className={`btn ${styles.mainCta}`}>✨ Create a free quiz with AI</Link>
            <Link href="/host" className={styles.textLink}>or write your own →</Link>
          </div>
          <ul className={styles.points}>
            <li><Icon name="smile" size={18} stroke={7} />Free for everyone</li>
            <li><Icon name="sparkle" size={18} stroke={7} />AI quiz maker</li>
            <li>
              <span className={styles.swatches} aria-hidden>{THEMES.map(t => <i key={t.id} style={{ background: t.swatch[1] }} />)}</span>
              <a href="#themes">{THEMES.length} themes</a>
            </li>
          </ul>
          <div className={styles.joinRow}><span>Got a game PIN?</span><QuickJoin /></div>
        </div>

        <div className={styles.reel}>
          <div className={styles.reelTrack}>
            <Screens />
            <Screens copy />
          </div>
        </div>
      </header>

      {/* ---------- how it works ---------- */}
      <section id="how" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>From idea to <em>a loud room</em></h2>
        </div>
        <ol className={styles.steps}>
          {steps.map(s => (
            <li key={s.n} className={styles.step}>
              <span className={styles.stepN}>{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- features ---------- */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Everything a quiz night <em>needs</em></h2>
        </div>
        <div className={styles.features}>
          {features.map(f => (
            <div key={f.title} className={styles.feature}>
              <span className={styles.featureIcon} style={{ background: f.tint, color: f.ink }}><Icon name={f.icon} size={20} stroke={7} /></span>
              <h3>{f.title}</h3>
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
                    <div className={styles.liveTop}><span className="pill dark">Q {i + 1} / 12</span><span className={styles.liveTimer}>{[12, 9, 15, 11, 7, 10, 14, 8, 13, 6, 16][i]}</span></div>
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
        <h2>Your next quiz night is <em>one topic away.</em></h2>
        <p>Free, no sign-up. Pick a topic and you&apos;re hosting in about a minute.</p>
        <Link href="/host?ai" className={`btn ${styles.mainCta}`}>✨ Create a free quiz with AI</Link>
        <Link href="/quiz" className={styles.textLink}>or pick a ready-made Christmas quiz →</Link>
      </section>

      <footer className={styles.footer}>
        <span className="logo" style={{ fontSize: 20 }}>Buzzline<span className="dot" /></span>
        <nav className={styles.footerLinks} aria-label="Footer">
          <Link href="/host">Host a quiz</Link>
          <Link href="/join">Join a game</Link>
          <Link href="/quiz">Ready-made quizzes</Link>
          <a href="#faq">FAQ</a>
        </nav>
        <span>Made for classrooms, team socials and quiz nights.</span>
      </footer>
    </div>
  );
}
