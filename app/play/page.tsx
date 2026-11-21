'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Shape, Sound, useGameStream, useNow } from '@/lib/client';
import type { PlayerView, EndView } from '@/lib/types';

type Session = { id: string; token: string; pin: string };

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = sessionStorage.getItem('bz.player');
    if (s) setSession(JSON.parse(s)); else router.replace('/');
  }, [router]);

  const v = useGameStream<PlayerView | EndView>(session && { ...session, role: 'player' });
  if (!session || !v) return <div className="center"><div className="spinner" /></div>;

  if (v.state === 'kicked' || v.state === 'closed') {
    return (
      <div className="center">
        <h1>{v.state === 'kicked' ? 'You were removed' : 'Game closed'}</h1>
        <p className="muted">{v.state === 'kicked' ? 'The host removed you from this game.' : 'The host ended this game.'}</p>
        <Link className="btn" href="/">Join another</Link>
      </div>
    );
  }
  return <Player v={v as PlayerView & { at: number }} session={session} />;
}

function Player({ v, session }: { v: PlayerView & { at: number }; session: Session }) {
  const [picked, setPicked] = useState<{ q: number; choice: number } | null>(null);
  const [err, setErr] = useState('');
  const now = useNow(v.state === 'question');

  // Feedback sounds once per screen change.
  useEffect(() => {
    if (v.state === 'reveal') v.last?.correct ? Sound.good() : Sound.bad();
    if (v.state === 'end' && v.rank <= 3) Sound.fanfare();
    if (v.state === 'end') sessionStorage.removeItem('bz.player');
    setErr('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.state, v.qIndex]);

  async function choose(choice: number) {
    setPicked({ q: v.qIndex, choice });
    navigator.vibrate?.(30);
    try { await api('/api/answer', { ...session, choice }); }
    catch (e) { setErr((e as Error).message); }
  }

  let body: React.ReactNode;
  switch (v.state) {
    case 'lobby':
      body = (
        <div className="msg">
          <div className="spinner" />
          <h1 className="pop">You&apos;re in!</h1>
          <p>Look for your name on the big screen.</p>
          <span className="pill">{v.playerCount} player{v.playerCount === 1 ? '' : 's'} so far</span>
        </div>
      );
      break;

    case 'question': {
      const q = v.question!;
      const elapsed = now - v.at;
      const startsIn = (v.startsIn ?? 0) - elapsed;
      const total = (v.remaining ?? 0) - (v.startsIn ?? 0);
      const left = (v.remaining ?? 0) - elapsed;
      const mine = v.myAnswer ?? (picked?.q === v.qIndex ? picked.choice : null);

      if (startsIn > 0) {
        body = (
          <div className="msg">
            <p>Question {v.qIndex + 1}{q.double && <> · <b>double points</b></>}</p>
            <div className="qtext">{q.q}</div>
            <div className="bignum" key={Math.ceil(startsIn / 1000)} >{Math.ceil(startsIn / 1000)}</div>
          </div>
        );
      } else if (mine != null) {
        body = (
          <div className="msg">
            <div className={`tile c${mine} pop`} style={{ minHeight: 0 }}><Shape i={mine} /></div>
            <h1>Locked in</h1>
            <p>{err || 'Hang tight for the others…'}</p>
          </div>
        );
      } else {
        body = (
          <>
            <div className="bar"><div style={{ width: `${Math.max(0, left / total) * 100}%` }} /></div>
            <div className="qtext">{q.q}</div>
            <div className={`answers ${q.answers.length === 2 ? 'two' : ''}`}>
              {q.answers.map((a, i) => (
                <button key={i} className={`tile c${i}`} onClick={() => choose(i)} disabled={left <= 0}>
                  <Shape i={i} /><span>{a}</span>
                </button>
              ))}
            </div>
          </>
        );
      }
      break;
    }

    case 'reveal': {
      const l = v.last;
      body = (
        <div className="msg">
          <div className={`result ${l?.correct ? 'good' : 'bad'} pop`}>{l?.correct ? '✓' : '✕'}</div>
          <h1>{l?.correct ? 'Correct!' : l?.missed ? "Time's up" : 'Not quite'}</h1>
          {l?.correct
            ? <div className="bignum rise">+{l.points.toLocaleString()}</div>
            : <p>Answer: <b>{v.answers?.[v.correct!]}</b></p>}
          {l?.correct && l.bonus > 0 && <span className="pill">🔥 {v.streak} in a row · +{l.bonus} streak bonus</span>}
          <p>You&apos;re <b>#{v.rank}</b>{v.behind && <> · {v.behind.by.toLocaleString()} behind {v.behind.name}</>}</p>
        </div>
      );
      break;
    }

    case 'leaderboard':
      body = (
        <div className="msg">
          <p>Current position</p>
          <div className="bignum pop">#{v.rank}</div>
          <p>{v.behind ? `${v.behind.by.toLocaleString()} points behind ${v.behind.name}` : v.rank === 1 ? 'You’re in the lead! 🏆' : ''}</p>
          <span className="pill">Eyes on the big screen</span>
        </div>
      );
      break;

    case 'end': {
      const medal = ['🥇', '🥈', '🥉'][v.rank - 1];
      body = (
        <div className="msg">
          <p>Final position</p>
          <div className="bignum pop">{medal ?? `#${v.rank}`}</div>
          <h1>{medal ? 'On the podium!' : 'Nice playing!'}</h1>
          <p>{v.score.toLocaleString()} points</p>
          <Link className="btn" href="/">Play again</Link>
        </div>
      );
      break;
    }
  }

  return (
    <div className="phone">
      <header>
        <span>PIN {v.pin}</span>
        <span>{v.qIndex >= 0 ? `${Math.min(v.qIndex + 1, v.total)} / ${v.total}` : ''}</span>
      </header>
      <main>{body}</main>
      <footer><span>{v.name}</span><span>{v.score.toLocaleString()}</span></footer>
    </div>
  );
}
