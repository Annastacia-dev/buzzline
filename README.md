# Buzzline

A live multiplayer quiz game. One big screen hosts; players join on their phones with a PIN.

## Run it

1. Create a Supabase project and run `supabase/migrations/*.sql` in its SQL editor (or `supabase db push`).
2. Copy `.env.example` to `.env.local` and fill in the three values. On Vercel, add the same three env vars.
3. Optional, for **Generate with AI**: add `ANTHROPIC_API_KEY` (a Claude API key) to `.env.local` and to Vercel.

This project uses [pnpm](https://pnpm.io) (pinned in `package.json`). If you don't have it: `corepack enable`.

```bash
pnpm install
pnpm dev           # or: pnpm build && pnpm start
```

- Host screen: http://localhost:3000/host. Pick or write a quiz, then click **Host this quiz**.
- Players: open the address shown in the lobby (your computer's Wi-Fi IP, port 3000) and enter the PIN.
  On Windows you may need to allow Node through the firewall the first time.

## How it plays

Lobby → 3‑second "get ready" → question with timer → answer reveal and chart → scoreboard → … → podium.

Players get a random avatar when they join and can pick another in the lobby. The big screen plays music
and sound effects for each stage (lobby, countdown, question, last five seconds, reveal, scoreboard, podium);
phones play short effects only. Both have a mute button. Everything is synthesized in `lib/sound.tsx`, no audio files.

Scoring: a correct answer is worth 500–1000 points (faster is more), ×2 on double-points questions,
plus a streak bonus of +100 for each answer in a row (up to +500). A round ends early once everyone has answered.

## Generate with AI

In the quiz studio, **✨ Generate with AI** asks for a topic, number of questions (up to 20), seconds per question
and difficulty. `app/api/generate` sends that to Claude (`claude-opus-5-5`, structured JSON output) in `lib/generate.ts`,
checks the result (2–4 unique answers, a valid correct index) and the new quiz opens in the editor for changes.
Each server instance allows 10 generations per visitor per hour. Without `ANTHROPIC_API_KEY` the button shows a
"not set up" message and everything else works.

## How it's built

- **Next.js App Router**. Pages: `app/page.tsx` (landing), `app/join`, `app/play` (phone), `app/host` (quiz studio + stage).
- **Game state** lives in Supabase (`buzz_games` and `buzz_players` tables, schema in `supabase/migrations/`).
  Route handlers use the secret key; browsers never touch the tables (RLS is on with no policies).
  Answers go through `buzz_answer()` and scoring through `buzz_end_question()`: database functions that lock
  the game row, so simultaneous answers can't double-score or miss ending the round.
- **Real-time** uses Supabase Realtime Broadcast: after each change the server pings channel `buzzline:game:<PIN>`,
  and each screen refetches its own view from `/api/view`. Question timers need no background job:
  the first read after the buzzer ends the question. This makes it safe on serverless hosts like Vercel.
- **Region**: `vercel.json` runs functions in Dublin (`dub1`), next to the Supabase project (eu-west-1).
  If your Supabase project is elsewhere, change it to the nearest Vercel region.
- **Quizzes** are saved in the host browser's localStorage. Use Export/Import JSON to move them between machines.
