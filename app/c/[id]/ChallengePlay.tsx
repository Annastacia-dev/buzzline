'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, useNow } from '@/lib/client';
import { Avatar } from '@/lib/avatars';
import { Scallop, Icon } from '@/lib/deco';
import { Sound, SoundToggle } from '@/lib/sound';
import { AnswerPad, Solution } from '@/lib/answer-pad';
import type { Submission } from '@/lib/kinds';
import type { ChallengeInfo, RunView } from '@/lib/challenge';

type Run = { run: string; token: string };
const keyFor = (id: string) => `bz.challenge.${id}`;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;

async function getInfo(id: string): Promise<ChallengeInfo> {
  const r = await fetch(`/api/challenge?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

/** A self-paced challenge on one phone: nickname, then each question against the clock, then the leaderboard. */
export default function ChallengePlay({ id }: { id: string }) {
  const [info, setInfo] = useState<ChallengeInfo | null>(null);
  const [fatal, setFatal] = useState('');
  const [run, setRun] = useState<Run | null>(null);
  const [v, setV] = useState<(RunView & { at: number }) | null>(null);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<{ q: number; label: string } | null>(null);

  const show = useCallback((view: RunView) => setV({ ...view, at: performance.now() }), []);
  const call = useCallback(async (action: string, extra: object = {}, r = run) => {
    if (!r) return;
    const view = await api<RunView>('/api/challenge', { action, id, ...r, ...extra });
    show(view);
    return view;
  }, [id, run, show]);

  // The challenge itself, and a run already started on this phone (if the page was reloaded).
  useEffect(() => {
    getInfo(id).then(setInfo).catch(e => setFatal((e as Error).message));
    try {
      const saved = JSON.parse(localStorage.getItem(keyFor(id)) || 'null') as Run | null;
      if (saved) {
        setRun(saved);
        api<RunView>('/api/challenge', { action: 'view', id, ...saved }).then(show).catch(() => { localStorage.removeItem(keyFor(id)); setRun(null); });
      }
    } catch {}
  }, [id, show]);

  // Back on the leaderboard once finished.
  useEffect(() => { if (v?.phase === 'finished') { getInfo(id).then(setInfo).catch(() => {}); Sound.fanfare(); } }, [v?.phase, id]);
  useEffect(() => {
    if (v?.phase !== 'result' || !v.result) return;
    if (v.result.poll) Sound.pop(); else if (v.result.correct) Sound.good(); else Sound.bad();
  }, [v?.phase, v?.qIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setErr('');
    try {
      const r = await api<Run & { view: RunView }>('/api/challenge', { action: 'start', id, name });
      const saved = { run: r.run, token: r.token };
      localStorage.setItem(keyFor(id), JSON.stringify(saved));
      setRun(saved); show(r.view); Sound.whoosh();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function submit({ label, ...sub }: Submission & { label: string }) {
    if (!v || picked?.q === v.qIndex) return;
    setPicked({ q: v.qIndex, label }); setErr('');
    Sound.lock(); navigator.vibrate?.(30);
    try { await call('answer', sub); }
    catch (e) { setPicked(null); setErr((e as Error).message); }
  }

  async function next() {
    if (busy) return;
    setBusy(true); setErr('');
    try { await call('next'); Sound.whoosh(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  if (fatal) {
    return (
      <div className="center">
        <h1>Challenge not found</h1>
        <p className="muted">{fatal}</p>
        <Link className="btn" href="/host?ai">Make your own quiz</Link>
      </div>
    );
  }
  if (!info) return <div className="center"><div className="spinner" /></div>;

  let body: React.ReactNode;
  let mood = 'lobby';
  if (!run || !v) {
    body = (
      <form className="msg" onSubmit={start}>
        <span className="pill">🏁 Challenge</span>
        <h1>{info.title}</h1>
        <p>{info.total} questions against the clock. Faster right answers score more.</p>
        <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Your nickname" aria-label="Your nickname" maxLength={16} autoFocus style={{ maxWidth: 320, textAlign: 'center' }} />
        <button className="btn" disabled={!name.trim() || busy} aria-busy={busy}>Start the challenge <span aria-hidden>→</span></button>
        {err && <div className="error" role="alert">{err}</div>}
        <Board info={info} />
      </form>
    );
  } else if (v.phase === 'question') {
    mood = 'play';
    body = <QuestionView v={v} answered={picked?.q === v.qIndex ? picked.label : null} err={err} onSubmit={submit} onTimeUp={() => call('view').catch(() => {})} />;
  } else if (v.phase === 'result' && v.result) {
    const r = v.result;
    mood = r.poll || r.correct ? 'good' : 'bad';
    body = (
      <div className="msg">
        <Scallop color="var(--paper)" size={120} rotate={r.correct || r.poll ? 0 : 10} className="pop">
          <span className="result">{r.poll ? '📊' : r.correct ? '✓' : '✕'}</span>
        </Scallop>
        <h1>{r.poll ? <>Thanks for <em>voting</em></> : r.correct ? 'Correct!' : r.missed ? <>Time&apos;s <em>up</em></> : <>Not <em>quite</em></>}</h1>
        {r.correct
          ? <div className="bignum rise">+{r.points.toLocaleString()}</div>
          : r.poll ? (r.choice != null && <p>You picked <b>{r.answers[r.choice]}</b></p>)
          : r.solution ? <Solution kind={r.kind} solution={r.solution} /> : <p>The answer was <b>{r.answers[r.correctIndex]}</b></p>}
        {r.correct && r.bonus > 0 && <span className="pill"><Icon name="flame" size={16} stroke={8} /> {v.streak} in a row · +{r.bonus}</span>}
        <button className="btn" onClick={next} disabled={busy} aria-busy={busy} autoFocus>
          {v.qIndex + 1 >= v.total ? 'See my result' : 'Next question'} <span aria-hidden>→</span>
        </button>
        {err && <div className="error" role="alert">{err}</div>}
      </div>
    );
  } else {
    mood = 'end';
    body = (
      <div className="msg">
        <p>{info.title}</p>
        <Scallop color={['var(--butter)', 'var(--lilac)', 'var(--pink)'][(v.rank ?? 9) - 1] ?? 'var(--paper)'} size={150} className="pop">
          <span className="bignum">#{v.rank}</span>
        </Scallop>
        <h1>{v.rank === 1 ? <>Top of the <em>board!</em></> : <>You came <em>{ordinal(v.rank ?? 1)}</em></>}</h1>
        <p>{v.score.toLocaleString()} points{v.players && v.players > 1 ? ` · ${v.players} players so far` : ''}</p>
        <ShareChallenge v={v} />
        <Board info={info} me={v.name} />
        <p className="end-host">Loved it? <Link href="/host?ai">Make your own quiz, free →</Link></p>
      </div>
    );
  }

  return (
    <div className="phone challenge" data-mood={mood} data-theme={info.theme}>
      <header>
        <Link href="/" className="logo" style={{ fontSize: 20 }}>Buzzline<span className="dot" /></Link>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SoundToggle />
          {v && v.phase !== 'finished' && <span className="pill">Q {Math.min(v.qIndex + 1, v.total)} / {v.total}</span>}
        </span>
      </header>
      <main>{body}</main>
      {v && <footer><span className="who"><Avatar i={v.avatar} size={30} />{v.name}</span><b>{v.score.toLocaleString()}</b></footer>}
    </div>
  );
}

function QuestionView({ v, answered, err, onSubmit, onTimeUp }: {
  v: RunView & { at: number }; answered: string | null; err: string;
  onSubmit: (s: Submission & { label: string }) => void; onTimeUp: () => void;
}) {
  const now = useNow(true);
  const q = v.question!;
  const elapsed = now - v.at;
  const startsIn = (v.startsIn ?? 0) - elapsed;
  const left = (v.remaining ?? 0) - elapsed;
  const total = q.time * 1000;
  // When the clock runs out, ask the server: it marks the question missed and sends the result.
  const asked = useRef(false);
  useEffect(() => {
    if (left <= -400 && !asked.current) { asked.current = true; onTimeUp(); }
  }, [left, onTimeUp]);
  const ready = Math.ceil(startsIn / 1000);
  useEffect(() => { if (ready > 0 && ready <= 3) Sound.count(); }, [ready]);

  if (startsIn > 0) {
    return (
      <div className="msg">
        <span className="pill">Question {v.qIndex + 1}{q.double && <> · <b>2× points</b></>}</span>
        <div className="qtext" style={{ fontSize: 26 }}>{q.q}</div>
        <Scallop color="var(--paper)" size={140} key={ready} className="pop"><span className="bignum">{ready}</span></Scallop>
      </div>
    );
  }
  if (answered) {
    return (
      <div className="msg">
        <div className="locked-text pop">{answered}</div>
        <h1>Checking<em>…</em></h1>
      </div>
    );
  }
  return (
    <>
      <div className="bar"><div style={{ width: `${Math.max(0, left / total) * 100}%` }} /></div>
      <div className="qtext">{q.q}</div>
      {q.image && <img className="challenge-img" src={q.image} alt="" />}
      {q.kind === 'poll' && <div style={{ textAlign: 'center' }}><span className="pill">📊 Poll · no wrong answers</span></div>}
      {err && <div className="error" style={{ textAlign: 'center' }}>{err}</div>}
      <AnswerPad key={v.qIndex} q={q} disabled={left <= 0} onSubmit={onSubmit} />
    </>
  );
}

function Board({ info, me }: { info: ChallengeInfo; me?: string }) {
  if (!info.board.length) return <p className="muted">Nobody has played yet. Be the first on the board!</p>;
  return (
    <div className="challenge-board">
      <p className="label">Leaderboard · {info.players} player{info.players === 1 ? '' : 's'}</p>
      {info.board.slice(0, 10).map((p, i) => (
        <div key={p.name} className={`row ${p.name === me ? 'me' : ''}`}>
          <span className="r">{i + 1}</span><Avatar i={p.avatar} size={30} /><span className="n">{p.name}{!p.finished && <small className="muted"> playing…</small>}</span>
          <b>{p.score.toLocaleString()}</b>
        </div>
      ))}
    </div>
  );
}

function ShareChallenge({ v }: { v: RunView }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const text = v.rank === 1 ? `I'm top of the board in “${v.title}” on Buzzline 🏆 Can you beat ${v.score.toLocaleString()}?` : `I scored ${v.score.toLocaleString()} in “${v.title}” on Buzzline. Can you beat me?`;
    try {
      if (navigator.share) await navigator.share({ title: v.title, text, url: location.href });
      else { await navigator.clipboard.writeText(`${text} ${location.href}`); setCopied(true); }
    } catch {}
  }
  return <button className="btn" onClick={share}>{copied ? 'Link copied ✓' : '🏁 Challenge a friend'}</button>;
}
