'use client';
import { useEffect, useState } from 'react';
import { browserDb } from './supabase-browser';
import { SHAPE_PATHS as PATHS } from './shapes';

export function Shape({ i }: { i: number }) {
  return <svg className="shape" viewBox="0 0 24 24" aria-hidden><path d={PATHS[i]} /></svg>;
}

export async function api<T = { ok: true }>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data as T;
}

const REFRESH = 'buzzline:refresh';
/** Refetch this screen's view now, e.g. right after its own action, instead of waiting for the realtime ping. */
export const refreshGame = () => window.dispatchEvent(new Event(REFRESH));

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
      let wait = v.state === 'question' ? (v.remaining ?? 0) + 600 : 15000;
      // The big screen also checks every 2.5s in the lobby and during questions, so a dropped
      // realtime message can never leave "0 of 3 answered" or a missing player on screen.
      if (isHost && (v.state === 'question' || v.state === 'lobby')) wait = Math.min(wait, 2500);
      timer = setTimeout(load, wait);
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
    window.addEventListener(REFRESH, load);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(REFRESH, load);
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
