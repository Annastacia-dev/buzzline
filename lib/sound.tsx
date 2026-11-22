'use client';
// Buzzline's music and sound effects, synthesized live with the Web Audio API (no audio files).
// All tunes here are original. Music loops play on the host's big screen; phones get short effects only.
import { useSyncExternalStore } from 'react';

// ---------- audio graph ----------

let ctx: AudioContext | undefined;
let master: GainNode, musicBus: GainNode, sfxBus: GainNode, noise: AudioBuffer;
let muted = typeof window !== 'undefined' && localStorage.getItem('bz.muted') === '1';
const listeners = new Set<() => void>();

function audio() {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return undefined;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return undefined;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

// Browsers only allow sound after the person interacts with the page: unlock on the first tap or key.
if (typeof window !== 'undefined') {
  const unlock = () => { audio()?.resume().catch(() => {}); };
  for (const e of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(e, unlock, { capture: true, passive: true });
}

export function setMuted(m: boolean) {
  muted = m;
  localStorage.setItem('bz.muted', m ? '1' : '0');
  const c = audio();
  if (c) master.gain.setTargetAtTime(m ? 0 : 0.9, c.currentTime, 0.03);
  listeners.forEach(l => l());
}

export function useMuted() {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => listeners.delete(l); },
    () => muted,
    () => false,
  );
}

