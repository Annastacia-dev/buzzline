'use client';

import { Children, useEffect, useState, type ReactNode } from 'react';
import styles from './landing.module.css';

// Shows one slide at a time and slides sideways to the next every 3 seconds. Hovering or focusing it pauses; the dots pick a slide.
export default function Reel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setAt(n => (n + 1) % slides.length), 3000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  return (
    <div className={styles.reel} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className={styles.reelTrack} style={{ transform: `translateX(-${at * 100}%)` }}>
        {slides.map((s, i) => <div key={i} className={styles.reelSlide} aria-hidden={i !== at || undefined} inert={i !== at || undefined}>{s}</div>)}
      </div>
      <div className={styles.reelDots}>
        {slides.map((_, i) => <button key={i} type="button" aria-label={`Show screen ${i + 1}`} aria-current={i === at} onClick={() => setAt(i)} />)}
      </div>
    </div>
  );
}
