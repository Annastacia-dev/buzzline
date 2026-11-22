// The end-of-game podium reveal: 3rd, then 2nd, then a longer drumroll for 1st.
// Host and phones both use this so a phone never shows its place before the big screen does.

export interface RevealStep { rank: number; rollAt: number; roll: number; at: number }

const INTRO = 1200;    // "and the winners are…" before the first drumroll
const ROLL = 1300;     // drumroll before 3rd and 2nd
const BIG_ROLL = 2600; // longer drumroll before 1st
const GAP = 1100;      // pause after each reveal

/** Reveal steps (ms from the start of the podium screen) for a game with `players` players. */
export function podiumTimeline(players: number) {
  const steps: RevealStep[] = [];
  let t = INTRO;
  for (const rank of [3, 2, 1]) {
    if (rank > players) continue;
    const roll = rank === 1 ? BIG_ROLL : ROLL;
    steps.push({ rank, rollAt: t, roll, at: t + roll });
    t += roll + GAP;
  }
  const done = steps.length ? steps[steps.length - 1].at : 0;
  return { steps, done };
}

/** When a player at `rank` should see their result. Off the podium: once 1st is revealed. */
export function revealAtFor(rank: number, players: number) {
  const { steps, done } = podiumTimeline(players);
  return steps.find(s => s.rank === rank)?.at ?? done;
}
