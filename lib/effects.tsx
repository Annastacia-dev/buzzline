'use client';
// Seasonal effects drawn over a quiz's screens (host stage, join page, phones, challenge links and the studio
// preview): a decoration (Christmas lights, fireworks) and/or something falling (snow, leaves, confetti, stars,
// rising hearts). One canvas, no images, never in the way of a tap. With "reduce motion" on, only the lights
// show, and they hold still.
import { useEffect, useRef } from 'react';
import type { EffectId, FallId } from './effect-ids';

export { EFFECTS, FALLS, effectOf, fallOf, effectsOf, type EffectId, type FallId } from './effect-ids';

type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; spin: number; rot: number; c: string; life: number; max: number };

const LEAF = ['#e8772e', '#c94f24', '#e0a325', '#b8641f', '#d9892b'];
const HEART = ['#ff5c8a', '#ff8fb1', '#e8366b', '#ffb3c8'];
const BULBS = ['#ff4f5e', '#ffd23f', '#3ecf8e', '#4aa8ff', '#ff8a3d'];
const SPARK = ['#ffd23f', '#ff6b9a', '#7cd6ff', '#b28bff', '#7dffb0', '#ffffff'];
const CONFETTI = ['#ff5c8a', '#ffc83d', '#3ecf8e', '#4aa8ff', '#b28bff', '#ff8a3d'];
const STAR = ['#ffc83d', '#ffd966', '#ffb020'];

function heart(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.moveTo(0, r * 0.35);
  ctx.bezierCurveTo(-r * 1.1, -r * 0.45, -r * 0.45, -r * 1.15, 0, -r * 0.45);
  ctx.bezierCurveTo(r * 0.45, -r * 1.15, r * 1.1, -r * 0.45, 0, r * 0.35);
  ctx.fill();
}

function leaf(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.9, 0, 0, r);
  ctx.quadraticCurveTo(-r * 0.9, 0, 0, -r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 40, 10, .35)';
  ctx.lineWidth = Math.max(1, r / 8);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(0, r * 1.15); ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  ctx.closePath();
  ctx.fill();
  // A warm rim so gold reads on cream and white themes too.
  ctx.strokeStyle = 'rgba(150, 95, 0, .55)'; ctx.lineWidth = 1; ctx.stroke();
}

function confetti(ctx: CanvasRenderingContext2D, r: number, rot: number) {
  // A paper strip that flips as it flutters: squash one side with the spin.
  ctx.scale(1, Math.max(0.3, Math.abs(Math.cos(rot * 2))));
  ctx.fillRect(-r / 2, -r / 3, r, r * 0.66);
}

