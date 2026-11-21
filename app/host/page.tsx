'use client';
import { useEffect, useRef, useState } from 'react';
import { api, Shape, Sound, useGameStream, useNow, type Stamped } from '@/lib/client';
import type { HostView, EndView, Quiz } from '@/lib/types';
import Studio from './Studio';

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

  if (!ready) return null;
  if (!session) return <Studio onHost={host} error={error} />;
  return <Stage session={session} onLeave={leave} />;
}

function Stage({ session, onLeave }: { session: HostSession; onLeave: () => void }) {
  const v = useGameStream<HostView | EndView>({ ...session, role: 'host' });
  const [err, setErr] = useState('');

  useEffect(() => { if (v?.state === 'closed') onLeave(); }, [v?.state, onLeave]);
  if (!v || v.state === 'closed' || v.state === 'kicked') return <div className="center"><div className="spinner" /></div>;
  const h = v as Stamped<HostView>;

  const act = async (action: string, extra: object = {}) => {
    setErr('');
    try { await api('/api/host', { ...session, action, ...extra }); }
    catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="stage">
      <div className="stage-top">
        <div className="logo"><span className="dot" />Buzzline</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {h.qIndex >= 0 && <span className="pill">Question {Math.min(h.qIndex + 1, h.total)} / {h.total}</span>}
          <span className="pill">PIN {h.pin}</span>
          <button className="btn ghost small" onClick={() => confirm('End this game for everyone?') && act('end')}>End game</button>
        </div>
      </div>
      {err && <div className="error" style={{ textAlign: 'center' }}>{err}</div>}
      {h.state === 'lobby' && <Lobby h={h} act={act} />}
      {h.state === 'question' && <QuestionScreen h={h} act={act} />}
      {h.state === 'reveal' && <Reveal h={h} act={act} />}
      {h.state === 'leaderboard' && <Leaderboard h={h} act={act} />}
      {h.state === 'end' && <Podium h={h} onLeave={() => act('end')} />}
    </div>
  );
}

type ScreenProps = { h: Stamped<HostView>; act: (a: string, extra?: object) => void };

function Lobby({ h, act }: ScreenProps) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { fetch('/api/info').then(r => r.json()).then(d => setUrls(d.urls)).catch(() => {}); }, []);
  const joinUrl = urls[0] ?? (typeof location !== 'undefined' ? location.origin : '');

  return (
    <>
      <div className="pinbox" style={{ alignSelf: 'center' }}>
        <div>
          <div className="label">Join at</div>
          <div className="url">{joinUrl.replace(/^https?:\/\//, '')}</div>
          {urls.length > 1 && <div className="label" style={{ marginTop: 4 }}>or {urls.slice(1).map(u => u.replace(/^https?:\/\//, '')).join(', ')}</div>}
        </div>
        <div>
          <div className="label">Game PIN</div>
          <div className="pin">{h.pin.slice(0, 3)} {h.pin.slice(3)}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}><h2>{h.title}</h2></div>
      <div className="stage-top" style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <div className="stat"><b>{h.players.length}</b><span>player{h.players.length === 1 ? '' : 's'}</span></div>
        <button className="btn" onClick={() => act('start')} disabled={!h.players.length} style={{ fontSize: 22, padding: '16px 40px' }}>Start</button>
      </div>
      <div className="chips" style={{ flex: 1 }}>
        {h.players.length === 0 && <p className="muted">Waiting for players…</p>}
        {h.players.map(p => (
          <button key={p.id} className="chip pop" title="Click to remove" onClick={() => act('kick', { playerId: p.id })}>{p.name}</button>
        ))}
      </div>
    </>
  );
}

function Ring({ left, total }: { left: number; total: number }) {
  const r = 56, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, left / total));
  return (
    <div className="ring">
      <svg width="130" height="130">
        <circle cx="65" cy="65" r={r} stroke="rgba(255,255,255,.15)" strokeWidth="12" fill="none" />
        <circle cx="65" cy="65" r={r} stroke={f < 0.25 ? 'var(--bad)' : 'var(--accent)'} strokeWidth="12" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - f)} strokeLinecap="round" />
      </svg>
      <span>{Math.ceil(left / 1000)}</span>
    </div>
  );
}

