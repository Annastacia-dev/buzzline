'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, refreshGame, Shape, useGameStream, useNow } from '@/lib/client';
import { Sound, SoundToggle } from '@/lib/sound';
import { AVATARS, Avatar } from '@/lib/avatars';
import { revealAtFor } from '@/lib/podium';
import { READY_MS, type PlayerView, type EndView } from '@/lib/types';
import { Scallop, Icon } from '@/lib/deco';
import { Doodle, type DoodleName } from '@/lib/doodles';
import { AnswerPad, Solution } from '@/lib/answer-pad';
import type { Submission } from '@/lib/kinds';
import { TEAMS } from '@/lib/teams';

/** Doodlebug theme: the illustration in the corner of each phone screen. */
const MOOD_DOODLE: Record<string, DoodleName> = { lobby: 'mascot', ready: 'stopwatch', locked: 'sparkles', good: 'star', bad: 'cloud', rank: 'trophy', end: 'trophy' };

type Session = { id: string; token: string; pin: string };

/** This player's team and where it stands (team mode). */
function TeamPill({ t, final }: { t: NonNullable<PlayerView['team']>; final?: boolean }) {
  return (
    <span className="pill team-pill" style={{ background: TEAMS[t.team]?.color }}>
      {t.emoji} Team {t.name} · {final && t.rank === 1 ? 'won!' : `${ordinal(t.rank)} of ${t.of}`}
    </span>
  );
}

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;