export function SoundToggle({ className = 'pill' }: { className?: string }) {
  const m = useMuted();
  return (
    <button type="button" className={`${className} sound-toggle`} onClick={() => setMuted(!m)}
      aria-label={m ? 'Turn sound on' : 'Turn sound off'} title={m ? 'Sound off' : 'Sound on'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
        {m ? <path d="m16 9 5 6m0-6-5 6" /> : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>}
      </svg>
    </button>
  );
}

// ---------- voices ----------

type ToneOpts = { type?: OscillatorType; vol?: number; attack?: number; filter?: number; glide?: number; bus?: AudioNode };

function tone(freq: number, t: number, dur: number, o: ToneOpts = {}) {
  const c = ctx!;
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t + dur);
  const attack = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.01));
  let out: AudioNode = osc;
  if (o.filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.filter; osc.connect(f); out = f; }
  out.connect(g).connect(o.bus ?? sfxBus);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function hiss(t: number, dur: number, o: { vol?: number; type?: BiquadFilterType; freq?: number; to?: number; bus?: AudioNode } = {}) {
  const c = ctx!;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = noise;
  f.type = o.type ?? 'highpass';
  f.frequency.setValueAtTime(o.freq ?? 6000, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  g.gain.setValueAtTime(o.vol ?? 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(o.bus ?? sfxBus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

const kick = (t: number, bus: AudioNode) => tone(150, t, 0.2, { vol: 0.9, glide: 40, bus });
const snare = (t: number, bus: AudioNode, vol = 0.3) => { hiss(t, 0.14, { vol, type: 'bandpass', freq: 1800, bus }); tone(190, t, 0.08, { type: 'triangle', vol: vol * 0.7, bus }); };
const hat = (t: number, bus: AudioNode) => hiss(t, 0.035, { vol: 0.1, freq: 7500, bus });

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n: string) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  if (!m) throw new Error(`Bad note ${n}`);
  return NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
}
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

// ---------- music ----------

/**
 * A looping track on a 16th-note grid. One chord per bar. Pattern strings have 16 steps per bar:
 * drums/stab 'x' = hit; bass 'x' = root, 'o' = fifth; arp digits pick chord notes (3+ = up an octave).
 * Melody is 8th notes, bars split by '|': a note name, '.' rest, '-' holds the previous note.
 */
interface Track {
  bpm: number; chords: string[]; bass: string; stab?: string; arp?: string; mel?: string;
  drums: { k: string; s: string; h: string }; lead?: OscillatorType;
}

const TRACKS = {
  // Easy, bouncy wait for players. F major.
  lobby: {
    bpm: 112,
    chords: ['F3 A3 C4', 'D3 F3 A3', 'Bb2 D3 F3', 'C3 E3 G3'],
    bass: 'x..x..x...x..x..', stab: '..x...x...x...x.',
    drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
    mel: 'A4 . C5 . D5 C5 A4 . | F4 - - . A4 . G4 . | F4 . G4 . A4 C5 D5 . | C5 - - - . . . . |' +
         'A4 . C5 . F5 E5 D5 . | C5 . A4 . D5 - C5 . | Bb4 . A4 . G4 . F4 . | G4 - - - E4 - . .',
  },
  // Driving A minor pulse while a question is open.
  question: {
    bpm: 136,
    chords: ['A2 C3 E3', 'F2 A2 C3', 'G2 B2 D3', 'E2 G#2 B2'],
    bass: 'x.x.x.x.x.x.x.o.', arp: '0123012301230123',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '.x.x.x.x.x.x.x.x' },
  },
  // Same groove, faster and busier, for the last five seconds.
  hurry: {
    bpm: 168,
    chords: ['A2 C3 E3', 'F2 A2 C3', 'G2 B2 D3', 'E2 G#2 B2'],
    bass: 'xxxxxxxxxxxxxxxx', arp: '0123321001233210',
    drums: { k: 'x...x...x...x...', s: '....x.......x.xx', h: 'xxxxxxxxxxxxxxxx' },
  },
  // Light C major strut for the scoreboard.
  scoreboard: {
    bpm: 104,
    chords: ['C3 E3 G3', 'B2 D3 G3', 'A2 C3 E3', 'F2 A2 C3'],
    bass: 'x...x...x...x.o.', stab: '..x...x...x...x.',
    drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    mel: 'E5 . D5 C5 . . G4 . | D5 . C5 B4 . . G4 . | C5 . B4 A4 . . E4 . | F4 . A4 C5 - - . .',
  },
  // Celebration in D major after the fanfare.
  podium: {
    bpm: 126,
    chords: ['D3 F#3 A3', 'G2 B2 D3', 'A2 C#3 E3', 'D3 F#3 A3'],
    bass: 'x.x.x.x.x.x.x.o.', stab: '..x...x...x...x.',
    drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
    mel: 'F#5 . A5 . F#5 . D5 . | G5 . B5 . A5 - - . | E5 . F#5 . G5 . A5 . | F#5 - D5 - . . . .',
  },
} satisfies Record<string, Track>;

export type TrackName = keyof typeof TRACKS;

let playing: { name: TrackName; timer: number; gain: GainNode } | null = null;

function startTrack(name: TrackName) {
  const c = audio();
  if (!c) return;
  const tr: Track = TRACKS[name];
  const sp = 60 / tr.bpm / 4; // seconds per 16th
  const chords = tr.chords.map(ch => ch.split(' ').map(midi));
  const mel = tr.mel?.split('|').map(b => b.trim().split(/\s+/)) ?? [];
  const loop = Math.max(chords.length, mel.length) * 16;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.25);
  gain.connect(musicBus);

  let step = 0, next = c.currentTime + 0.05;
  const play = (i: number, t: number) => {
    const bar = Math.floor(i / 16), s = i % 16;
    const chord = chords[bar % chords.length];
    if (tr.drums.k[s] === 'x') kick(t, gain);
    if (tr.drums.s[s] === 'x') snare(t, gain);
    if (tr.drums.h[s] === 'x') hat(t, gain);
    const b = tr.bass[s];
    if (b === 'x' || b === 'o') tone(hz(chord[0] - 12 + (b === 'o' ? 7 : 0)), t, sp * 1.8, { type: 'sawtooth', vol: 0.2, filter: 520, bus: gain });
    if (tr.stab?.[s] === 'x') chord.forEach(n => tone(hz(n + 12), t, sp * 1.6, { type: 'triangle', vol: 0.055, filter: 2600, bus: gain }));
    const a = tr.arp?.[s];
    if (a && a !== '.') {
      const k = Number(a);
      tone(hz(chord[k % chord.length] + 12 + (k >= chord.length ? 12 : 0)), t, sp * 0.9, { type: 'square', vol: 0.04, filter: 1900, bus: gain });
    }
    if (mel.length && s % 2 === 0) {
      const mb = mel[bar % mel.length], k = s / 2, tok = mb[k];
      if (tok && tok !== '.' && tok !== '-') {
        let len = 1;
        while (mb[k + len] === '-') len++;
        tone(hz(midi(tok)), t, sp * 2 * len * 0.95, { type: tr.lead ?? 'square', vol: 0.06, filter: 3200, attack: 0.01, bus: gain });
      }
    }
  };
  // Schedule a little ahead on a timer; skip ahead (rather than burst) if the tab was throttled.
  const timer = window.setInterval(() => {
    if (next < c.currentTime - 0.05) next = c.currentTime + 0.02;
    while (next < c.currentTime + 0.15) { play(step, next); next += sp; step = (step + 1) % loop; }
  }, 25);
  playing = { name, timer, gain };
}

export const Music = {
  /** Starts a loop (no-op if it's already playing). */
  play(name: TrackName) {
    if (playing?.name === name) return;
    Music.stop();
    startTrack(name);
  },
  stop() {
    if (!playing || !ctx) return;
    const { timer, gain } = playing;
    clearInterval(timer);
    gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.06);
    setTimeout(() => gain.disconnect(), 600);
    playing = null;
  },
};

// ---------- effects ----------

let rollBus: GainNode | undefined;

/** Runs fn with the current audio time, or does nothing if audio isn't available. */
const fx = (fn: (t: number) => void) => () => { const c = audio(); if (c) fn(c.currentTime + 0.01); };

