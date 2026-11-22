'use client';
import { useEffect, useRef, useState } from 'react';
import type { Quiz } from '@/lib/types';
import { Sticker, type IconName } from '@/lib/deco';

const TIMES = [5, 10, 15, 20, 30, 45, 60, 90];
const COUNTS = [5, 8, 10, 12, 15, 20];
const DIFFICULTIES = [['mixed', 'Mixed'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']] as const;
const IDEAS = ['90s pop music', 'The solar system', 'World capitals', 'Famous paintings', 'Football World Cup', 'Ancient Egypt'];

/** "Generate with AI": topic, number of questions, seconds per question → a quiz written by Claude. */
export default function GenerateDialog({ onDone, onClose }: { onDone: (q: Quiz) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [time, setTime] = useState(20);
  const [difficulty, setDifficulty] = useState('mixed');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => { abort.current?.abort(); d.close(); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    abort.current = new AbortController();
    try {
      const r = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.current.signal,
        body: JSON.stringify({ topic, count, time, difficulty }),
      });
      const j = await r.json().catch(() => ({ error: 'The server returned an unexpected reply' }));
      if (!r.ok) throw new Error(j.error || 'Could not generate the quiz');
      onDone(j as Quiz);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError((err as Error).message || 'Could not generate the quiz');
      setBusy(false);
    }
  }

  const close = () => { abort.current?.abort(); onClose(); };

  return (
    <dialog ref={ref} className="alert-dialog gen-dialog" aria-labelledby="gen-title"
      onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === e.currentTarget && !busy) close(); }}>
      <form className="alert-body" onSubmit={submit} aria-busy={busy}>
        <h2 id="gen-title">✨ Generate with AI</h2>
        <p>Pick a topic and Claude writes the questions. You can edit everything afterwards.</p>

        <label className="gen-field">
          <span>Topic</span>
          <input className="field" value={topic} onChange={e => setTopic(e.target.value)} maxLength={200} required minLength={2}
            placeholder="e.g. The solar system" autoFocus disabled={busy} />
        </label>
        <div className="gen-ideas" aria-label="Topic ideas">
          {IDEAS.map(t => <button key={t} type="button" className="pill" disabled={busy} onClick={() => setTopic(t)}>{t}</button>)}
        </div>

        <div className="gen-row">
          <label className="gen-field">
            <span>Questions</span>
            <select className="field" value={count} onChange={e => setCount(Number(e.target.value))} disabled={busy}>
              {COUNTS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="gen-field">
            <span>Seconds each</span>
            <select className="field" value={time} onChange={e => setTime(Number(e.target.value))} disabled={busy}>
              {TIMES.map(t => <option key={t} value={t}>{t}s</option>)}
            </select>
          </label>
          <label className="gen-field">
            <span>Difficulty</span>
            <select className="field" value={difficulty} onChange={e => setDifficulty(e.target.value)} disabled={busy}>
              {DIFFICULTIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        {busy && <GenLoader topic={topic.trim()} count={count} time={time} />}

        <div className="alert-actions">
          <button type="button" className="btn light" onClick={close}>Cancel</button>
          <button type="submit" className="btn" disabled={busy || topic.trim().length < 2}>{busy ? 'Generating…' : 'Generate quiz'}</button>
        </div>
      </form>
    </dialog>
  );
}

// While Claude writes: a slowly spinning sticker and a cheeky line, both changing every few seconds.
const STICKERS: { text: string; icon: IconName; bg: string; ink: string }[] = [
  { text: 'quiz in the oven · quiz in the oven · ', icon: 'flame', bg: 'var(--pink)', ink: 'var(--pink-ink)' },
  { text: 'big brain energy · big brain energy · ', icon: 'sparkle', bg: 'var(--lilac)', ink: 'var(--lilac-ink)' },
  { text: 'fun facts loading · fun facts loading · ', icon: 'bolt', bg: 'var(--butter)', ink: 'var(--butter-ink)' },
  { text: 'trust the process · trust the process · ', icon: 'smile', bg: 'var(--sage)', ink: 'var(--sage-ink)' },
  { text: 'future champions · future champions · ', icon: 'trophy', bg: 'var(--butter)', ink: 'var(--butter-ink)' },
  { text: 'no peeking · no peeking · no peeking · ', icon: 'star', bg: 'var(--pink)', ink: 'var(--pink-ink)' },
];

function lines(topic: string, count: number, time: number) {
  return [
    `Brewing ${count} questions about ${topic}…`,
    'Bribing the trivia gods…',
    'Teaching the wrong answers to look convincing…',
    'Hiding the right answer behind a decoy…',
    `Asking a very serious librarian about ${topic}…`,
    'Shuffling answers like a card shark…',
    'Fact-checking with a stern face…',
    'Adding a pinch of spice to one question…',
    'Polishing the buzzers…',
    `Counting to ${time}, very slowly…`,
    'Warming up the scoreboard…',
    'Almost there. Probably. Definitely maybe.',
  ];
}

function GenLoader({ topic, count, time }: { topic: string; count: number; time: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(n => n + 1), 2600);
    return () => clearInterval(t);
  }, []);
  const all = lines(topic, count, time);
  const st = STICKERS[i % STICKERS.length];
  return (
    <div className="gen-loader">
      <span className="sr-only" role="status">Generating {count} questions about {topic}. This can take up to a minute.</span>
      <div className="gen-sticker" key={`s${i % STICKERS.length}`} aria-hidden>
        <Sticker {...st} size={96} />
      </div>
      <div aria-hidden>
        <p className="gen-line" key={`l${i}`}>{all[i % all.length]}</p>
        <p className="gen-note">Good quizzes take up to a minute.</p>
      </div>
    </div>
  );
}