/** Game over on a phone: share your result (a link with its own preview card), play again, or host your own. */
function EndActions({ v, session }: { v: PlayerView; session: Session }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle');
  async function share() {
    setStatus('busy');
    try {
      const { url } = await api<{ url: string }>('/api/result', session);
      const link = `${location.origin}${url}`;
      const text = v.rank === 1 ? `I won “${v.title}” on Buzzline 🏆` : `I came ${ordinal(v.rank)} of ${v.playerCount} in “${v.title}” on Buzzline`;
      if (navigator.share) {
        await navigator.share({ title: 'My Buzzline result', text, url: link });
        setStatus('idle');
      } else {
        await navigator.clipboard.writeText(`${text} ${link}`);
        setStatus('copied');
      }
    } catch (e) {
      setStatus((e as Error).name === 'AbortError' ? 'idle' : 'error');
    }
  }
  return (
    <>
      <div className="end-actions">
        <button className="btn" onClick={share} disabled={status === 'busy'}>
          {status === 'busy' ? 'Getting your link…' : status === 'copied' ? 'Link copied ✓' : v.rank === 1 ? '🏆 Share your win' : 'Share my result'}
        </button>
        <Link className="btn light" href="/join">Play again <span aria-hidden>→</span></Link>
      </div>
      {status === 'error' && <p className="error" role="alert">Couldn&apos;t make a link, try again.</p>}
      <p className="end-host">Loved it? <Link href="/host?ai">Host your own quiz, free →</Link></p>
    </>
  );
}

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
  // The answer given for this question (a tile, typed text or an order); `sent` once the server has accepted it.
  const [picked, setPicked] = useState<{ q: number; choice: number | null; label: string; sent: boolean } | null>(null);
  const [err, setErr] = useState('');
  // Avatar just tapped, shown straight away while the server catches up.
  const [avatar, setAvatar] = useState<number | null>(null);
  const now = useNow(v.state === 'question');
  const myAvatar = avatar ?? v.avatar;

  // Game over: hold the result until the big screen's podium reveal gets to this player's place.
  const [revealed, setRevealed] = useState(false);
  const over = v.state === 'end';
  useEffect(() => {
    if (!over) return;
    const t = setTimeout(() => {
      setRevealed(true);
      if (v.rank === 1) Sound.fanfare(); else if (v.rank <= 3) Sound.good(); else Sound.pop();
    }, revealAtFor(v.rank, v.playerCount));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  // Feedback sounds once per screen change.
  useEffect(() => {
    if (v.state === 'lobby') Sound.pop();
    if (v.state === 'reveal') v.last?.correct ? Sound.good() : Sound.bad();
    if (v.state === 'end') sessionStorage.removeItem('bz.player');
    setErr('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.state, v.qIndex]);

  async function submit({ label, ...sub }: Submission & { label: string }) {
    if (picked?.q === v.qIndex) return;
    const q = v.qIndex;
    const choice = typeof sub.choice === 'number' ? sub.choice : null;
    setErr('');
    setPicked({ q, choice, label, sent: false });
    Sound.lock();
    navigator.vibrate?.(30);
    try {
      await api('/api/answer', { ...session, ...sub });
      setPicked({ q, choice, label, sent: true });
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
          {v.team
            ? <span className="pill team-pill" style={{ background: TEAMS[v.team.team]?.color }}>You&apos;re on Team {v.team.emoji} {v.team.name}</span>
            : <span className="pill">{v.playerCount} player{v.playerCount === 1 ? '' : 's'} so far</span>}
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
      const mineHere = picked?.q === v.qIndex ? picked : null;
      const answered = v.myAnswer != null || !!mineHere;
      const mine = v.myAnswer != null && v.myAnswer >= 0 ? v.myAnswer : mineHere?.choice ?? null;
      const sending = v.myAnswer == null && !!mineHere && !mineHere.sent;

      if (v.qIndex === 0 && startsIn > READY_MS) {
        // After Start game: a 10-second countdown before the first question.
        mood = 'ready';
        const n = Math.ceil((startsIn - READY_MS) / 1000);
        body = (
          <div className="msg">
            <h1>Get <em>ready!</em></h1>
            <div className="quiz-title-pill">{v.title}</div>
            <span className="pill">{v.total} question{v.total === 1 ? '' : 's'}</span>
            <Scallop color="var(--paper)" size={150} key={n} className="pop">
              <span className="bignum">{n}</span>
            </Scallop>
            <p>Eyes on the big screen. The first question is coming.</p>
          </div>
        );
      } else if (startsIn > 0) {
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
      } else if (answered) {
        mood = 'locked';
        body = (
          <div className="msg">
            {mine != null
              ? <div className={`tile c${mine} pop`} style={{ minHeight: 0, padding: 18, borderRadius: '50%' }}><Shape i={mine} /></div>
              : <div className="locked-text pop">{mineHere?.label || '✓'}</div>}
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
            {q.kind === 'poll' && <div style={{ textAlign: 'center' }}><span className="pill">📊 Poll · no wrong answers</span></div>}
            {err && <div className="error" style={{ textAlign: 'center' }}>{err}</div>}
            <AnswerPad key={v.qIndex} q={q} disabled={left <= 0} onSubmit={submit} />
          </>
        );
      }
      break;
    }

    case 'reveal': {
      const l = v.last;
      mood = l?.correct ? 'good' : 'bad';
      if (l?.poll) {
        mood = 'good';
        body = (
          <div className="msg">
            <Scallop color="var(--paper)" size={130} className="pop"><span className="result">📊</span></Scallop>
            <h1>{l.missed ? <>No vote <em>this time</em></> : <>Thanks for <em>voting!</em></>}</h1>
            {!l.missed && v.myAnswer != null && v.answers?.[v.myAnswer] && <p>You picked <b>{v.answers[v.myAnswer]}</b></p>}
            <p className="muted">See what everyone thinks on the big screen.</p>
          </div>
        );
        break;
      }
      body = (
        <div className="msg">
          <Scallop color="var(--paper)" size={130} rotate={l?.correct ? 0 : 10} className="pop">
            <span className="result">{l?.correct ? '✓' : '✕'}</span>
          </Scallop>
          <h1>{l?.correct ? 'Correct!' : l?.missed ? <>Time&apos;s <em>up</em></> : <>Not <em>quite</em></>}</h1>
          {l?.correct
            ? <div className="bignum rise">+{l.points.toLocaleString()}</div>
            : v.solution ? <Solution kind={v.kind} solution={v.solution} /> : <p>The answer was <b>{v.answers?.[v.correct!]}</b></p>}
          {l?.correct && l.bonus > 0 && <span className="pill"><Icon name="flame" size={16} stroke={8} /> {v.streak} in a row · +{l.bonus}</span>}
          <p>You&apos;re <b>#{v.rank}</b>{v.behind && <> · {v.behind.by.toLocaleString()} behind {v.behind.name}</>}</p>
          {v.team && <TeamPill t={v.team} />}
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
          {v.team ? <TeamPill t={v.team} /> : <span className="pill">Eyes on the big screen</span>}
        </div>
      );
      break;

    case 'end': {
      mood = 'end';
      const podium = v.rank <= 3;
      if (!revealed) {
        mood = 'ready';
        body = (
          <div className="msg">
            <Scallop color="var(--paper)" size={150} className="drum"><span className="bignum" aria-hidden>🥁</span></Scallop>
            <h1>Drum<em>roll…</em></h1>
            <p>The podium is on the big screen.</p>
          </div>
        );
        break;
      }
      body = (
        <div className="msg">
          <p>Final position</p>
          <Scallop color={['var(--paper)', 'var(--lilac)', 'var(--pink)'][v.rank - 1] ?? 'var(--paper)'} size={170} className="pop">
            <span className="bignum">#{v.rank}</span>
          </Scallop>
          <h1>{podium ? <>On the <em>podium!</em></> : <>Nice <em>playing!</em></>}</h1>
          <p>{v.score.toLocaleString()} points</p>
          {v.team && <TeamPill t={v.team} final />}
          <EndActions v={v} session={session} />
        </div>
      );
      break;
    }
  }

  return (
    <div className="phone" data-mood={mood} data-theme={v.theme}>
      {v.theme !== 'classic' && MOOD_DOODLE[mood] && (
        <Doodle theme={v.theme} key={mood} name={MOOD_DOODLE[mood]} size={mood === 'lobby' ? 110 : 92} className="float wiggle" style={{ right: 12, top: 58 }} />
      )}
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
