'use client';
// Small hand-drawn SVG charts for the admin dashboard: a line chart (crosshair + tooltip) and a bar chart
// (stacked when given several series, a tooltip per bar). Each can flip to a table of the same numbers.
// Colors come from --c1… in globals.css (validated for colorblind separation on white); text stays in ink tokens.
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type Series = { key: string; name: string; color: string };
export type Row = { label: string; long: string } & Record<string, number | string>;

const H = 220, PAD = { t: 12, r: 12, b: 26, l: 40 };
const fmt = (n: number) => n.toLocaleString('en-US');

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** 0 to a round number at or above max, in 4 steps. */
function ticks(max: number) {
  if (max <= 0) return [0, 1, 2, 3, 4];
  const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? 10 * mag;
  const s = step < 1 ? 1 : step;
  return [0, 1, 2, 3, 4].map(i => i * s);
}

/** Which x labels to print so they don't collide: about one per 70px, always the last. */
function labelEvery(n: number, plotW: number) {
  return Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 70))));
}

function Frame({ title, sub, series, rows, children }: { title: string; sub?: string; series: Series[]; rows: Row[]; children: ReactNode }) {
  const [table, setTable] = useState(false);
  return (
    <section className="adm-card">
      <header className="adm-card-head">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        <button type="button" className="adm-link" onClick={() => setTable(t => !t)} aria-pressed={table}>{table ? 'Show chart' : 'Show table'}</button>
      </header>
      {series.length > 1 && !table && (
        <ul className="adm-legend">
          {series.map(s => <li key={s.key}><i style={{ background: s.color }} />{s.name}</li>)}
        </ul>
      )}
      {table ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Date</th>{series.map(s => <th key={s.key}>{s.name}</th>)}</tr></thead>
            <tbody>{[...rows].reverse().map(r => <tr key={r.long}><td>{r.long}</td>{series.map(s => <td key={s.key}>{fmt(Number(r[s.key]))}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children}
    </section>
  );
}

function Axes({ w, max, rows, x }: { w: number; max: number; rows: Row[]; x: (i: number) => number }) {
  const t = ticks(max), top = t[t.length - 1];
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / top);
  const every = labelEvery(rows.length, w - PAD.l - PAD.r);
  return (
    <g className="adm-axes" aria-hidden>
      {t.map(v => (
        <g key={v}>
          <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'base' : 'grid'} />
          <text x={PAD.l - 8} y={y(v)} dy="0.32em" textAnchor="end">{fmt(v)}</text>
        </g>
      ))}
      {rows.map((r, i) => ((rows.length - 1 - i) % every === 0) && (
        <text key={r.long} x={x(i)} y={H - 6} textAnchor="middle">{r.label}</text>
      ))}
    </g>
  );
}

function Tip({ row, series, left, w }: { row: Row; series: Series[]; left: number; w: number }) {
  const flip = left > w * 0.6;
  return (
    <div className="adm-tip" style={flip ? { right: w - left + 12 } : { left: left + 12 }} role="status">
      <b>{row.long}</b>
      {series.map(s => (
        <div key={s.key}><i style={{ background: s.color }} />{s.name}<span>{fmt(Number(row[s.key]))}</span></div>
      ))}
    </div>
  );
}

export function LineChart({ title, sub, series, rows }: { title: string; sub?: string; series: Series[]; rows: Row[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...rows.flatMap(r => series.map(s => Number(r[s.key]))));
  const top = ticks(max)[4];
  const plotW = w - PAD.l - PAD.r;
  const x = (i: number) => PAD.l + (rows.length < 2 ? plotW / 2 : (plotW * i) / (rows.length - 1));
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / top);
  const pick = (clientX: number, el: SVGSVGElement) => {
    const px = clientX - el.getBoundingClientRect().left;
    setHover(Math.max(0, Math.min(rows.length - 1, Math.round(((px - PAD.l) / plotW) * (rows.length - 1)))));
  };
  const last = rows.length - 1;
  return (
    <Frame title={title} sub={sub} series={series} rows={rows}>
      <div ref={ref} className="adm-plot">
        <svg width={w} height={H} role="img" aria-label={`${title}: line chart. Use Show table for the numbers.`}
          onPointerMove={e => pick(e.clientX, e.currentTarget)} onPointerLeave={() => setHover(null)}>
          <Axes w={w} max={max} rows={rows} x={x} />
          {series.map((s, k) => {
            const pts = rows.map((r, i) => `${x(i)},${y(Number(r[s.key]))}`);
            return (
              <g key={s.key}>
                {k === 0 && <path d={`M${x(0)},${y(0)} L${pts.join(' L')} L${x(last)},${y(0)} Z`} fill={s.color} opacity={0.1} />}
                <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
          {hover !== null && (
            <g aria-hidden>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="adm-cross" />
              {series.map(s => <circle key={s.key} cx={x(hover)} cy={y(Number(rows[hover][s.key]))} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />)}
            </g>
          )}
          <rect x={PAD.l} y={PAD.t} width={plotW} height={H - PAD.t - PAD.b} fill="transparent" />
        </svg>
        {hover !== null && <Tip row={rows[hover]} series={series} left={x(hover)} w={w} />}
      </div>
    </Frame>
  );
}

/** A bar whose top corners are rounded 4px and whose bottom sits square on the baseline (or the bar below). */
function bar(x: number, y: number, w: number, h: number, round: boolean) {
  if (h <= 0) return '';
  const r = round ? Math.min(4, w / 2, h) : 0;
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function BarChart({ title, sub, series, rows }: { title: string; sub?: string; series: Series[]; rows: Row[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const total = (r: Row) => series.reduce((n, s) => n + Number(r[s.key]), 0);
  const max = Math.max(0, ...rows.map(total));
  const top = ticks(max)[4];
  const plotW = w - PAD.l - PAD.r, step = plotW / Math.max(1, rows.length);
  const bw = Math.max(2, Math.min(24, step * 0.7));
  const x = (i: number) => PAD.l + step * (i + 0.5);
  const scale = (v: number) => ((H - PAD.t - PAD.b) * v) / top;
  return (
    <Frame title={title} sub={sub} series={series} rows={rows}>
      <div ref={ref} className="adm-plot">
        <svg width={w} height={H} role="img" aria-label={`${title}: bar chart. Use Show table for the numbers.`} onPointerLeave={() => setHover(null)}>
          <Axes w={w} max={max} rows={rows} x={x} />
          {rows.map((r, i) => {
            let base = H - PAD.b;
            const shown = series.filter(s => Number(r[s.key]) > 0);
            return (
              <g key={r.long} opacity={hover === null || hover === i ? 1 : 0.45}>
                {shown.map((s, k) => {
                  const h = scale(Number(r[s.key]));
                  // a 2px gap of white between stacked pieces
                  const gap = k > 0 ? 2 : 0;
                  const d = bar(x(i) - bw / 2, base - h, bw, Math.max(0, h - gap), k === shown.length - 1);
                  base -= h;
                  return <path key={s.key} d={d} fill={s.color} />;
                })}
                {/* hit target: the whole column, wider than the bar */}
                <rect x={x(i) - step / 2} y={PAD.t} width={step} height={H - PAD.t - PAD.b} fill="transparent" onPointerEnter={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        {hover !== null && <Tip row={rows[hover]} series={series} left={x(hover)} w={w} />}
      </div>
    </Frame>
  );
}

/** Ranked horizontal bars with the value written beside each, for a breakdown (e.g. where quizzes came from). */
export function RankBars({ title, sub, items, color }: { title: string; sub?: string; items: { name: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <section className="adm-card">
      <header className="adm-card-head"><div><h2>{title}</h2>{sub && <p>{sub}</p>}</div></header>
      {items.length === 0 ? <p className="adm-empty">Nothing yet in this period.</p> : (
        <ul className="adm-rank">
          {items.map(i => (
            <li key={i.name}>
              <span className="adm-rank-name">{i.name}</span>
              <span className="adm-rank-bar"><i style={{ width: `${(i.value / max) * 100}%`, background: color }} /></span>
              <span className="adm-rank-n">{fmt(i.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