/** A string of twinkling bulbs hanging along the top edge. */
function lights(ctx: CanvasRenderingContext2D, w: number, t: number, still: boolean) {
  const gap = w < 600 ? 34 : 46;
  const sag = w < 600 ? 10 : 16;
  const y0 = 6;
  const yAt = (x: number) => y0 + sag * Math.abs(Math.sin((x / (gap * 3)) * Math.PI));
  ctx.strokeStyle = 'rgba(40, 50, 40, .7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) (x ? ctx.lineTo : ctx.moveTo).call(ctx, x, yAt(x));
  ctx.stroke();
  const r = w < 600 ? 5 : 7;
  for (let i = 0, x = gap / 2; x < w; i++, x += gap) {
    const y = yAt(x) + 3;
    const c = BULBS[i % BULBS.length];
    const on = still ? 1 : 0.55 + 0.45 * Math.sin(t / 420 + i * 1.7);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(i) * 0.25);
    ctx.fillStyle = 'rgba(40, 50, 40, .85)';
    ctx.fillRect(-r * 0.45, -2, r * 0.9, r * 0.6);
    ctx.globalAlpha = on;
    ctx.shadowColor = c; ctx.shadowBlur = 14 * on;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, r * 1.15, r * 0.75, r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

const pick = (a: readonly string[]) => a[Math.floor(Math.random() * a.length)];

/**
 * The effect layer: a decoration and/or a falling effect, both optional. `contained` sizes it to its positioned
 * parent (the studio preview) instead of the window. Renders nothing when both are 'none'.
 */
export function SeasonalEffect({ effect, fall, contained = false }: { effect?: EffectId | null; fall?: FallId | null; contained?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const deco = effect && effect !== 'none' ? effect : null;
  const drop = fall && fall !== 'none' ? fall : null;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || (!deco && !drop)) return;
    const ctx = canvas.getContext('2d')!;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0, last = performance.now(), nextBurst = 600;
    let ps: P[] = [];     // falling things
    let sparks: P[] = []; // fireworks

    const size = () => {
      const box = contained ? canvas.parentElement!.getBoundingClientRect() : { width: innerWidth, height: innerHeight };
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = box.width; h = box.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(contained ? canvas.parentElement! : document.documentElement);

    // How many falling things: by screen area, fewer on phones, capped for big TVs.
    const [cap, per] = drop === 'snow' ? [140, 9000] : drop === 'confetti' ? [70, 14000] : [46, 26000];
    const count = () => Math.round(Math.min(cap, (w * h) / per));
    const spawn = (top: boolean): P => {
      const s = Math.min(w, h) < 600 ? 0.75 : 1;
      const x = Math.random() * w, y = top ? -20 : Math.random() * h;
      const base = { x, y, vx: 0, life: 0, max: 0, spin: (Math.random() - 0.5) * 2.4, rot: Math.random() * 6 };
      switch (drop) {
        case 'snow': {
          const r = (2 + Math.random() * 3.6) * s;
          return { ...base, y: top ? -10 : y, vy: 18 + r * 9, r, a: 0.55 + Math.random() * 0.4, spin: Math.random() * 2, c: '#fff' };
        }
        case 'hearts': {
          const r = (10 + Math.random() * 10) * s;
          return { ...base, y: top ? h + 20 : y, vy: -(16 + Math.random() * 22), r, a: 0.55 + Math.random() * 0.35, spin: Math.random() * 2, rot: (Math.random() - 0.5) * 0.6, c: pick(HEART) };
        }
        case 'confetti': {
          const r = (10 + Math.random() * 6) * s;
          return { ...base, vy: 40 + Math.random() * 45, r, a: 0.9, spin: (Math.random() - 0.5) * 6, c: pick(CONFETTI) };
        }
        case 'stars': {
          const r = (7 + Math.random() * 6) * s;
          return { ...base, vy: 20 + Math.random() * 24, r, a: 0.9, spin: (Math.random() - 0.5) * 1.2, c: pick(STAR) };
        }
        default: { // leaves
          const r = (7 + Math.random() * 7) * s;
          return { ...base, vy: 26 + Math.random() * 30, r, a: 0.75, c: pick(LEAF) };
        }
      }
    };
    if (drop) ps = Array.from({ length: count() }, () => spawn(false));

    const burst = () => {
      const x = w * (0.12 + Math.random() * 0.76), y = h * (0.1 + Math.random() * 0.35);
      const c = pick(SPARK);
      const n = Math.min(w, h) < 600 ? 28 : 44;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + Math.random() * 0.2, sp = 60 + Math.random() * 110;
        sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 2 + Math.random() * 1.5, a: 1, spin: 0, rot: 0, c, life: 0, max: 1.1 + Math.random() * 0.6 });
      }
    };

    const drawFalling = (now: number, dt: number) => {
      const want = count();
      while (ps.length < want) ps.push(spawn(true));
      const sway = drop === 'snow' ? 12 : drop === 'stars' ? 14 : 30;
      for (const p of ps) {
        p.rot += p.spin * dt;
        p.x += Math.sin(now / 1000 * (0.6 + Math.abs(p.spin) * 0.2) + p.r) * sway * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = drop === 'stars' ? p.a * (0.7 + 0.3 * Math.sin(now / 300 + p.r * 7)) : p.a;
        ctx.fillStyle = p.c;
        if (drop === 'snow') {
          // A soft blue-grey rim so white flakes still read on cream and white themes.
          ctx.shadowColor = 'rgba(50, 80, 130, .8)'; ctx.shadowBlur = 5;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(90, 120, 175, .75)'; ctx.lineWidth = 1.2; ctx.stroke();
          continue;
        }
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.rotate(drop === 'hearts' ? p.rot * 0.3 : p.rot);
        if (drop === 'hearts') heart(ctx, p.r);
        else if (drop === 'confetti') confetti(ctx, p.r, p.rot);
        else if (drop === 'stars') star(ctx, p.r);
        else leaf(ctx, p.r);
        ctx.restore();
      }
      // Recycle whatever has left the screen.
      ps = ps.filter(p => (drop === 'hearts' ? p.y > -30 : p.y < h + 30) && p.x > -40 && p.x < w + 40);
      if (ps.length > want) ps.length = want;
    };

    const drawFireworks = (dt: number) => {
      nextBurst -= dt * 1000;
      if (nextBurst <= 0) { burst(); nextBurst = 1400 + Math.random() * 2200; }
      ctx.globalCompositeOperation = 'lighter';
      sparks = sparks.filter(p => (p.life += dt) < p.max);
      for (const p of sparks) {
        p.vy += 70 * dt; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max) * 0.85;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      if (!still) {
        if (deco === 'fireworks') drawFireworks(dt);
        if (drop) drawFalling(now, dt);
      }
      ctx.globalAlpha = 1;
      // The lights hang in front of anything falling.
      if (deco === 'lights') lights(ctx, w, now, still);
      ctx.globalAlpha = 1;
      if (!still) raf = requestAnimationFrame(frame);
    };
    if (still) { if (deco === 'lights') frame(performance.now()); }
    else raf = requestAnimationFrame(frame);

    // Pause while the tab is hidden.
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === 'visible' && !still) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); ctx.clearRect(0, 0, w, h); };
  }, [deco, drop, contained]);

  if (!deco && !drop) return null;
  return <canvas ref={ref} className={`fx ${contained ? 'fx-contained' : ''}`} aria-hidden data-effect={deco ?? 'none'} data-fall={drop ?? 'none'} />;
}
