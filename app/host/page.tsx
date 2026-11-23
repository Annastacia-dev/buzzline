'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api, refreshGame, Shape, useGameStream, useNow, type Stamped } from '@/lib/client';
import { Music, Sound, SoundToggle } from '@/lib/sound';
import { Avatar } from '@/lib/avatars';
import { Confetti } from '@/lib/confetti';
import { podiumTimeline } from '@/lib/podium';
import { useAlertDialog } from '@/lib/dialog';
import { QuizSelect } from '@/lib/select';
import Analytics from './Analytics';
import { READY_MS, type HostView, type EndView, type Quiz } from '@/lib/types';
import QRCode from 'qrcode';
import { Blob, Icon, Scallop, Sticker } from '@/lib/deco';
import Studio from './Studio';
import { Doodle } from '@/lib/doodles';
import { themeInk } from '@/lib/themes';

type HostSession = { pin: string; token: string };

export default function HostPage() {
  const [session, setSession] = useState<HostSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  // Resume the game if the host refreshes the page.
  useEffect(() => {
    const s = sessionStorage.getItem('bz.host');
    if (s) setSession(JSON.parse(s));
    setReady(true);
  }, []);

  async function host(quiz: Quiz) {
    setError('');
    try {
      const s = await api<HostSession>('/api/game', { quiz });
      sessionStorage.setItem('bz.host', JSON.stringify(s));
      setSession(s);
    } catch (e) { setError((e as Error).message); }
  }

  function leave() { sessionStorage.removeItem('bz.host'); setSession(null); }

  // Render a loading shell (not null) before the session is read, so the server has something to prerender.
  if (!ready) return <div className="center" aria-busy="true"><div className="spinner" /></div>;
  if (!session) return <Studio onHost={host} error={error} />;
  return <Stage session={session} onLeave={leave} />;
}

