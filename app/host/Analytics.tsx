'use client';
import { useEffect, useRef, useState } from 'react';
import { Shape } from '@/lib/client';
import { Avatar } from '@/lib/avatars';
import type { GameAnalytics } from '@/lib/types';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const secs = (ms: number | null) => (ms == null ? '–' : `${(ms / 1000).toFixed(1)}s`);

/** The host's end-of-game report, in a modal. Fetches fresh each time it opens. */
export default function Analytics({ pin, token, onClose }: { pin: string; token: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<GameAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    fetch('/api/analytics?' + new URLSearchParams({ pin, token }), { cache: 'no-store' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); })
      .catch(e => setError(e.message || 'Could not load the report'));
    return () => d.close();
  }, [pin, token]);

  return (
    <dialog ref={ref} className="report" aria-labelledby="report-title"
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="report-body">
        <header className="report-head">
          <div>
            <div className="label">Game report</div>
            <h2 id="report-title">{data?.title ?? 'Loading…'}</h2>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {data && <button type="button" className="btn light small" onClick={() => downloadCsv(data)}>Download CSV</button>}
            <button type="button" className="btn small" onClick={onClose} autoFocus>Close</button>
          </div>
        </header>

        {error && <p className="error">{error}</p>}
        {!data && !error && <div className="center" style={{ minHeight: 240 }}><div className="spinner" /></div>}
        {data && <Report a={data} />}
      </div>
    </dialog>
  );
}

function Report({ a }: { a: GameAnalytics }) {
  const s = a.summary;
  if (!s.questions) return <p className="muted">No questions were scored in this game.</p>;
  return (
    <>
      <section className="kpis" aria-label="Summary">
        <Kpi label="Players" value={String(s.players)} />
        <Kpi label="Questions" value={String(s.questions)} />
        <Kpi label="Correct answers" value={pct(s.accuracy)} />
        <Kpi label="Average answer time" value={secs(s.avgMs)} />
      </section>

      <section aria-labelledby="q-title">
        <h3 id="q-title">Questions</h3>
        <div className="qcards">
          {a.questions.map((q, i) => <QuestionCard key={i} q={q} i={i} hardest={s.hardest === i} easiest={s.easiest === i} />)}
        </div>
      </section>

      <section aria-labelledby="p-title">
        <h3 id="p-title">Players</h3>
        <div className="ptable-wrap">
          <table className="ptable">
            <thead>
              <tr><th scope="col">#</th><th scope="col">Player</th><th scope="col">Score</th><th scope="col">Correct</th>
                <th scope="col">Accuracy</th><th scope="col">Avg time</th><th scope="col">Best streak</th></tr>
            </thead>
            <tbody>
              {a.players.map(p => (
                <tr key={p.name}>
                  <td>{p.rank}</td>
                  <th scope="row"><span className="who"><Avatar i={p.avatar} size={28} />{p.name}</span></th>
                  <td>{p.score.toLocaleString()}</td>
                  <td>{p.correct} / {s.questions}</td>
                  <td>{pct(p.correct / s.questions)}</td>
                  <td>{secs(p.avgMs)}</td>
                  <td>{p.bestStreak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="kpi"><span>{label}</span><b>{value}</b></div>;
}

function QuestionCard({ q, i, hardest, easiest }: { q: GameAnalytics['questions'][number]; i: number; hardest: boolean; easiest: boolean }) {
  const rate = q.players ? q.correctCount / q.players : 0;
  const max = Math.max(1, ...q.counts);
  return (
    <article className="qcard">
      <header>
        <span className="pill">Q{i + 1}</span>
        {q.double && <span className="pill dark">2×</span>}
        {hardest && <span className="pill tag-hard">Hardest</span>}
        {easiest && <span className="pill tag-easy">Easiest</span>}
      </header>
      <h4>{q.q}</h4>

      <div className="meter" role="img" aria-label={`${pct(rate)} answered correctly`}>
        <div className="meter-track"><div className="meter-fill" style={{ width: pct(rate) }} /></div>
        <b>{pct(rate)}</b><span>correct</span>
      </div>

      {/* Emphasis: the right answer in green, the others gray; "✓ correct" says it in words too. */}
      <ul className="dist" aria-label="Answers chosen">
        {q.answers.map((ans, c) => {
          const n = q.counts[c], share = q.answered ? n / q.answered : 0, right = c === q.correct;
          const tip = `${n} player${n === 1 ? '' : 's'} · ${pct(share)} — ${ans}${right ? ' (correct)' : ''}`;
          return (
            <li key={c} className={right ? 'right' : ''} tabIndex={0} data-tip={tip} aria-label={tip}>
              <span className={`dist-name s${c}`}><Shape i={c} /><span>{ans}</span>{right && <em>✓ correct</em>}</span>
              <span className="dist-bar"><span style={{ width: `${(n / max) * 100}%` }} /></span>
              <span className="dist-val">{n}</span>
            </li>
          );
        })}
      </ul>

      <footer>
        <span>Avg time <b>{secs(q.avgMs)}</b> of {q.time}s</span>
        {q.fastest && <span>Fastest <b>{q.fastest.name}</b> {secs(q.fastest.ms)}</span>}
        {q.missed > 0 && <span><b>{q.missed}</b> ran out of time</span>}
      </footer>
    </article>
  );
}

function downloadCsv(a: GameAnalytics) {
  // Quote every cell; neutralise text a spreadsheet would run as a formula (player names are typed by players).
  const cell = (v: string | number) => {
    const t = typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v);
    return `"${t.replace(/"/g, '""')}"`;
  };
  const rows: (string | number)[][] = [
    ['Rank', 'Player', 'Score', 'Correct', 'Questions', 'Avg time (s)', 'Best streak'],
    ...a.players.map(p => [p.rank, p.name, p.score, p.correct, a.summary.questions, p.avgMs == null ? '' : (p.avgMs / 1000).toFixed(2), p.bestStreak]),
    [],
    ['Question', 'Correct answer', 'Answered', 'Correct', '% correct', 'Avg time (s)', 'Answer 1 picks', 'Answer 2 picks', 'Answer 3 picks', 'Answer 4 picks'],
    ...a.questions.map(q => [q.q, q.answers[q.correct], q.answered, q.correctCount, q.players ? Math.round((q.correctCount / q.players) * 100) : 0,
      q.avgMs == null ? '' : (q.avgMs / 1000).toFixed(2), ...q.counts]),
  ];
  const csv = rows.map(r => r.map(cell).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  link.download = `${a.title.replace(/[^\w-]+/g, '_') || 'buzzline'}-report.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
