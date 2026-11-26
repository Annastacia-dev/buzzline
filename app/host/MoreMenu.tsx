'use client';
import { useEffect, useId, useRef, useState } from 'react';

export interface MoreItem { label: string; onClick: () => void; busy?: boolean; danger?: boolean }

/**
 * A "⋯" button that opens a short menu of actions. Used on phones, where the studio's
 * Share, Challenge link and Delete buttons don't fit beside the Preview / Edit tabs.
 */
export default function MoreMenu({ items, label = 'More actions' }: { items: MoreItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    // Focus the first item, and close on Escape or a tap anywhere else.
    wrap.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus();
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key); };
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const list = Array.from(wrap.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? []);
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    list[(at + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length]?.focus();
  }

  return (
    <div className="more-menu" ref={wrap}>
      <button ref={button} type="button" className="btn ghost small more-btn" aria-label={label} title={label}
        aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        <span aria-hidden>⋯</span>
      </button>
      {open && (
        <div className="more-list" role="menu" id={id} aria-label={label} onKeyDown={onMenuKey}>
          {items.map(it => (
            <button key={it.label} type="button" role="menuitem" className={it.danger ? 'danger' : ''} aria-busy={it.busy}
              onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
