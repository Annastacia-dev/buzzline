'use client';
// The admin dashboard's period picker: quick presets beside a two-month calendar for any range of days,
// plus ‹ › to step to the period before or after. Dates are plain YYYY-MM-DD strings in the viewer's time zone.
import { useEffect, useId, useRef, useState } from 'react';

export type Range = { from: string; to: string };

const MS = 86_400_000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = MONTHS.map(m => m.slice(0, 3));
const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const parse = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd); };
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => iso(parse(d) + n * MS);
export const daysIn = (r: Range) => Math.round((parse(r.to) - parse(r.from)) / MS) + 1;
/** Today in the viewer's time zone. */
export const todayLocal = () => new Intl.DateTimeFormat('en-CA').format(new Date());
const parts = (d: string) => d.split('-').map(Number) as [number, number, number];
const monthStart = (y: number, m: number) => iso(Date.UTC(y, m - 1, 1));
const monthEnd = (y: number, m: number) => iso(Date.UTC(y, m, 0));

export function presets(today: string): { id: string; name: string; range: Range }[] {
  const [y, m] = parts(today);
  const lastMonth = m === 1 ? [y - 1, 12] : [y, m - 1];
  return [
    { id: 'today', name: 'Today', range: { from: today, to: today } },
    { id: 'yesterday', name: 'Yesterday', range: { from: addDays(today, -1), to: addDays(today, -1) } },
    { id: '7', name: 'Last 7 days', range: { from: addDays(today, -6), to: today } },
    { id: '30', name: 'Last 30 days', range: { from: addDays(today, -29), to: today } },
    { id: 'month', name: 'This month', range: { from: monthStart(y, m), to: today } },
    { id: 'lastmonth', name: 'Last month', range: { from: monthStart(lastMonth[0], lastMonth[1]), to: monthEnd(lastMonth[0], lastMonth[1]) } },
    { id: '90', name: 'Last 90 days', range: { from: addDays(today, -89), to: today } },
    { id: 'year', name: 'This year', range: { from: `${y}-01-01`, to: today } },
    { id: '365', name: 'Last 12 months', range: { from: addDays(today, -364), to: today } },
  ];
}

/** "Nov 26, 2026", "Nov 1 – 26, 2026", "Oct 3 – Nov 26, 2026" or "Dec 20, 2025 – Jan 5, 2026". */
export function label(r: Range) {
  const [fy, fm, fd] = parts(r.from), [ty, tm, td] = parts(r.to);
  if (r.from === r.to) return `${SHORT[fm - 1]} ${fd}, ${fy}`;
  if (fy === ty && fm === tm) return `${SHORT[fm - 1]} ${fd} – ${td}, ${ty}`;
  if (fy === ty) return `${SHORT[fm - 1]} ${fd} – ${SHORT[tm - 1]} ${td}, ${ty}`;
  return `${SHORT[fm - 1]} ${fd}, ${fy} – ${SHORT[tm - 1]} ${td}, ${ty}`;
}
const longDate = (d: string) => { const [y, m, dd] = parts(d); return `${dd} ${MONTHS[m - 1]} ${y}`; };