function Stage({ session, onLeave }: { session: HostSession; onLeave: () => void }) {
  const v = useGameStream<HostView | EndView>({ ...session, role: 'host' });
  const [err, setErr] = useState('');
  // The button that was just pressed, shown as pending until the screen moves on.
  const [busy, setBusy] = useState('');
  // Auto mode: reveal → scoreboard → next question without clicks. Remembered in this browser.
  const [auto, setAutoState] = useState(false);
  useEffect(() => { setAutoState(localStorage.getItem('bz.auto') === '1'); }, []);
  const setAuto = (on: boolean) => { setAutoState(on); localStorage.setItem('bz.auto', on ? '1' : '0'); };
  // How long the reveal and scoreboard stay up before auto mode moves on; the host picks it.
  const [autoSecs, setAutoSecsState] = useState(DEFAULT_AUTO_SECS);
  useEffect(() => {
    const n = Number(localStorage.getItem('bz.autoSecs'));
    if (AUTO_CHOICES.includes(n)) setAutoSecsState(n);
  }, []);
  const setAutoSecs = (n: number) => { setAutoSecsState(n); localStorage.setItem('bz.autoSecs', String(n)); };
  const [dialog, ask] = useAlertDialog();
  const [report, setReport] = useState(false);
  const step = v && 'qIndex' in v ? `${v.state}:${v.qIndex}` : v?.state;

  useEffect(() => { if (v?.state === 'closed') onLeave(); }, [v?.state, onLeave]);
  useEffect(() => { setBusy(''); }, [step]);
  useEffect(() => () => Music.stop(), []);
  if (!v || v.state === 'closed' || v.state === 'kicked') return <div className="center"><div className="spinner" /></div>;
  const h = v as Stamped<HostView>;

  const act = async (action: string, extra: object = {}) => {
    const moves = action === 'start' || action === 'next' || action === 'skip';
    if (moves && busy) return; // already on its way
    setErr('');
    if (moves) { setBusy(action); Sound.lock(); }
    try {
      await api('/api/host', { ...session, action, ...extra });
      refreshGame(); // don't wait for the realtime ping to show our own move
    } catch (e) { setErr((e as Error).message); setBusy(''); }
  };

  return (
    <div className="stage" data-theme={h.theme}>
      <div className="stage-top">
        <div className="logo">Buzzline<span className="dot" /></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {h.qIndex >= 0 && <span className="pill">Question {Math.min(h.qIndex + 1, h.total)} / {h.total}</span>}
          <span className="pill">PIN {h.pin}</span>
          <button type="button" className={`pill auto-toggle ${auto ? 'on' : ''}`} aria-pressed={auto} onClick={() => setAuto(!auto)}
            title="Move on automatically after each answer reveal and scoreboard">
            <span className="switch" aria-hidden />Auto
          </button>
          {auto && (
            <QuizSelect size="sm" icon="⏱" className="auto-secs" label="Seconds before auto mode moves on" value={autoSecs}
              onChange={setAutoSecs} options={AUTO_CHOICES.map(n => ({ value: n, label: `${n}s` }))} />
          )}
          <SoundToggle />
          {/* On the podium the game is over: no "End game", the report instead. */}
          {h.state === 'end'
            ? <button className="btn small" onClick={() => setReport(true)}>Analytics</button>
            : <button className="btn ghost small" onClick={async () => {
                if (await ask({ title: 'End this game?', message: 'Everyone will be sent out of the game and the scores will be lost.', confirm: 'End game', cancel: 'Keep playing', danger: true })) act('end');
              }}>End game</button>}
        </div>
      </div>
      {dialog}
      {err && <div className="error" style={{ textAlign: 'center' }}>{err}</div>}
      {h.state === 'lobby' && <Lobby h={h} act={act} busy={busy} />}
      {h.state === 'question' && <QuestionScreen key={h.qIndex} h={h} act={act} busy={busy} />}
      {h.state === 'reveal' && <Reveal h={h} act={act} busy={busy} auto={auto} autoSecs={autoSecs} />}
      {h.state === 'leaderboard' && <Leaderboard h={h} act={act} busy={busy} auto={auto} autoSecs={autoSecs} />}
      {/* Leaving the podium keeps the game, so phones keep their results; idle games are cleaned up after 6 hours. */}
      {h.state === 'end' && <Podium h={h} onLeave={onLeave} onReport={() => setReport(true)} />}
      {report && <Analytics pin={session.pin} token={session.token} onClose={() => setReport(false)} />}
    </div>
  );
}

type ScreenProps = { h: Stamped<HostView>; act: (a: string, extra?: object) => void; busy: string; auto?: boolean; autoSecs?: number };

/** Seconds the reveal and scoreboard stay up in auto mode before moving on: the host's choice, 3 by default. */
const AUTO_CHOICES = [3, 5, 6, 8, 10, 15, 20, 30];
const DEFAULT_AUTO_SECS = 3;

/**
 * The "move on" button. In auto mode it fills up over `secs` and presses itself; clicking still works,
 * and switching auto off part-way cancels it (switching back on restarts the countdown).
 */
function NextButton({ label, act, busy, auto, secs }: { label: string; act: ScreenProps['act']; busy: string; auto?: boolean; secs: number }) {
  // The timer must call the latest act: the one from the first render still thinks the previous move is pending.
  const latest = useRef(act);
  useEffect(() => { latest.current = act; });
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => latest.current('next'), secs * 1000);
    return () => clearTimeout(t);
  }, [auto, secs]);
  return (
    <button className={`btn ${auto ? 'auto-next' : ''}`} onClick={() => act('next')} aria-busy={busy === 'next'}
      style={auto ? ({ '--auto': `${secs}s` } as React.CSSProperties) : undefined}>
      {auto && <span key={secs} className="auto-fill" aria-hidden />}
      {label}{auto && <span className="sr-only"> (moves on automatically in {secs} seconds)</span>}
    </button>
  );
}

