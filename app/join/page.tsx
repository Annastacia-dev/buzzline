'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import { Blob, Scallop } from '@/lib/deco';

export default function JoinPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const qp = new URLSearchParams(location.search).get('pin');
    if (qp) setPin(qp);
    setName(localStorage.getItem('bz.lastName') ?? '');
  }, []);

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
    <div className="center" style={{ position: 'relative', overflow: 'hidden' }}>
      <Blob color="var(--olive)" size={220} style={{ position: 'absolute', top: -70, right: -50 }} />
      <Scallop color="var(--pink)" size={200} rotate={20} style={{ position: 'absolute', bottom: -60, left: -50 }} />
      <Link href="/" className="logo" style={{ position: 'relative' }}>Buzzline<span className="dot" /></Link>
      <h1 style={{ fontSize: 'clamp(44px, 12vw, 64px)', lineHeight: .95, position: 'relative' }}>Ready to<br /><em>buzz in?</em></h1>
      <form className="card" onSubmit={submit} autoComplete="off"
        style={{ width: 'min(380px, 100%)', display: 'grid', gap: 10, background: 'var(--butter)', padding: 16, position: 'relative' }}>
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