export default function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const today = todayLocal();
  const list = presets(today);
  const preset = list.find(p => p.range.from === value.from && p.range.to === value.to);
  const [open, setOpen] = useState(false);
  // The right-hand month shown; the left one is the month before.
  const [view, setView] = useState(() => parts(value.to).slice(0, 2) as [number, number]);
  const [start, setStart] = useState<string | null>(null); // first click of a new range
  const [hover, setHover] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState(value.to);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key); };
  });

  function openPicker() {
    setView(parts(value.to).slice(0, 2) as [number, number]);
    setFocusDay(value.to); setStart(null); setHover(null); setOpen(true);
  }
  function close() { setOpen(false); setStart(null); setHover(null); }
  function choose(r: Range) { onChange(r); close(); }

  function pick(d: string) {
    if (!start) { setStart(d); setFocusDay(d); return; }
    choose(d < start ? { from: d, to: start } : { from: start, to: d });
  }

  // ‹ › step a whole period back or forward; forward stops at today.
  const n = daysIn(value);
  const canNext = value.to < today;
  function step(dir: -1 | 1) {
    // Whole calendar months (or this month so far) step by months: October ‹ gives September, not Aug 31 – Sep 30.
    const [fy, fm, fd] = parts(value.from), [ty2, tm2] = parts(value.to);
    if (fd === 1 && (value.to === monthEnd(ty2, tm2) || value.to === today)) {
      const k = (ty2 - fy) * 12 + (tm2 - fm) + 1, at = fy * 12 + (fm - 1) + dir * k, end = at + k - 1;
      const to = monthEnd(Math.floor(end / 12), (end % 12) + 1);
      onChange({ from: monthStart(Math.floor(at / 12), (at % 12) + 1), to: to > today ? today : to });
      return;
    }
    const from = addDays(value.from, dir * n);
    let to = addDays(value.to, dir * n);
    if (to > today) to = today;
    onChange({ from, to });
  }

  // Arrow keys move between days (a week up and down); the calendar follows the focus.
  function onGridKey(e: React.KeyboardEvent) {
    const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!move) return;
    e.preventDefault();
    let d = addDays(focusDay, move);
    if (d > today) d = today;
    setFocusDay(d);
    if (start) setHover(d);
    const [y, m] = parts(d), [vy, vm] = view;
    const at = (y - vy) * 12 + (m - vm);
    if (at > 0) setView([y, m]);
    else if (at < -1) setView(m === 12 ? [y + 1, 1] : [y, m + 1]);
  }
  useEffect(() => {
    if (open) wrap.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, view, open]);

  const lo = start ? (hover && hover < start ? hover : start) : value.from;
  const hi = start ? (hover && hover > start ? hover : start) : value.to;

  // A plain function, not a component, so the day buttons aren't remounted on every hover.
  function month(y: number, m: number) {
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => iso(Date.UTC(y, m - 1, i + 1)))];
    return (
      <div className="rp-month" key={`${y}-${m}`}>
        <h3 id={`${id}-${y}-${m}`}>{MONTHS[m - 1]} {y}</h3>
        <div className="rp-grid" role="grid" aria-labelledby={`${id}-${y}-${m}`}>
          <div className="rp-row" role="row">{WEEK.map(w => <span key={w} role="columnheader" className="rp-wd" aria-label={w}>{w}</span>)}</div>
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, r) => (
            <div className="rp-row" role="row" key={r}>
              {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                if (!d) return <span key={i} role="gridcell" className="rp-blank" />;
                const inRange = d >= lo && d <= hi, edge = d === lo || d === hi, future = d > today;
                const cls = ['rp-day', inRange && 'in', d === lo && 'lo', d === hi && 'hi', edge && 'edge', d === today && 'today'].filter(Boolean).join(' ');
                return (
                  <span key={d} role="gridcell" aria-selected={inRange}>
                    <button type="button" className={cls} data-day={d} disabled={future} tabIndex={d === focusDay ? 0 : -1}
                      aria-label={`${longDate(d)}${d === today ? ', today' : ''}`}
                      onClick={() => pick(d)} onMouseEnter={() => start && setHover(d)} onFocus={() => setFocusDay(d)}>
                      {Number(d.slice(8))}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const [vy, vm] = view;
  const prev: [number, number] = vm === 1 ? [vy - 1, 12] : [vy, vm - 1];
  const [ty, tm] = parts(today);
  const atNow = vy > ty || (vy === ty && vm >= tm);

  return (
    <div className="rp" ref={wrap}>
      <button type="button" className="rp-step" onClick={() => step(-1)} aria-label={`Previous ${n === 1 ? 'day' : `${n} days`}`} title="Previous period">‹</button>
      <button ref={trigger} type="button" className="rp-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : openPicker())}>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><rect x="3" y="4.5" width="14" height="12.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3 8.5h14M7 2.8v3.4M13 2.8v3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        {preset && <span className="rp-name">{preset.name}</span>}
        <span className="rp-dates">{label(value)}</span>
      </button>
      <button type="button" className="rp-step" onClick={() => step(1)} disabled={!canNext} aria-label={`Next ${n === 1 ? 'day' : `${n} days`}`} title="Next period">›</button>

      {open && (
        <div className="rp-pop" id={id} role="dialog" aria-label="Choose dates">
          <div className="rp-presets" role="list">
            {list.map(p => (
              <button key={p.id} type="button" role="listitem" className={preset?.id === p.id ? 'on' : ''} onClick={() => choose(p.range)}>{p.name}</button>
            ))}
          </div>
          <div className="rp-cal">
            <div className="rp-nav">
              <button type="button" onClick={() => setView(prev)} aria-label="Earlier months">‹</button>
              <button type="button" onClick={() => setView(vm === 12 ? [vy + 1, 1] : [vy, vm + 1])} disabled={atNow} aria-label="Later months">›</button>
            </div>
            <div className="rp-months" onKeyDown={onGridKey}>
              {month(prev[0], prev[1])}
              {month(vy, vm)}
            </div>
            <p className="rp-hint" aria-live="polite">
              {start ? <>From <b>{longDate(start)}</b>. Now pick the last day.</> : <>Pick a first and last day, or a day twice for one day.</>}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
