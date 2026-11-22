'use client';
import { useEffect, useState } from 'react';
import { browserDb } from './supabase-browser';

const PATHS = [
  'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z', // star
  'M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 4 6.3 4c2.3 0 3.9 1.3 5.7 3.4C13.8 5.3 15.4 4 17.7 4c4 0 5.9 4.4 4.3 7.7C19.5 16.4 12 21 12 21z', // heart
  'M13.5 2L4 14h6.5L9 22l11-13h-6.8z', // bolt
  'M15.5 2.5A9.5 9.5 0 1 0 21.5 17 8 8 0 0 1 15.5 2.5z', // moon
];

export function Shape({ i }: { i: number }) {
  return <svg className="shape" viewBox="0 0 24 24" aria-hidden><path d={PATHS[i]} /></svg>;
}

export async function api<T = { ok: true }>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data as T;
}

/** A pushed view plus the local time it arrived, so countdowns ignore clock skew between devices. */
export type Stamped<T> = T & { at: number };

/**
 * Live view of a game for one screen. Listens on the game's Supabase Realtime channel for "something changed"
 * pings and refetches its own view from /api/view (which holds the secrets, e.g. the correct answer).
 * Also refetches when a question's timer should have run out, when the tab becomes visible, and every 15s as a safety net.
 */
export function useGameStream<T extends { state: string }>(params: Record<string, string> | null) {
  const [view, setView] = useState<Stamped<T> | null>(null);
  const key = params ? new URLSearchParams(params).toString() : null;

  useEffect(() => {
    if (!key) return;
    const p = new URLSearchParams(key);
    const isHost = p.get('role') === 'host';
    let alive = true, inflight = false, again = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (v: { state: string; remaining?: number }) => {
      clearTimeout(timer);
      if (v.state === 'closed' || v.state === 'kicked') return;
      // Just after the buzzer the server ends the question on read, so ask again then.
      timer = setTimeout(load, v.state === 'question' ? (v.remaining ?? 0) + 600 : 15000);
    };

    async function load() {
      if (inflight) { again = true; return; } // coalesce bursts of pings into one extra fetch
      inflight = true;
      try {
        const res = await fetch('/api/view?' + key, { cache: 'no-store' });
        const v = await res.json();
        if (alive && res.ok) { setView({ ...v, at: performance.now() }); schedule(v); }
        else if (alive) schedule({ state: 'retry', remaining: 0 });
      } catch {
        if (alive) schedule({ state: 'retry' });
      } finally {
        inflight = false;
        if (again && alive) { again = false; load(); }
      }
    }

    const sb = browserDb();
    const channel = sb.channel(`buzzline:game:${p.get("pin")}`)
      .on('broadcast', { event: 'update' }, ({ payload }) => {
        const ping = payload as { to?: string; players?: number };
        if (!isHost && typeof ping.players === 'number')
          setView(v => (v && v.state === 'lobby' ? { ...v, playerCount: ping.players } : v));
        if (isHost || ping.to === 'all') load();
      })
      .subscribe(status => { if (status === 'SUBSCRIBED') load(); }); // catch anything missed while connecting

    load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      sb.removeChannel(channel);
    };
  }, [key]);

  return view;
}

/** Re-renders every `ms` while `active`, returning performance.now(). */
export function useNow(active: boolean, ms = 100) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(performance.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return active ? now : performance.now();
}

/** Tiny synth so there's audio feedback without any asset files. */
export const Sound = (() => {
  let ctx: AudioContext | undefined;
  const beep = (freq: number, dur = 0.12, type: OscillatorType = 'sine', vol = 0.15, when = 0) => {
    try {
      ctx ??= new AudioContext();
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
    } catch {}
  };
  return {
    tick: () => beep(880, 0.05, 'square', 0.05),
    good: () => { beep(660, 0.12, 'triangle'); beep(990, 0.2, 'triangle', 0.15, 0.1); },
    bad: () => beep(220, 0.25, 'sawtooth', 0.08),
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.25, 'triangle', 0.15, i * 0.12)),
  };
})();