function Lobby({ h, act, busy }: ScreenProps) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [qr, setQr] = useState('');
  useEffect(() => { Music.play('lobby'); }, []);
  // Pop for every new player.
  const seen = useRef(h.players.length);
  useEffect(() => {
    if (h.players.length > seen.current) Sound.pop();
    seen.current = h.players.length;
  }, [h.players.length]);
  // Only a host page opened on this machine (localhost) needs the LAN address so phones can reach it.
  // Anywhere else (a deployed site, or a LAN IP) the address in the browser bar is already the right one.
  useEffect(() => {
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (!local) { setUrls([]); return; }
    fetch('/api/info').then(r => r.json()).then(d => setUrls(d.urls)).catch(() => setUrls([]));
  }, []);
  const bare = (u: string) => u.replace(/^https?:\/\//, '') + '/join';
  const joinUrl = urls?.[0] ?? (typeof location !== 'undefined' ? location.origin : '');

  // QR opens the join page with the PIN filled in. Waits for the address so it never encodes the wrong one.
  useEffect(() => {
    if (!urls) return;
    QRCode.toString(`${joinUrl}/join?pin=${h.pin}`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: themeInk(h.theme), light: '#ffffff' } })
      .then(setQr).catch(() => setQr(''));
  }, [urls, joinUrl, h.pin, h.theme]);

  return (
    <>
      <Blob color="var(--olive)" size={260} style={{ position: 'absolute', top: 90, left: -90 }} />
      <Scallop color="var(--pink)" size={240} rotate={18} style={{ position: 'absolute', bottom: -70, right: -60 }} />
      {h.theme !== 'classic' && <>
        <Doodle theme={h.theme} name="mascot" size={220} className="float bob" style={{ bottom: 40, left: 40 }} />
        <Doodle theme={h.theme} name="arrow" size={150} rotate={-6} className="float" style={{ top: 150, right: '6%' }} />
        <Doodle theme={h.theme} name="bulb" size={100} rotate={12} className="float" style={{ bottom: 36, right: 48 }} />
      </>}
      <div className="pinbox" style={{ alignSelf: 'center' }}>
        {h.theme !== 'classic' && <Doodle theme={h.theme} name="sparkles" size={84} className="float" style={{ top: -42, left: -46 }} />}
        <Sticker text="fastest finger first · buzz in · " icon="bolt" bg="var(--sage)" ink="var(--sage-ink)" size={120} rotate={-14}
          style={{ position: 'absolute', top: -44, left: -56 }} />
        <div className="qr">
          {qr ? <div className="qr-code" role="img" aria-label="QR code to join this game" dangerouslySetInnerHTML={{ __html: qr }} /> : <div className="qr-code" />}
          <span>Scan to join</span>
        </div>
        <div>
          <div className="label">Join at</div>
          <div className="url">{bare(joinUrl)}</div>
          {urls && urls.length > 1 && <div className="label" style={{ marginTop: 4 }}>or {urls.slice(1).map(bare).join(', ')}</div>}
        </div>
        <div>
          <div className="label">Game PIN</div>
          <div className="pin">{h.pin.slice(0, 3)} {h.pin.slice(3)}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}><h2 style={{ fontSize: 40 }}>{h.title}</h2></div>
      <div className="stage-top" style={{ maxWidth: 1100, width: '100%', margin: '0 auto', position: 'relative' }}>
        <div className="stat"><b>{h.players.length}</b><span>player{h.players.length === 1 ? '' : 's'}</span></div>
        <button className="btn" onClick={() => act('start')} disabled={!h.players.length} aria-busy={busy === 'start'} style={{ fontSize: 22, padding: '18px 44px' }}>Start game <span aria-hidden>→</span></button>
      </div>
      <div className="chips" style={{ flex: 1, position: 'relative' }}>
        {h.players.length === 0 && <p className="muted">Waiting for players…</p>}
        {h.players.map(p => (
          <button key={p.id} className="chip pop" title="Click to remove" onClick={() => act('kick', { playerId: p.id })}>
            <Avatar i={p.avatar} size={36} />{p.name}
          </button>
        ))}
      </div>
    </>
  );
}

