'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/** An option; `icon` is drawn before its label (in the list and on the button), `hint` as a second line in the list. */
export interface Option<T extends string | number> { value: T; label: string; icon?: ReactNode; hint?: string }

/**
 * A chunky, quiz-styled dropdown (replaces native <select>). Accessible as a listbox:
 * Enter / Space / ↓ opens, ↑ ↓ Home End move, Enter picks, Escape or Tab closes, typing jumps to an option.
 */
export function QuizSelect<T extends string | number>({ value, options, onChange, label, labelledBy, icon, disabled, size = 'md', className = '' }: {
  value: T; options: Option<T>[]; onChange: (v: T) => void;
  /** Accessible name when there is no visible label to point at. */
  label?: string; labelledBy?: string;
  icon?: ReactNode; disabled?: boolean; size?: 'sm' | 'md'; className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const selected = Math.max(0, options.findIndex(o => o.value === value));
  const current = options[selected];

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);

  // Keep the active option in view and focus the list while open.
  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const show = () => { if (disabled) return; setActive(selected); setOpen(true); };
  const pick = (i: number) => {
    setOpen(false);
    button.current?.focus();
    if (options[i] && options[i].value !== value) onChange(options[i].value);
  };

  function onListKey(e: React.KeyboardEvent) {
    const last = options.length - 1;
    const move = (i: number) => { e.preventDefault(); setActive(Math.min(last, Math.max(0, i))); };
    switch (e.key) {
      case 'ArrowDown': return move(active + 1);
      case 'ArrowUp': return move(active - 1);
      case 'Home': return move(0);
      case 'End': return move(last);
      case 'PageDown': return move(active + 5);
      case 'PageUp': return move(active - 5);
      case 'Enter': case ' ': e.preventDefault(); return pick(active);
      case 'Escape': e.preventDefault(); setOpen(false); button.current?.focus(); return;
      case 'Tab': setOpen(false); return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = Date.now(), t = typed.current;
          t.text = now - t.at > 700 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
          t.at = now;
          const hit = options.findIndex(o => o.label.toLowerCase().startsWith(t.text));
          if (hit >= 0) setActive(hit);
        }
    }
  }

  return (
    <div ref={root} className={`qsel qsel-${size} ${open ? 'open' : ''} ${className}`}>
      <button ref={button} type="button" className="qsel-btn" disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined}
        aria-label={label ? `${label}: ${current?.label ?? ''}` : undefined}
        aria-labelledby={!label && labelledBy ? `${labelledBy} ${id}-val` : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={e => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); } }}>
        {(current?.icon ?? icon) && <span className="qsel-icon" aria-hidden>{current?.icon ?? icon}</span>}
        <span id={`${id}-val`} className="qsel-val">{current?.label}</span>
        <svg className="qsel-chev" viewBox="0 0 20 20" width="14" height="14" aria-hidden><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul ref={list} id={`${id}-list`} role="listbox" tabIndex={-1} className="qsel-list"
          aria-label={label} aria-labelledby={!label ? labelledBy : undefined}
          aria-activedescendant={`${id}-o${active}`} onKeyDown={onListKey}>
          {options.map((o, i) => (
            <li key={String(o.value)} id={`${id}-o${i}`} data-i={i} role="option" aria-selected={i === selected}
              className={`qsel-opt s${i % 4} ${i === active ? 'active' : ''}`}
              onPointerMove={() => setActive(i)} onClick={() => pick(i)}>
              {o.icon && <span className="qsel-icon" aria-hidden>{o.icon}</span>}
              <span className="qsel-text">{o.label}{o.hint && <small>{o.hint}</small>}</span>
              {i === selected && <span className="qsel-tick" aria-hidden>✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