export const Sound = {
  /** A player joined (host) / you're in (phone). */
  pop: fx(t => { tone(620, t, 0.09, { type: 'triangle', vol: 0.25, glide: 900 }); tone(930, t + 0.07, 0.12, { type: 'triangle', vol: 0.2, glide: 1300 }); }),
  /** Get-ready countdown beep (3, 2, 1). */
  count: fx(t => tone(660, t, 0.16, { type: 'square', vol: 0.12, filter: 2500 })),
  /** Answers open. */
  go: fx(t => { [784, 988, 1175].forEach(f => tone(f, t, 0.35, { type: 'square', vol: 0.07, filter: 3000 })); hiss(t, 0.3, { vol: 0.12, type: 'bandpass', freq: 800, to: 5000 }); }),
  /** Whoosh into a new question. */
  whoosh: fx(t => hiss(t, 0.5, { vol: 0.25, type: 'bandpass', freq: 300, to: 4000 })),
  /** Last-seconds clock tick. */
  tick: fx(t => tone(1250, t, 0.05, { type: 'triangle', vol: 0.18 })),
  /** You tapped an answer. */
  lock: fx(t => { tone(520, t, 0.07, { type: 'triangle', vol: 0.25 }); tone(780, t + 0.05, 0.1, { type: 'triangle', vol: 0.18 }); }),
  /** Question closes: gong-ish hit, then a bright rising chime. */
  reveal: fx(t => {
    tone(196, t, 0.9, { type: 'sawtooth', vol: 0.18, filter: 900, glide: 150 });
    hiss(t, 0.5, { vol: 0.15, type: 'lowpass', freq: 1500 });
    [523, 659, 784, 1047].forEach((f, i) => tone(f, t + 0.35 + i * 0.07, 0.3, { type: 'triangle', vol: 0.16 }));
  }),
  good: fx(t => { tone(660, t, 0.14, { type: 'triangle', vol: 0.22 }); tone(990, t + 0.1, 0.25, { type: 'triangle', vol: 0.2 }); tone(1320, t + 0.2, 0.3, { type: 'triangle', vol: 0.12 }); }),
  bad: fx(t => { tone(330, t, 0.18, { type: 'square', vol: 0.08, filter: 1200 }); tone(247, t + 0.16, 0.35, { type: 'square', vol: 0.08, filter: 1000 }); }),
  /** Snare roll that builds, then a cymbal-ish crash. ~1.5s. */
  drumroll: () => Sound.roll(1.36),
  /** A building snare roll of `secs` seconds that ends on a crash (the crash lands exactly at the end). */
  roll(secs: number) {
    const c = audio();
    if (!c) return;
    Sound.cutRoll();
    const bus = rollBus = c.createGain(); // its own gain, so a skip can silence notes already scheduled
    bus.connect(sfxBus);
    const t = c.currentTime + 0.01, n = Math.round(secs / 0.042);
    for (let i = 0; i < n; i++) snare(t + i * 0.042, bus, 0.03 + (i / n) ** 1.6 * 0.26);
    hiss(t + secs, 1.4, { vol: 0.32, freq: 5000, bus });
    tone(130.8, t + secs, 0.5, { vol: 0.6, glide: 45, bus });
  },
  /** Silences a drumroll in progress. */
  cutRoll() {
    if (!rollBus || !ctx) return;
    const bus = rollBus;
    bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
    setTimeout(() => bus.disconnect(), 400);
    rollBus = undefined;
  },
  /** Podium place revealed (3rd and 2nd): bright brass stab. */
  place: fx(t => {
    [523, 659, 784].forEach(f => { tone(f, t, 0.5, { type: 'sawtooth', vol: 0.06, filter: 2400, attack: 0.015 }); tone(f * 2, t, 0.35, { type: 'triangle', vol: 0.05 }); });
  }),
  /** Brassy fanfare for the podium. ~2.4s. */
  fanfare: fx(t => {
    const brass = (f: number, at: number, d: number, v = 0.09) => { tone(f, t + at, d, { type: 'sawtooth', vol: v, filter: 2200, attack: 0.02 }); tone(f * 1.003, t + at, d, { type: 'sawtooth', vol: v * 0.6, filter: 1800, attack: 0.02 }); };
    [[392, 0], [392, 0.12], [392, 0.24], [523, 0.36]].forEach(([f, at]) => brass(f, at, 0.14));
    brass(659, 0.6, 0.2); brass(587, 0.8, 0.2);
    [523, 659, 784, 1047].forEach(f => brass(f, 1.05, 1.3, 0.06));
    hiss(t + 1.05, 1.3, { vol: 0.25, freq: 5000 });
    kick(t + 1.05, sfxBus);
  }),
};