function Ring({ left, total }: { left: number; total: number }) {
  const r = 58, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, left / total));
  return (
    <div className="ring">
      <svg width="140" height="140">
        <circle cx="70" cy="70" r={r} stroke="var(--line)" strokeWidth="12" fill="none" />
        <circle cx="70" cy="70" r={r} stroke={f < 0.25 ? 'var(--bad)' : 'var(--ink)'} strokeWidth="12" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - f)} strokeLinecap="round" />
      </svg>
      <span>{Math.ceil(left / 1000)}</span>
    </div>
  );
}

function QuestionScreen({ h, act, busy }: ScreenProps) {
  const now = useNow(true);
  const q = h.question!;
  const elapsed = now - h.at;
  const startsIn = (h.startsIn ?? 0) - elapsed;
  const left = Math.max(0, (h.remaining ?? 0) - elapsed);
  const secs = Math.ceil(left / 1000);
  const lastTick = useRef(0);
  const ready = Math.ceil(startsIn / 1000);
  const open = startsIn <= 0;
  // Before the first question: a 10-second "get ready" countdown (lobby music keeps playing), then the usual 3-2-1.
  const intro = h.qIndex === 0 && startsIn > READY_MS;
  const introLeft = Math.ceil((startsIn - READY_MS) / 1000);

  // Get ready: whoosh in, beep on 3-2-1. Open: "go" and the question loop, faster for the last 5 seconds.
  useEffect(() => { if (!intro) { Music.stop(); Sound.whoosh(); } }, [intro]);
  useEffect(() => { if (intro && introLeft > 0) (introLeft <= 3 ? Sound.count : Sound.tick)(); }, [intro, introLeft]);
  useEffect(() => { if (!intro && !open && ready > 0 && ready <= 3) Sound.count(); }, [intro, open, ready]);
  useEffect(() => { if (open && left > 0) { Sound.go(); Music.play('question'); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open && secs <= 5 && secs > 0 && secs !== lastTick.current) { lastTick.current = secs; Sound.tick(); Music.play('hurry'); }
    if (open && secs === 0) Music.stop();
  }, [secs, open]);

  if (intro) {
    return (
      <div className="countdown-overlay intro">
        <Blob color="var(--pink)" size={340} style={{ position: 'absolute', top: -90, left: -70 }} />
        <Scallop color="var(--butter)" size={280} rotate={14} style={{ position: 'absolute', bottom: -70, right: -50 }} />
        <Sticker text="get ready · get ready · get ready · " icon="bolt" bg="var(--sage)" ink="var(--sage-ink)" size={150} rotate={-10}
          className="intro-sticker" style={{ position: 'absolute', top: '5%', right: '4%' }} />
        {h.theme !== 'classic' && <>
          <Doodle theme={h.theme} name="stopwatch" size={170} rotate={10} className="float wiggle" style={{ top: '7%', right: '6%' }} />
          <Doodle theme={h.theme} name="mascot" size={240} className="float bob" style={{ bottom: '6%', left: '4%' }} />
          <Doodle theme={h.theme} name="sparkles" size={90} className="float" style={{ top: '10%', left: '9%' }} />
        </>}
        <div style={{ display: 'grid', gap: 18, justifyItems: 'center', padding: 24, position: 'relative' }}>
          <span className="pill">{h.total} question{h.total === 1 ? '' : 's'} · {h.players.length} player{h.players.length === 1 ? '' : 's'}</span>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 84px)', maxWidth: 1100 }}>{h.title}</h1>
          <p className="intro-sub">Phones ready? The first question is coming in…</p>
          <Scallop color="var(--paper)" size={210} key={introLeft} className="pop" aria-live="off">
            <span className="bignum" style={{ fontSize: 110 }}>{introLeft}</span>
          </Scallop>
          <div className="intro-avatars" aria-label={`${h.players.length} players`}>
            {h.players.slice(0, 24).map((p, i) => <Avatar key={p.id} i={p.avatar} size={44} style={{ animationDelay: `${(i % 12) * 60}ms` }} className="bob" />)}
          </div>
        </div>
      </div>
    );
  }

  if (startsIn > 0) {
    return (
      <div className="countdown-overlay">
        <Blob color="var(--butter)" size={300} style={{ position: 'absolute', top: -80, right: -60 }} />
        <Scallop color="var(--lilac)" size={260} rotate={-12} style={{ position: 'absolute', bottom: -60, left: -40 }} />
        {h.theme !== 'classic' && <>
          <Doodle theme={h.theme} name="question" size={170} rotate={-8} className="float wiggle" style={{ top: '8%', left: '7%' }} />
          <Doodle theme={h.theme} name="bulb" size={110} rotate={10} className="float" style={{ bottom: '8%', right: '8%' }} />
        </>}
        <div style={{ display: 'grid', gap: 22, justifyItems: 'center', padding: 24, position: 'relative' }}>
          <span className="pill">Question {h.qIndex + 1} of {h.total}</span>
          {q.double && <span className="pill dark">2× double points</span>}
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 72px)', maxWidth: 1100 }}>{q.q}</h1>
          <Scallop color="var(--paper)" size={170} key={Math.ceil(startsIn / 1000)} className="pop">
            <span className="bignum" style={{ fontSize: 84 }}>{Math.ceil(startsIn / 1000)}</span>
          </Scallop>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="stage-q">{q.q}</div>
      <div className="stage-mid">
        <Ring left={left} total={q.time * 1000} />
        {h.theme !== 'classic' && <Doodle theme={h.theme} name="mascot" size={190} className="bob" />}
        {q.double && <span className="pill dark">2× points</span>}
        <div className="stat"><b>{h.answered}</b><span>of {h.players.length} answered</span></div>
      </div>
      <div className="answers">
        {q.answers.map((a, i) => <div key={i} className={`tile c${i}`}><Shape i={i} /><span>{a}</span></div>)}
      </div>
      <div style={{ textAlign: 'right' }}><button className="btn ghost small" onClick={() => act('skip')} aria-busy={busy === 'skip'}>Skip timer →</button></div>
    </>
  );
}

