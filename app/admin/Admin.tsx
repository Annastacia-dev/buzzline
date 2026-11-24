'use client';
// The admin dashboard: Google sign-in, then usage numbers for a period with charts.
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart, LineChart, RankBars, type Row, type Series } from './Charts';

type Totals = {
  visits: number; visitors: number; quizzes: number; creators: number; hosted: number; hosts: number;
  games: number; finished: number; players: number; playersInGames: number; challenges: number; runs: number; runsFinished: number; ai: number;
};
type Day = { day: string; visits: number; visitors: number; quizzes: number; creators: number; games: number; players: number; runs: number };
type Stats = {
  days: number; from: string; totals: Totals; previous: Totals; daily: Day[];
  sources: Record<string, number>; pages: { path: string; visits: number; visitors: number }[]; referrers: { ref: string; visits: number }[];
};

type GoogleId = {
  initialize(o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string; auto_select?: boolean }): void;
  renderButton(el: HTMLElement, o: Record<string, unknown>): void;
  disableAutoSelect(): void;
};
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

const C = { 1: 'var(--c1)', 2: 'var(--c2)', 3: 'var(--c3)', 4: 'var(--c4)', 5: 'var(--c5)', 6: 'var(--c6)' } as const;
const PERIODS = [{ d: 7, name: '7 days' }, { d: 30, name: '30 days' }, { d: 90, name: '90 days' }, { d: 365, name: '12 months' }];
const SOURCE_NAMES: Record<string, string> = {
  blank: 'Written from scratch', ai: 'Generated with AI', import: 'Imported spreadsheet', pack: 'Ready-made quiz', shared: 'Opened a shared link', sample: 'Sample quiz',
};
const fmt = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'Something went wrong'), { status: r.status });
  return d as T;
}

export default function Admin({ clientId }: { clientId?: string }) {
  const [me, setMe] = useState<string | null | undefined>(undefined);
  useEffect(() => { call<{ email: string | null }>('/api/admin/session').then(d => setMe(d.email), () => setMe(null)); }, []);
  const signOut = async () => {
    await call('/api/admin/session', { method: 'DELETE' }).catch(() => {});
    window.google?.accounts.id.disableAutoSelect();
    setMe(null);
  };
  if (me === undefined) return <main className="adm"><p className="adm-empty">Loading…</p></main>;
  if (!me) return <SignIn clientId={clientId} onIn={setMe} />;
  return <Dashboard email={me} onSignOut={signOut} onExpired={() => setMe(null)} />;
}

function SignIn({ clientId, onIn }: { clientId?: string; onIn: (email: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!clientId) return;
    const ready = () => {
      const id = window.google?.accounts.id;
      if (!id || !box.current) return;
      id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setErr('');
          try { onIn((await call<{ email: string }>('/api/admin/session', { method: 'POST', body: JSON.stringify({ credential }) })).email); }
          catch (e) { setErr((e as Error).message); }
        },
      });
      id.renderButton(box.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 280 });
    };
    if (window.google?.accounts) { ready(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = ready;
    s.onerror = () => setErr("Couldn't load Google sign-in. Check your connection or ad blocker.");
    document.head.appendChild(s);
  }, [clientId, onIn]);
  return (
    <main className="adm adm-signin">
      <div className="adm-card adm-signin-card">
        <Link href="/" className="logo">Buzzline<span className="dot" /></Link>
        <h1>Admin</h1>
        <p>Sign in with the Google account that runs Buzzline to see how it&rsquo;s being used.</p>
        {clientId ? <div ref={box} className="adm-gsi" /> : <p className="error">Google sign-in isn&rsquo;t set up on this server yet (NEXT_PUBLIC_GOOGLE_CLIENT_ID).</p>}
        {err && <p className="error" role="alert">{err}</p>}
      </div>
    </main>
  );
}

/** "Nov 24" for the axis, "Mon, Nov 24, 2026" for tooltips and tables. Days arrive as YYYY-MM-DD. */
function dayLabels(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return {
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    long: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
  };
}

/** Daily rows, or weekly ones for a year (52 bars read better than 365). */
function toRows(daily: Day[], weekly: boolean): Row[] {
  if (!weekly) return daily.map(d => ({ ...d, ...dayLabels(d.day) }));
  const out: Row[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const wk = daily.slice(i, i + 7), first = dayLabels(wk[0].day), end = dayLabels(wk[wk.length - 1].day);
    const sum = (k: keyof Day) => wk.reduce((n, d) => n + Number(d[k]), 0);
    out.push({
      label: first.label, long: `Week of ${first.long}${wk.length < 7 ? ` (to ${end.label})` : ''}`,
      visits: sum('visits'), visitors: sum('visitors'), quizzes: sum('quizzes'), creators: sum('creators'), games: sum('games'), players: sum('players'), runs: sum('runs'),
    });
  }
  return out;
}

function Delta({ now, before }: { now: number; before: number }) {
  if (!before && !now) return <span className="adm-delta">No change</span>;
  if (!before) return <span className="adm-delta up">New this period</span>;
  const pct = Math.round(((now - before) / before) * 100);
  return (
    <span className={`adm-delta ${pct > 0 ? 'up' : pct < 0 ? 'down' : ''}`}>
      {pct > 0 ? '▲' : pct < 0 ? '▼' : '='} {Math.abs(pct)}% <small>vs {fmt(before)} before</small>
    </span>
  );
}

