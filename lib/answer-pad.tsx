'use client';
// How a phone answers a question, for every kind: tiles (choice and poll), a text box (type) or drag-into-order
// (order). Used by live games (app/play) and challenge links (app/c).
import { useRef, useState } from 'react';
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

/**
 * Drag the items into order (mouse or finger), or use the ↑ ↓ buttons. Starts in the shuffled order everyone sees.
 * Pointer events, not HTML drag and drop, so it works on phones.
 */
function OrderPad({ items, disabled, onSubmit }: { items: string[]; disabled?: boolean; onSubmit: (s: Submission & { label: string }) => void }) {
  // The player's order: displayed positions, top to bottom.
  const [arr, setArr] = useState(() => items.map((_, d) => d));
  // The item being dragged: where it started, how far it has moved, and the height of one slot.
  const [drag, setDrag] = useState<{ d: number; from: number; dy: number; slot: number; startY: number } | null>(null);
  const [moved, setMoved] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  const target = drag ? Math.max(0, Math.min(arr.length - 1, drag.from + Math.round(drag.dy / drag.slot))) : -1;
  const move = (from: number, to: number) => {
    if (to < 0 || to >= arr.length || from === to) return;
    setArr(a => { const n = [...a]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n; });
    setMoved(true);
    navigator.vibrate?.(10);
  };

  function down(e: React.PointerEvent<HTMLLIElement>, d: number, i: number) {
    if (disabled || (e.target as HTMLElement).closest('button')) return;
    const li = e.currentTarget;
    const gap = parseFloat(getComputedStyle(listRef.current!).rowGap) || 0;
    li.setPointerCapture(e.pointerId);
    setDrag({ d, from: i, dy: 0, slot: li.offsetHeight + gap, startY: e.clientY });
  }
  function over(e: React.PointerEvent) {
    if (drag) setDrag({ ...drag, dy: e.clientY - drag.startY });
  }
  function up() {
    if (!drag) return;
    move(drag.from, target);
    setDrag(null);
  }

  return (
    <div className="order-pad">
      <p className="order-hint">{moved ? 'Happy with that order? Lock it in.' : 'Drag them into order, first at the top'}</p>
      <ol ref={listRef} className={`order-items ${drag ? 'dragging' : ''}`} aria-label="Your order, first to last">
        {arr.map((d, i) => {
          // While dragging, the others slide to make room where the dragged item would land.
          let shift = 0;
          if (drag && d !== drag.d) {
            if (drag.from < target && i > drag.from && i <= target) shift = -drag.slot;
            if (drag.from > target && i < drag.from && i >= target) shift = drag.slot;
          }
          const lifted = drag?.d === d;
          return (
            <li key={d} className={`tile c${d} ${lifted ? 'lifted' : ''}`}
              style={{ transform: `translateY(${lifted ? drag!.dy : shift}px)` }}
              onPointerDown={e => down(e, d, i)} onPointerMove={over} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
              <span className="order-n" aria-hidden>{(lifted ? target : i) + 1}</span>
              <span className="order-text">{items[d]}</span>
              <span className="order-move">
                <button type="button" aria-label={`Move ${items[d]} up`} disabled={disabled || i === 0} onClick={() => move(i, i - 1)}>↑</button>
                <button type="button" aria-label={`Move ${items[d]} down`} disabled={disabled || i === arr.length - 1} onClick={() => move(i, i + 1)}>↓</button>
              </span>
              <span className="order-grip" aria-hidden>⠿</span>
            </li>
          );
        })}
      </ol>
      <div className="order-actions">
        <button type="button" className="btn" disabled={disabled}
          onClick={() => onSubmit({ order: arr, label: arr.map(d => items[d]).join(' → ') })}>Lock it in</button>
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
