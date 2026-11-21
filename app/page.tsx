'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

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
    <div className="center">
      <div className="logo"><span className="dot" />Buzzline</div>
      <form className="card" onSubmit={submit} autoComplete="off" style={{ width: 'min(380px, 100%)', display: 'grid', gap: 12 }}>
        <input className="field" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={6}
          placeholder="Game PIN" required autoFocus style={{ textAlign: 'center', letterSpacing: '.2em', fontWeight: 800, fontSize: 26 }} />
        <input className="field" value={name} onChange={e => setName(e.target.value)} maxLength={16}
          placeholder="Nickname" required style={{ textAlign: 'center', fontWeight: 700, fontSize: 18 }} />
        <button className="btn dark" type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join'}</button>
        <div className="error">{err}</div>
      </form>
      <div className="muted">Running the game? <Link href="/host" style={{ color: 'var(--accent)', fontWeight: 700 }}>Host a quiz →</Link></div>
    </div>
  );
}
