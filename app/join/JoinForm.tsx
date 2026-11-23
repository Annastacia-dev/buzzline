'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { Blob, Scallop } from '@/lib/deco';
import { Doodle } from '@/lib/doodles';
import { DEFAULT_THEME, themeOf, type ThemeId } from '@/lib/themes';

/** The join form. Once the PIN matches a game, the page takes on that quiz's theme. */
export default function JoinForm() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // The quiz behind a complete PIN, so players can see what they're joining.
  const [game, setGame] = useState<{ pin: string; title?: string; theme?: ThemeId; started?: boolean; missing?: boolean } | null>(null);

  // A PIN from the link (/join?pin=…) is looked up at once, so the page takes on the game's theme quickly.
  const linkPin = useRef<string | null>(null);
  useEffect(() => {
    const qp = new URLSearchParams(location.search).get('pin');
    if (qp) { linkPin.current = qp; setPin(qp); }
    setName(localStorage.getItem('bz.lastName') ?? '');
  }, []);

  useEffect(() => {
    if (!/^\d{6}$/.test(pin)) { setGame(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch('/api/game?' + new URLSearchParams({ pin }), { signal: ctl.signal, cache: 'no-store' })
        .then(async r => {
          if (r.status === 404) return setGame({ pin, missing: true });
          if (!r.ok) return setGame(null);
          const j = await r.json();
          setGame({ pin, title: j.title, theme: themeOf(j.theme), started: j.started });
        })
        .catch(() => {});
    }, pin === linkPin.current ? 0 : 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [pin]);
  const shown = game?.pin === pin ? game : null;
  const theme = shown?.theme ?? DEFAULT_THEME;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const r = await api<{ id: string; token: string; pin: string }>('/api/join', { pin: pin.trim(), name: name.trim() });
      localStorage.setItem('bz.lastName', name.trim());
      sessionStorage.setItem('bz.player', JSON.stringify(r));
      router.push('/play');
    } catch (e) {
      setErr((e as Error).message); setBusy(false);
    }
  }

  return (
    <div className="center join-page" data-theme={theme} style={{ position: 'relative', overflow: 'hidden' }}>
      {theme === 'classic' ? <>
        <Blob color="var(--olive)" size={220} style={{ position: 'absolute', top: -70, right: -50 }} />
        <Scallop color="var(--pink)" size={200} rotate={20} style={{ position: 'absolute', bottom: -60, left: -50 }} />
      </> : <>
        <Doodle theme={theme} name="sparkles" size={110} rotate={8} className="float wiggle" style={{ top: '6%', right: '6%' }} />
        <Doodle theme={theme} name="mascot" size={150} className="float bob" style={{ bottom: '4%', left: '4%' }} />
      </>}
      <Link href="/" className="logo" style={{ position: 'relative' }}>Buzzline<span className="dot" /></Link>
      <h1 style={{ fontSize: 'clamp(44px, 12vw, 64px)', lineHeight: .95, position: 'relative' }}>Ready to<br /><em>buzz in?</em></h1>
      <div className="join-quiz" aria-live="polite">
        {shown?.title && (
          <span className="join-quiz-tag pop" key={shown.pin}>
            <span className="join-quiz-label">{shown.started ? 'Game in progress' : "You're joining"}</span>
            <b>{shown.title}</b>
          </span>
        )}
        {shown?.missing && <span className="join-quiz-miss">No game with that PIN yet. Check the big screen.</span>}
      </div>
      <form className="card" onSubmit={submit} autoComplete="off"
        style={{ width: 'min(380px, 100%)', display: 'grid', gap: 10, background: 'var(--butter)', padding: 16, position: 'relative', zIndex: 1 }}>
        <input className="field" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6}
          placeholder="Game PIN" required autoFocus
          style={{ textAlign: 'center', letterSpacing: '.18em', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, border: 0 }} />
        <input className="field" value={name} onChange={e => setName(e.target.value)} maxLength={16}
          placeholder="Nickname" required style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, border: 0 }} />
        <button className="btn" type="submit" disabled={busy} style={{ padding: 17 }}>{busy ? 'Joining…' : <>Join game <span aria-hidden>→</span></>}</button>
        {err && <div className="error" style={{ color: 'var(--coral-ink)' }}>{err}</div>}
      </form>
      <div className="muted" style={{ position: 'relative' }}>Running the game? <Link href="/host" style={{ color: 'var(--ink)', fontWeight: 700 }}>Host a quiz →</Link></div>
    </div>
  );
}
