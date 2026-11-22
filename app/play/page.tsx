'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, refreshGame, Shape, useGameStream, useNow } from '@/lib/client';
import { Sound, SoundToggle } from '@/lib/sound';
import { AVATARS, Avatar } from '@/lib/avatars';
import type { PlayerView, EndView } from '@/lib/types';
import { Scallop, Icon } from '@/lib/deco';

type Session = { id: string; token: string; pin: string };

export default function PlayPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = sessionStorage.getItem('bz.player');
    if (s) setSession(JSON.parse(s)); else router.replace('/join');
  }, [router]);

  const v = useGameStream<PlayerView | EndView>(session && { ...session, role: 'player' });
  if (!session || !v) return <div className="center"><div className="spinner" /></div>;

  if (v.state === 'kicked' || v.state === 'closed') {
    return (
      <div className="center">
        <h1>{v.state === 'kicked' ? 'You were removed' : 'Game closed'}</h1>
        <p className="muted">{v.state === 'kicked' ? 'The host removed you from this game.' : 'The host ended this game.'}</p>
        <Link className="btn" href="/join">Join another</Link>
      </div>
    );
  }
  return <Player v={v as PlayerView & { at: number }} session={session} />;
}

function Player({ v, session }: { v: PlayerView & { at: number }; session: Session }) {
  // The answer tapped for this question; `sent` once the server has accepted it.
  const [picked, setPicked] = useState<{ q: number; choice: number; sent: boolean } | null>(null);
  const [err, setErr] = useState('');
  // Avatar just tapped, shown straight away while the server catches up.
  const [avatar, setAvatar] = useState<number | null>(null);
  const now = useNow(v.state === 'question');
  const myAvatar = avatar ?? v.avatar;

  // Feedback sounds once per screen change.
  useEffect(() => {
    if (v.state === 'lobby') Sound.pop();
    if (v.state === 'reveal') v.last?.correct ? Sound.good() : Sound.bad();
    if (v.state === 'end' && v.rank <= 3) Sound.fanfare();
    if (v.state === 'end') sessionStorage.removeItem('bz.player');
    setErr('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.state, v.qIndex]);

  async function choose(choice: number) {
    if (picked?.q === v.qIndex) return;
    const q = v.qIndex;
    setErr('');
    setPicked({ q, choice, sent: false });
    Sound.lock();
    navigator.vibrate?.(30);
    try {
      await api('/api/answer', { ...session, choice });
      setPicked({ q, choice, sent: true });
    } catch (e) {
      // Not accepted (too early, too late...): back to the tiles with the reason, never a false "Locked in".
      setPicked(null);
      setErr((e as Error).message);
    }
    refreshGame();
  }

  async function chooseAvatar(i: number) {
    setAvatar(i);
    Sound.pop();
    try { await api('/api/avatar', { ...session, avatar: i }); refreshGame(); }
    catch (e) { setAvatar(null); setErr((e as Error).message); }
  }

  let body: React.ReactNode;
  let mood = 'lobby';
  switch (v.state) {
    case 'lobby':
      body = (
        <div className="msg">
          <Avatar i={myAvatar} size={104} className="pop bob" key={myAvatar} />
          <h1>You&apos;re <em>in!</em></h1>
          <p>Find yourself on the big screen.<br />The game starts any second.</p>
          <span className="pill">{v.playerCount} player{v.playerCount === 1 ? '' : 's'} so far</span>
          <div className="avatar-pick">
            <p>Tap to pick your avatar</p>
            <div role="radiogroup" aria-label="Avatar">
              {AVATARS.map((_, i) => (
                <button key={i} type="button" role="radio" aria-checked={i === myAvatar} aria-label={`Avatar ${i + 1}`}
                  className={i === myAvatar ? 'on' : ''} onClick={() => chooseAvatar(i)}>
                  <Avatar i={i} size={40} />
                </button>
              ))}
            </div>
            {err && <div className="error">{err}</div>}
          </div>
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
      const sending = v.myAnswer == null && picked?.q === v.qIndex && !picked.sent;

      if (startsIn > 0) {
        mood = 'ready';
        body = (
          <div className="msg">
            <span className="pill">Question {v.qIndex + 1}{q.double && <> · <b>2× points</b></>}</span>
            <div className="qtext" style={{ fontSize: 26 }}>{q.q}</div>
            <Scallop color="var(--paper)" size={140} key={Math.ceil(startsIn / 1000)} className="pop">
              <span className="bignum">{Math.ceil(startsIn / 1000)}</span>
            </Scallop>
          </div>
        );
      } else if (mine != null) {
        mood = 'locked';
        body = (
          <div className="msg">
            <div className={`tile c${mine} pop`} style={{ minHeight: 0, padding: 18, borderRadius: '50%' }}><Shape i={mine} /></div>
            <h1>{sending ? <>Sending<em>…</em></> : <>Locked <em>in</em></>}</h1>
            <p>{sending ? 'One sec' : 'Hang tight for the others…'}</p>
          </div>
        );
      } else {
        mood = 'play';
        body = (
          <>
            <div className="bar"><div style={{ width: `${Math.max(0, left / total) * 100}%` }} /></div>
            <div className="qtext">{q.q}</div>
            {err && <div className="error" style={{ textAlign: 'center' }}>{err}</div>}
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
      mood = l?.correct ? 'good' : 'bad';
      body = (
        <div className="msg">
          <Scallop color="var(--paper)" size={130} rotate={l?.correct ? 0 : 10} className="pop">
            <span className="result">{l?.correct ? '✓' : '✕'}</span>
          </Scallop>
          <h1>{l?.correct ? 'Correct!' : l?.missed ? <>Time&apos;s <em>up</em></> : <>Not <em>quite</em></>}</h1>
          {l?.correct
            ? <div className="bignum rise">+{l.points.toLocaleString()}</div>
            : <p>The answer was <b>{v.answers?.[v.correct!]}</b></p>}
          {l?.correct && l.bonus > 0 && <span className="pill"><Icon name="flame" size={16} stroke={8} /> {v.streak} in a row · +{l.bonus}</span>}
          <p>You&apos;re <b>#{v.rank}</b>{v.behind && <> · {v.behind.by.toLocaleString()} behind {v.behind.name}</>}</p>
        </div>
      );
      break;
    }

    case 'leaderboard':
      mood = 'rank';
      body = (
        <div className="msg">
          <p>Current position</p>
          <div className="bignum pop" style={{ fontSize: 110 }}>#{v.rank}</div>
          <p>{v.behind ? <>{v.behind.by.toLocaleString()} points behind <b>{v.behind.name}</b></> : v.rank === 1 ? <>You&apos;re <em>in the lead</em></> : ''}</p>
          <span className="pill">Eyes on the big screen</span>
        </div>
      );
      break;

    case 'end': {
      mood = 'end';
      const podium = v.rank <= 3;
      body = (
        <div className="msg">
          <p>Final position</p>
          <Scallop color={['var(--paper)', 'var(--lilac)', 'var(--pink)'][v.rank - 1] ?? 'var(--paper)'} size={170} className="pop">
            <span className="bignum">#{v.rank}</span>
          </Scallop>
          <h1>{podium ? <>On the <em>podium!</em></> : <>Nice <em>playing!</em></>}</h1>
          <p>{v.score.toLocaleString()} points</p>
          <Link className="btn" href="/join">Play again <span aria-hidden>→</span></Link>
        </div>
      );
      break;
    }
  }

  return (
    <div className="phone" data-mood={mood}>
      <header>
        <span className="logo" style={{ fontSize: 20 }}>Buzzline<span className="dot" /></span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SoundToggle />
          <span className="pill">{v.qIndex >= 0 ? `Q ${Math.min(v.qIndex + 1, v.total)} / ${v.total}` : `PIN ${v.pin}`}</span>
        </span>
      </header>
      <main>{body}</main>
      <footer><span className="who"><Avatar i={myAvatar} size={30} />{v.name}</span><b>{v.score.toLocaleString()}</b></footer>
    </div>
  );
}
