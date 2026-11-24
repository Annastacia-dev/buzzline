'use client';
// The studio toolbar's "Style" control: one button that sums up the look (theme swatch, decoration and falling
// effect) and opens a panel to change all three, and the Solo / Teams switch. Both use native radio buttons, so
// arrow keys and screen readers work as usual.
import { useEffect, useId, useRef, useState } from 'react';
import { THEMES, type ThemeId } from '@/lib/themes';
import { EFFECTS, FALLS, type EffectId, type FallId } from '@/lib/effect-ids';
import { TEAMS } from '@/lib/teams';

function Swatch({ colors }: { colors: readonly string[] }) {
  return <span className="sw" aria-hidden>{colors.map((c, k) => <i key={k} style={{ background: c }} />)}</span>;
}

/** A row of radio chips. */
function Chips<T extends string>({ name, legend, value, options, onChange }: {
  name: string; legend: string; value: T;
  options: readonly { id: T; name: string; icon: string; hint: string }[]; onChange: (v: T) => void;
}) {
  return (
    <fieldset className="style-section">
      <legend>{legend}</legend>
      <div className="style-chips">
        {options.map(o => (
          <label key={o.id} className={`style-chip ${o.id === value ? 'on' : ''}`} title={o.hint}>
            <input type="radio" name={name} value={o.id} checked={o.id === value} onChange={() => onChange(o.id)} />
            <span aria-hidden>{o.id === 'none' ? '∅' : o.icon}</span>
            {o.id === 'none' ? 'None' : o.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function StylePicker({ theme, effect, fall, onTheme, onEffect, onFall }: {
  theme: ThemeId; effect: EffectId; fall: FallId;
  onTheme: (t: ThemeId) => void; onEffect: (e: EffectId) => void; onFall: (f: FallId) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const t = THEMES.find(x => x.id === theme) ?? THEMES[0];
  const deco = EFFECTS.find(e => e.id === effect);
  const drop = FALLS.find(f => f.id === fall);
  const extras = [deco, drop].filter(x => x && x.id !== 'none') as { icon: string; name: string }[];

  // Close on a click elsewhere or Escape; focus the chosen theme when it opens.
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', off);
    document.addEventListener('keydown', esc);
    panel.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={root} className={`qsel qsel-md style-pick ${open ? 'open' : ''}`}>
      <button ref={button} type="button" className="qsel-btn" aria-expanded={open} aria-controls={open ? `${id}-panel` : undefined}
        aria-label={`Style: ${t.name}${extras.length ? ` with ${extras.map(x => x.name.toLowerCase()).join(' and ')}` : ''}`}
        onClick={() => setOpen(o => !o)}>
        <Swatch colors={t.swatch} />
        <span className="qsel-val">{t.name}</span>
        {extras.length > 0 && <span className="style-extras" aria-hidden>{extras.map(x => x.icon).join('')}</span>}
        <svg className="qsel-chev" viewBox="0 0 20 20" width="14" height="14" aria-hidden><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div ref={panel} id={`${id}-panel`} className="style-panel" role="dialog" aria-label="Quiz style">
          <fieldset className="style-section">
            <legend>Theme</legend>
            <div className="style-themes">
              {THEMES.map(x => (
                <label key={x.id} className={`style-theme ${x.id === theme ? 'on' : ''}`} title={x.blurb}>
                  <input type="radio" name={`${id}-theme`} value={x.id} checked={x.id === theme} onChange={() => onTheme(x.id)} />
                  <span className="style-theme-sw" aria-hidden>{x.swatch.map((c, k) => <i key={k} style={{ background: c }} />)}</span>
                  <b>{x.name}</b>
                </label>
              ))}
            </div>
          </fieldset>
          <Chips name={`${id}-deco`} legend="Decoration" value={effect} options={EFFECTS} onChange={onEffect} />
          <Chips name={`${id}-fall`} legend="Falling" value={fall} options={FALLS} onChange={onFall} />
          <div className="style-foot">
            <span>The preview shows your picks.</span>
            <button type="button" className="btn small" onClick={() => { setOpen(false); button.current?.focus(); }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Solo or teams: a two-way switch, with the number of teams beside it once Teams is on. */
export function TeamSwitch({ teams, onChange }: { teams: number; onChange: (n: number) => void }) {
  const id = useId();
  const last = useRef(teams || 2); // remembers 2, 3 or 4 when switching back from Solo
  if (teams) last.current = teams;
  return (
    <div className="team-switch" role="group" aria-label="Solo or teams">
      <div className="seg">
        <label className={!teams ? 'on' : ''} title="Everyone for themselves">
          <input type="radio" name={`${id}-mode`} checked={!teams} onChange={() => onChange(0)} />
          <span aria-hidden>🙋</span> Solo
        </label>
        <label className={teams ? 'on' : ''} title="Players are split into teams as they join. A team scores the average of its players.">
          <input type="radio" name={`${id}-mode`} checked={!!teams} onChange={() => onChange(last.current)} />
          <span aria-hidden>👥</span> Teams
        </label>
      </div>
      {teams > 0 && (
        <div className="seg seg-n" role="radiogroup" aria-label="Number of teams">
          {[2, 3, 4].map(n => (
            <label key={n} className={teams === n ? 'on' : ''} title={TEAMS.slice(0, n).map(t => `${t.emoji} ${t.name}`).join(', ')}>
              <input type="radio" name={`${id}-n`} checked={teams === n} onChange={() => onChange(n)} />
              {n}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
