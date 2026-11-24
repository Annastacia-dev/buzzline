'use client';
import { useEffect, useRef, useState } from 'react';
import type { Quiz } from '@/lib/types';
import { Sticker, type IconName } from '@/lib/deco';
import { QuizSelect } from '@/lib/select';
import { AI_KINDS, PICTURE_KINDS, type AiKind } from '@/lib/kinds';

const TIMES = [5, 10, 15, 20, 30, 45, 60, 90];
const COUNTS = [5, 8, 10, 12, 15, 20];
const DIFFICULTIES = [['mixed', 'Mixed'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']] as const;
const IDEAS = ['90s pop music', 'The solar system', 'World capitals', 'Football World Cup', 'Ancient Egypt'];
const PICTURES = [
  ['none', 'None', 'Text questions only.'],
  ['some', 'Some', 'A mix: about half the questions are asked about a picture, the rest are text only.'],
  ['all', 'All', 'Every question is asked about a picture, like “Which country’s flag is this?”. Best for flags, landmarks, animals and paintings.'],
] as const;
type PictureMode = (typeof PICTURES)[number][0];
// Ideas that work best with a picture on every question: picking one gives every question a picture.
const PICTURE_IDEAS = ['Flags of the world', 'Famous landmarks', 'Famous paintings', 'Animals'];

/** "Generate with AI": topic, number of questions, seconds per question → a quiz written by Claude. */
export default function GenerateDialog({ onDone, onClose }: { onDone: (q: Quiz) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [time, setTime] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [pictures, setPictures] = useState<PictureMode>('none');
  const [kinds, setKinds] = useState<AiKind[]>(['choice', 'truefalse', 'type', 'order']);
  // Put in order isn't asked about a picture, so it doesn't apply when every question has one.
  const usable = (k: AiKind) => pictures !== 'all' || PICTURE_KINDS.includes(k);
  const picked = kinds.filter(usable);
  const kindError = !picked.length ? 'Pick at least one question type.'
    : pictures === 'some' && !picked.some(k => PICTURE_KINDS.includes(k)) ? 'Picture questions need multiple choice, true or false, or type answer.' : '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    d.querySelector<HTMLInputElement>('input.field')?.focus(); // showModal would pick the scrolling form
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
        body: JSON.stringify({ topic, count, time, difficulty, pictures, kinds: picked }),
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
            placeholder="e.g. The solar system" disabled={busy} />
        </label>
        <div className="gen-ideas" aria-label="Topic ideas">
          {IDEAS.map(t => <button key={t} type="button" className="pill" disabled={busy} onClick={() => setTopic(t)}>{t}</button>)}
          {PICTURE_IDEAS.map(t => <button key={t} type="button" className="pill" disabled={busy} onClick={() => { setTopic(t); setPictures('all'); }}>🖼 {t}</button>)}
        </div>

        <div className="gen-row">
          <div className="gen-field">
            <span id="gen-count">Questions</span>
            <QuizSelect labelledBy="gen-count" value={count} onChange={setCount} disabled={busy}
              options={COUNTS.map(n => ({ value: n, label: String(n) }))} />
          </div>
          <div className="gen-field">
            <span id="gen-time">Seconds each</span>
            <QuizSelect labelledBy="gen-time" icon="⏱" value={time} onChange={setTime} disabled={busy}
              options={TIMES.map(t => ({ value: t, label: `${t}s` }))} />
          </div>
          <div className="gen-field">
            <span id="gen-diff">Difficulty</span>
            <QuizSelect labelledBy="gen-diff" value={difficulty} onChange={setDifficulty} disabled={busy}
              options={DIFFICULTIES.map(([v, l]) => ({ value: v as string, label: l }))} />
          </div>
        </div>

        <fieldset className="gen-pictures" disabled={busy} aria-describedby="gen-kinds-hint">
          <legend>Question types</legend>
          <div className="style-chips">
            {AI_KINDS.map(k => {
              const on = kinds.includes(k.id) && usable(k.id);
              return (
                <label key={k.id} className={`style-chip ${on ? 'on' : ''} ${usable(k.id) ? '' : 'off'}`}>
                  <input type="checkbox" checked={on} disabled={!usable(k.id)}
                    onChange={e => setKinds(l => (e.target.checked ? [...l, k.id] : l.filter(x => x !== k.id)))} />
                  <span aria-hidden>{k.icon}</span>{k.name}
                </label>
              );
            })}
          </div>
          <small id="gen-kinds-hint" role="status">{kindError || (pictures === 'all' ? 'Put in order doesn’t work with a picture on every question.' : 'Claude mixes the types you pick.')}</small>
        </fieldset>

        <fieldset className="gen-pictures" disabled={busy} aria-describedby="gen-pictures-hint">
          <legend>🖼 Questions with pictures</legend>
          <div className="seg">
            {PICTURES.map(([v, name]) => (
              <label key={v} className={pictures === v ? 'on' : ''}>
                <input type="radio" name="gen-pictures" value={v} checked={pictures === v} onChange={() => setPictures(v)} />{name}
              </label>
            ))}
          </div>
          <small id="gen-pictures-hint">{PICTURES.find(([v]) => v === pictures)![2]}</small>
        </fieldset>

        {error && <p className="error" role="alert" ref={show}>{error}</p>}
        {busy && <GenLoader topic={topic.trim()} count={count} time={time} pictures={pictures !== 'none'} />}

        <div className="alert-actions">
          <button type="button" className="btn light" onClick={close}>Cancel</button>
          <button type="submit" className="btn" disabled={busy || topic.trim().length < 2 || !!kindError}>{busy ? 'Generating…' : 'Generate quiz'}</button>
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

function lines(topic: string, count: number, time: number, pictures: boolean) {
  return [
    ...(pictures ? ['Hunting down the perfect pictures…', 'Checking every picture is family-friendly…'] : []),
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

/** Scrolls a message that appears at the end of the form into view. */
const show = (el: HTMLElement | null) => el?.scrollIntoView({ block: 'nearest' });

function GenLoader({ topic, count, time, pictures }: { topic: string; count: number; time: number; pictures: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(n => n + 1), 2600);
    return () => clearInterval(t);
  }, []);
  const all = lines(topic, count, time, pictures);
  const st = STICKERS[i % STICKERS.length];
  return (
    <div className="gen-loader" ref={show}>
      <span className="sr-only" role="status">Generating {count} questions about {topic}. This can take up to a minute.</span>
      <div className="gen-sticker" key={`s${i % STICKERS.length}`} aria-hidden>
        <Sticker {...st} size={96} />
      </div>
      <div aria-hidden>
        <p className="gen-line" key={`l${i}`}>{all[i % all.length]}</p>
        <p className="gen-note">{pictures ? 'With pictures this can take a minute or two.' : 'Good quizzes take up to a minute.'}</p>
      </div>
    </div>
  );
}
