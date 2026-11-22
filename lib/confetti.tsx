'use client';
import { useEffect, useRef } from 'react';

const COLORS = ['#d4cdf8', '#f7bddf', '#bfdc94', '#fcd5b4', '#c2ebdd', '#fbe18a', '#f8aea6', '#161616'];

type Piece = { x: number; y: number; vx: number; vy: number; r: number; spin: number; a: number; w: number; h: number; c: string; shape: number };

/** A one-off burst of pastel confetti over the whole screen. Change `fire` to launch another burst. */
export function Confetti({ fire }: { fire: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current!, ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const resize = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; };
    resize();
    addEventListener('resize', resize);

    const W = innerWidth, H = innerHeight;
    const pieces: Piece[] = [];
    // Two cannons from the bottom corners plus a shower from the top.
    const launch = (x: number, y: number, angle: number, spread: number, speed: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = angle + (Math.random() - 0.5) * spread, v = speed * (0.55 + Math.random() * 0.6);
        pieces.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.3,
          a: 1, w: 7 + Math.random() * 7, h: 10 + Math.random() * 10, c: COLORS[(Math.random() * COLORS.length) | 0], shape: (Math.random() * 3) | 0,
        });
      }
    };
    launch(0, H, -Math.PI / 3, 0.7, 22, 90);
    launch(W, H, (-2 * Math.PI) / 3, 0.7, 22, 90);
    for (let i = 0; i < 70; i++) launch(Math.random() * W, -20, Math.PI / 2, 0.6, 3, 1);

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const age = now - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const p of pieces) {
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx + Math.sin((age + p.w * 40) / 300) * 0.6; p.y += p.vy; p.r += p.spin;
        if (age > 3800) p.a = Math.max(0, p.a - 0.02);
        ctx.save();
        ctx.globalAlpha = p.a;
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.scale(1, Math.cos(age / 120 + p.w)); // flutter
        ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(0, -p.h / 2); ctx.lineTo(p.w / 2, p.h / 2); ctx.lineTo(-p.w / 2, p.h / 2); ctx.fill(); }
        ctx.restore();
      }
      if (age < 6000) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); ctx.clearRect(0, 0, canvas.width, canvas.height); };
  }, [fire]);

  return <canvas ref={ref} className="confetti" aria-hidden />;
}