function Kpi({ name, value, before, note }: { name: string; value: number; before: number; note?: string }) {
  return (
    <div className="adm-kpi">
      <span className="adm-kpi-name">{name}</span>
      <b>{fmt(value)}</b>
      <Delta now={value} before={before} />
      {note && <small className="adm-kpi-note">{note}</small>}
    </div>
  );
}

function Dashboard({ email, onSignOut, onExpired }: { email: string; onSignOut: () => void; onExpired: () => void }) {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async (d: number) => {
    setLoading(true); setErr('');
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      setS(await call<Stats>(`/api/admin/stats?days=${d}&tz=${encodeURIComponent(tz)}`));
    } catch (e) {
      if ((e as { status?: number }).status === 401) onExpired();
      else setErr((e as Error).message);
    } finally { setLoading(false); }
  }, [onExpired]);
  useEffect(() => { void load(days); }, [days, load]);

  const t = s?.totals, p = s?.previous;
  const weekly = days > 90;
  const rows = s ? toRows(s.daily, weekly) : [];
  const per = weekly ? 'per week' : 'per day';
  const visits: Series[] = [{ key: 'visits', name: 'Page views', color: C[1] }, { key: 'visitors', name: 'Unique visitors', color: C[2] }];
  const playing: Series[] = [{ key: 'players', name: 'Players in live games', color: C[1] }, { key: 'runs', name: 'Challenge plays', color: C[3] }];
  const sources = s ? Object.entries(s.sources).map(([k, v]) => ({ name: SOURCE_NAMES[k] ?? k, value: v })).sort((a, b) => b.value - a.value) : [];

  return (
    <main className="adm">
      <header className="adm-top">
        <div className="adm-brand">
          <Link href="/" className="logo">Buzzline<span className="dot" /></Link>
          <span className="pill">Admin</span>
        </div>
        <div className="seg adm-period" role="radiogroup" aria-label="Period">
          {PERIODS.map(x => (
            <label key={x.d} className={days === x.d ? 'on' : ''}>
              <input type="radio" name="adm-period" checked={days === x.d} onChange={() => setDays(x.d)} />{x.name}
            </label>
          ))}
        </div>
        <div className="adm-who">
          <span title={email}>{email}</span>
          <button type="button" className="btn ghost small" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      {err && <p className="error" role="alert">{err} <button type="button" className="adm-link" onClick={() => load(days)}>Try again</button></p>}
      {!s && !err && <p className="adm-empty">Loading…</p>}

      {s && t && p && (
        <div className={`adm-body ${loading ? 'loading' : ''}`} aria-busy={loading}>
          <div className="adm-kpis">
            <Kpi name="Unique visitors" value={t.visitors} before={p.visitors} note={plural(t.visits, 'page view')} />
            <Kpi name="Quizzes created" value={t.quizzes} before={p.quizzes} note={`by ${plural(t.creators, 'person', 'people')}`} />
            <Kpi name="Games played" value={t.games} before={p.games} note={`${fmt(t.finished)} played to the end`} />
            <Kpi name="Players in games" value={t.players} before={p.players} note={t.games ? `${(t.playersInGames / t.games).toFixed(1)} per game on average` : undefined} />
            <Kpi name="Challenge plays" value={t.runs} before={p.runs} note={`${plural(t.challenges, 'link')} made · ${fmt(t.runsFinished)} finished`} />
            <Kpi name="People hosting" value={t.hosts} before={p.hosts} note={`${plural(t.hosted, 'game')} set up · ${plural(t.ai, 'AI quiz', 'AI quizzes')}`} />
          </div>

          <LineChart title="Visits" sub={`Page views and unique visitors ${per}`} series={visits} rows={rows} />
          <div className="adm-grid">
            <BarChart title="Games played" sub={`Live games started ${per}`} series={[{ key: 'games', name: 'Games played', color: C[1] }]} rows={rows} />
            <BarChart title="People playing" sub={`Players who joined a live game, and challenge-link plays, ${per}`} series={playing} rows={rows} />
            <BarChart title="Quizzes created" sub={`New quizzes in the studio ${per}`} series={[{ key: 'quizzes', name: 'Quizzes created', color: C[1] }]} rows={rows} />
            <RankBars title="Where quizzes came from" sub="Every quiz added to a studio this period" items={sources} color={C[1]} />
          </div>
          <div className="adm-grid">
            <section className="adm-card">
              <header className="adm-card-head"><div><h2>Top pages</h2><p>Page views and unique visitors</p></div></header>
              {s.pages.length === 0 ? <p className="adm-empty">No visits yet in this period.</p> : (
                <table className="adm-table">
                  <thead><tr><th>Page</th><th>Views</th><th>Visitors</th></tr></thead>
                  <tbody>{s.pages.map(x => <tr key={x.path}><td><code>{x.path}</code></td><td>{fmt(x.visits)}</td><td>{fmt(x.visitors)}</td></tr>)}</tbody>
                </table>
              )}
            </section>
            <RankBars title="Where visitors came from" sub="Other sites that linked here (direct visits not counted)" items={s.referrers.map(r => ({ name: r.ref, value: r.visits }))} color={C[2]} />
          </div>
          <p className="adm-foot">
            Counted by Buzzline itself, without cookies or stored IP addresses. A unique visitor is one browser on one day, so a person who comes
            back on three days counts three times. Numbers start from when tracking went live.
          </p>
        </div>
      )}
    </main>
  );
}