function QuestionScreen({ h, act }: ScreenProps) {
  const now = useNow(true);
  const q = h.question!;
  const elapsed = now - h.at;
  const startsIn = (h.startsIn ?? 0) - elapsed;
  const left = Math.max(0, (h.remaining ?? 0) - elapsed);
  const secs = Math.ceil(left / 1000);
  const lastTick = useRef(0);
  useEffect(() => {
    if (startsIn <= 0 && secs <= 5 && secs > 0 && secs !== lastTick.current) { lastTick.current = secs; Sound.tick(); }
  }, [secs, startsIn]);

  if (startsIn > 0) {
    return (
      <div className="countdown-overlay">
        <div style={{ display: 'grid', gap: 18, justifyItems: 'center', padding: 24 }}>
          <span className="pill">Question {h.qIndex + 1} of {h.total}</span>
          {q.double && <span className="pill gold">Double points!</span>}
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 56px)', maxWidth: 1000 }}>{q.q}</h1>
          <div className="bignum pop" key={Math.ceil(startsIn / 1000)}>{Math.ceil(startsIn / 1000)}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="stage-q">{q.q}</div>
      <div className="stage-mid">
        <Ring left={left} total={q.time * 1000} />
        {q.double && <span className="pill gold">2× points</span>}
        <div className="stat"><b>{h.answered}</b><span>of {h.players.length} answered</span></div>
      </div>
      <div className="answers">
        {q.answers.map((a, i) => <div key={i} className={`tile c${i}`}><Shape i={i} /><span>{a}</span></div>)}
      </div>
      <div style={{ textAlign: 'right' }}><button className="btn ghost small" onClick={() => act('skip')}>Skip timer →</button></div>
    </>
  );
}

function Reveal({ h, act }: ScreenProps) {
  const q = h.question!;
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
          <div key={i} className={`tile c${i} ${i === h.correct ? '' : 'dim'}`}>
            <Shape i={i} /><span>{a}</span>{i === h.correct && <span className="tick">✓</span>}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right' }}>
        <button className="btn" onClick={() => act('next')}>{h.qIndex + 1 >= h.total ? 'Final results →' : 'Scoreboard →'}</button>
      </div>
    </>
  );
}

function Leaderboard({ h, act }: ScreenProps) {
  return (
    <>
      <h1 style={{ textAlign: 'center', fontSize: 44 }}>Scoreboard</h1>
      <div className="board" style={{ flex: 1, alignContent: 'start' }}>
        {h.leaderboard!.map((p, i) => (
          <div key={p.name} className="row rise" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="r">{i + 1}</span>
            <span className="n">{p.name} {p.streak >= 2 && <span title="streak">🔥{p.streak}</span>}</span>
            {p.up > 0 && <span className="up">▲{p.up}</span>}
            {p.gained > 0 && <span className="g">+{p.gained.toLocaleString()}</span>}
            <span>{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right' }}><button className="btn" onClick={() => act('next')}>Next question →</button></div>
    </>
  );
}

function Podium({ h, onLeave }: { h: Stamped<HostView>; onLeave: () => void }) {
  const lb = h.leaderboard ?? [];
  useEffect(() => { Sound.fanfare(); }, []);
  // Display order: 2nd, 1st, 3rd.
  const spots = [
    { p: lb[1], medal: '🥈', height: 170, color: '#d9dde8', delay: 600 },
    { p: lb[0], medal: '🥇', height: 240, color: 'var(--accent)', delay: 1200 },
    { p: lb[2], medal: '🥉', height: 120, color: '#e8a86b', delay: 0 },
  ];
  return (
    <>
      <h1 style={{ textAlign: 'center', fontSize: 44 }}>{h.title}</h1>
      <div className="podium">
        {spots.map((s, i) => s.p ? (
          <div key={i} className="rise" style={{ animationDelay: `${s.delay}ms` }}>
            <div className="name">{s.p.name}</div>
            <div className="block" style={{ height: s.height, background: s.color }}>
              <span className="m">{s.medal}</span>
              <span>{s.p.score.toLocaleString()}</span>
            </div>
          </div>
        ) : <div key={i} />)}
      </div>
      {lb.length > 3 && (
        <div className="board">
          {lb.slice(3).map((p, i) => (
            <div key={p.name} className="row" style={{ fontSize: 18, padding: '10px 18px' }}>
              <span className="r">{i + 4}</span><span className="n">{p.name}</span><span>{p.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ textAlign: 'center' }}><button className="btn" onClick={onLeave}>Back to my quizzes</button></div>
    </>
  );
}