function Reveal({ h, act, busy, auto, autoSecs = DEFAULT_AUTO_SECS }: ScreenProps) {
  const q = h.question!;
  useEffect(() => { Music.stop(); Sound.reveal(); }, []);
  const dist = h.distribution ?? [];
  const max = Math.max(1, ...dist);
  const [grow, setGrow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGrow(true), 50); return () => clearTimeout(t); }, []);

  return (
    <>
      <div className="stage-q">{q.q}</div>
      <div className="stage-mid">
        <div className="bars">
          {dist.map((n, i) => (
            <div key={i}>
              <span>{n}</span>
              <div className={`col c${i}`} style={{ height: grow ? `${(n / max) * 80}%` : 0, opacity: i === h.correct ? 1 : 0.35 }}>
                {i === h.correct && '✓'}
              </div>
              <Shape i={i} />
            </div>
          ))}
        </div>
      </div>
      <div className="answers">
        {q.answers.map((a, i) => (
          <div key={i} className={`tile c${i} ${i === h.correct ? 'right' : 'dim'}`}>
            <Shape i={i} /><span>{a}</span>{i === h.correct && <span className="tick">✓</span>}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right' }}>
        <NextButton label={h.qIndex + 1 >= h.total ? 'Final results →' : 'Scoreboard →'} act={act} busy={busy} auto={auto} secs={autoSecs} />
      </div>
    </>
  );
}

function Leaderboard({ h, act, busy, auto, autoSecs = DEFAULT_AUTO_SECS }: ScreenProps) {
  useEffect(() => {
    Music.stop(); Sound.drumroll();
    const t = setTimeout(() => Music.play('scoreboard'), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      {h.theme !== 'classic' && <>
        <Doodle theme={h.theme} name="trophy" size={130} rotate={-8} className="float" style={{ top: 90, left: '9%' }} />
        <Doodle theme={h.theme} name="star" size={100} rotate={10} className="float wiggle" style={{ top: 110, right: '10%' }} />
      </>}
      <h1 style={{ textAlign: 'center', fontSize: 64, position: 'relative' }}>Score<em>board</em></h1>
      <div className="board" style={{ flex: 1, alignContent: 'start' }}>
        {h.leaderboard!.map((p, i) => (
          <div key={p.name} className="row rise" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="r">{i + 1}</span>
            <Avatar i={p.avatar} size={42} />
            <span className="n">{p.name} {p.streak >= 2 && <span className="pill" title="streak" style={{ color: 'var(--pink-ink)', verticalAlign: 'middle' }}><Icon name="flame" size={14} stroke={8} />{p.streak}</span>}</span>
            {p.up > 0 && <span className="up">▲{p.up}</span>}
            {p.gained > 0 && <span className="g">+{p.gained.toLocaleString()}</span>}
            <b>{p.score.toLocaleString()}</b>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right' }}><NextButton label="Next question →" act={act} busy={busy} auto={auto} secs={autoSecs} /></div>
    </>
  );
}

const ORD = ['', '1st', '2nd', '3rd'];

/** End of game: 3rd, then 2nd, then a longer drumroll and 1st with confetti. Timing shared with phones (lib/podium). */
type Light = 'off' | 'sweep' | 'land' | 'fade';

function Crown() {
  return (
    <svg className="crown" viewBox="0 0 72 50" width="76" height="53" aria-hidden>
      <path d="M8 42 5 15l15 13L36 7l16 21 15-13-3 27z" fill="#f6c945" stroke="#161616" strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="8" y="39" width="56" height="8" rx="4" fill="#f6c945" stroke="#161616" strokeWidth="3.5" />
      <circle cx="5" cy="13" r="4.5" fill="#f7bddf" stroke="#161616" strokeWidth="3" />
      <circle cx="36" cy="6" r="4.5" fill="#d4cdf8" stroke="#161616" strokeWidth="3" />
      <circle cx="67" cy="13" r="4.5" fill="#bfdc94" stroke="#161616" strokeWidth="3" />
    </svg>
  );
}

function Podium({ h, onLeave, onReport }: { h: Stamped<HostView>; onLeave: () => void; onReport: () => void }) {
  const lb = h.leaderboard ?? [];
  const { steps, done } = useMemo(() => podiumTimeline(h.players.length), [h.players.length]);
  const [shown, setShown] = useState<number[]>([]); // ranks revealed so far
  const [rolling, setRolling] = useState(0);        // rank whose drumroll is playing
  const [finished, setFinished] = useState(false);
  const [boom, setBoom] = useState(0);
  const [light, setLight] = useState<Light>('off'); // spotlight for 1st place
  const timers = useRef<number[]>([]);
  const spot = useRef<HTMLDivElement>(null);
  const firstSpot = useRef<HTMLDivElement>(null);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    Sound.cutRoll();
    setLight('off');
    setRolling(0); setShown([1, 2, 3]); setFinished(true); setBoom(b => b + 1);
    Music.play('podium');
  };

  useEffect(() => {
    Music.stop();
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    for (const st of steps) {
      at(st.rollAt, () => {
        setRolling(st.rank); Sound.roll(st.roll / 1000);
        if (st.rank === 1) { setLight('sweep'); Sound.lightsOut(); } // lights down, spotlight searches the stage
      });
      at(st.at, () => {
        setRolling(0);
        setShown(x => [...x, st.rank]);
        if (st.rank === 1) { Sound.fanfare(); setBoom(b => b + 1); setLight('land'); } else Sound.place();
      });
    }
    const first = steps.find(st => st.rank === 1);
    if (first) {
      at(first.at + 2600, () => setLight('fade')); // lights back up
      at(first.at + 3400, () => setLight('off'));
    }
    at(done + 1000, () => setFinished(true));
    at(done + 2600, () => Music.play('podium'));
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
  }, [steps, done]);

  // The spotlight lands on the winner: freeze it where the sweep left it, then glide onto 1st place.
  useLayoutEffect(() => {
    const el = spot.current, target = firstSpot.current;
    if (light !== 'land' || !el || !target) return;
    const cs = getComputedStyle(el);
    el.style.left = cs.left; el.style.top = cs.top;
    el.style.animation = 'none';
    void el.offsetWidth; // apply the frozen position before transitioning away from it
    const r = target.getBoundingClientRect();
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.bottom - 330}px`; // around the crown, avatar and name once the pedestal has grown
  }, [light]);

  const last = [3, 2, 1].filter(r => shown.includes(r)).pop();
  const headline = shown.includes(1) && lb[0] ? <>{lb[0].name} <em>wins!</em></>
    : rolling === 1 ? <>And the winner <em>is…</em></>
    : rolling ? <>In {ORD[rolling]} <em>place…</em></>
    : last && lb[last - 1] ? <>{ORD[last]}: <em>{lb[last - 1].name}</em></>
    : <>And the podium <em>goes to…</em></>;

  // Display order: 2nd, 1st, 3rd.
  const spots = [
    { rank: 2, height: 190, color: 'var(--lilac)' },
    { rank: 1, height: 270, color: 'var(--butter)' },
    { rank: 3, height: 140, color: 'var(--pink)' },
  ];
  return (
    <>
      <Confetti fire={boom} />
      {light !== 'off' && <div ref={spot} className={`spot ${light}`} aria-hidden />}
      {finished && h.theme !== 'classic' && <>
        <Doodle theme={h.theme} name="trophy" size={150} rotate={-10} className="float pop" style={{ top: 100, left: '7%' }} />
        <Doodle theme={h.theme} name="mascot" size={190} className="float bob" style={{ top: 110, right: '6%' }} />
      </>}
      {finished && <>
        <Sticker text="good game · well played · " icon="trophy" bg="var(--sage)" ink="var(--sage-ink)" size={150} rotate={-12}
          className="pop" style={{ position: 'absolute', top: 90, left: '8%' }} />
        <Sticker text="quiz is my superpower · " icon="flame" bg="var(--pink)" ink="var(--pink-ink)" size={130} rotate={10}
          className="pop" style={{ position: 'absolute', top: 120, right: '8%' }} />
      </>}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div className="label">{h.title}</div>
        <h1 key={String(rolling) + shown.join()} className={`podium-title pop ${light === 'sweep' || light === 'land' ? 'lit' : ''}`}>{headline}</h1>
      </div>
      <div className="podium">
        {spots.map(sp => {
          const p = lb[sp.rank - 1];
          if (!p) return <div key={sp.rank} />;
          const on = shown.includes(sp.rank);
          return (
            <div key={sp.rank} ref={sp.rank === 1 ? firstSpot : undefined}
              className={`${on ? 'in' : ''} ${rolling === sp.rank ? 'suspense' : ''} ${sp.rank === 1 ? 'first' : ''}`}>
              {on && <div className="who">
                {sp.rank === 1 && <Crown />}
                <Avatar i={p.avatar} size={sp.rank === 1 ? 104 : 80} className="bob" />
                <div className="name">{p.name}</div>
              </div>}
              <div className="block" style={{ height: on ? sp.height : 44, background: sp.color }}>
                {on ? <><span className="m">{ORD[sp.rank]}</span><span>{p.score.toLocaleString()}</span></> : <span className="m q">?</span>}
              </div>
            </div>
          );
        })}
      </div>
      {finished && lb.length > 3 && (
        <div className="board">
          {lb.slice(3).map((p, i) => (
            <div key={p.name} className="row rise" style={{ fontSize: 18, padding: '10px 18px', animationDelay: `${i * 60}ms` }}>
              <span className="r">{i + 4}</span><Avatar i={p.avatar} size={32} /><span className="n">{p.name}</span><b>{p.score.toLocaleString()}</b>
            </div>
          ))}
        </div>
      )}
      {/* Skip sits bottom-right, never where "Back" appears, so a late click can't end the game by accident. */}
      <div style={{ textAlign: finished ? 'center' : 'right', minHeight: 52 }}>
        {finished
          ? <span style={{ display: 'inline-flex', gap: 10 }}>
              <button className="btn light rise" onClick={onReport}>See analytics</button>
              <button className="btn rise" onClick={onLeave}>Back to my quizzes</button>
            </span>
          : <button className="btn ghost small" onClick={skip}>Skip reveal →</button>}
      </div>
    </>
  );
}
