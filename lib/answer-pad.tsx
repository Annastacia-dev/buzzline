'use client';
// How a phone answers a question, for every kind: tiles (choice and poll), a text box (type) or tap-in-order
// (order). Used by live games (app/play) and challenge links (app/c).
import { useState } from 'react';
import { Shape } from './client';
import type { QuestionKind } from './types';
import type { Submission } from './kinds';

export type PadQuestion = { answers: string[]; kind?: QuestionKind };

export function AnswerPad({ q, disabled, onSubmit }: { q: PadQuestion; disabled?: boolean; onSubmit: (s: Submission & { label: string }) => void }) {
  const kind = q.kind ?? 'choice';
  if (kind === 'type') return <TypePad disabled={disabled} onSubmit={onSubmit} />;
  if (kind === 'order') return <OrderPad items={q.answers} disabled={disabled} onSubmit={onSubmit} />;
  return (
    <div className={`answers ${q.answers.length === 2 ? 'two' : ''}`}>
      {q.answers.map((a, i) => (
        <button key={i} className={`tile c${i}`} onClick={() => onSubmit({ choice: i, label: a })} disabled={disabled}>
          <Shape i={i} /><span>{a}</span>
        </button>
      ))}
    </div>
  );
}

function TypePad({ disabled, onSubmit }: { disabled?: boolean; onSubmit: (s: Submission & { label: string }) => void }) {
  const [text, setText] = useState('');
  return (
    <form className="type-pad" onSubmit={e => { e.preventDefault(); if (text.trim()) onSubmit({ text: text.trim(), label: text.trim() }); }}>
      <input className="field" value={text} onChange={e => setText(e.target.value)} placeholder="Type your answer" aria-label="Your answer"
        autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={120} enterKeyHint="send" disabled={disabled} />
      <button className="btn" disabled={disabled || !text.trim()}>Lock it in</button>
    </form>
  );
}

function OrderPad({ items, disabled, onSubmit }: { items: string[]; disabled?: boolean; onSubmit: (s: Submission & { label: string }) => void }) {
  // Positions (as shown) in the order the player tapped them.
  const [picked, setPicked] = useState<number[]>([]);
  const done = picked.length === items.length;
  const tap = (d: number) => setPicked(p => (p.includes(d) ? p.slice(0, p.indexOf(d)) : [...p, d]));
  return (
    <div className="order-pad">
      <p className="order-hint">{done ? 'Happy with that order?' : picked.length ? 'Now the next one…' : 'Tap them in order, first to last'}</p>
      <div className="order-items">
        {items.map((a, d) => {
          const n = picked.indexOf(d);
          return (
            <button key={d} type="button" className={`tile c${d} ${n >= 0 ? 'on' : ''}`} onClick={() => tap(d)} disabled={disabled}
              aria-pressed={n >= 0} aria-label={n >= 0 ? `${a}, number ${n + 1}. Tap to undo from here` : a}>
              <span className="order-n" aria-hidden>{n >= 0 ? n + 1 : ''}</span><span>{a}</span>
            </button>
          );
        })}
      </div>
      <div className="order-actions">
        <button type="button" className="btn light small" onClick={() => setPicked([])} disabled={disabled || !picked.length}>Start again</button>
        <button type="button" className="btn" disabled={disabled || !done}
          onClick={() => onSubmit({ order: picked, label: picked.map(d => items[d]).join(' → ') })}>Lock it in</button>
      </div>
    </div>
  );
}

/** The right answer after the reveal, for type and order questions. */
export function Solution({ kind, solution }: { kind?: QuestionKind; solution?: string[] }) {
  if (!solution?.length) return null;
  if (kind === 'order') {
    return <ol className="solution-order">{solution.map((s, i) => <li key={i}><b>{i + 1}</b>{s}</li>)}</ol>;
  }
  return (
    <p>The answer was <b>{solution[0]}</b>
      {solution.length > 1 && <span className="muted"> (also: {solution.slice(1).join(', ')})</span>}
    </p>
  );
}
