# Buzzline

A live multiplayer quiz game. One big screen hosts; players join on their phones with a PIN.

## Run it

1. Create a Supabase project and run `supabase/migrations/*.sql` in its SQL editor (or `supabase db push`).
2. Copy `.env.example` to `.env.local` and fill in the three values. On Vercel, add the same three env vars.

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

Scoring: a correct answer is worth 500–1000 points (faster is more), ×2 on double-points questions,
plus a streak bonus of +100 for each answer in a row (up to +500). A round ends early once everyone has answered.

## How it's built

- **Next.js App Router**. Pages: `app/page.tsx` (landing), `app/join`, `app/play` (phone), `app/host` (quiz studio + stage).
- **Game state** lives in Supabase (`buzz_games` and `buzz_players` tables, schema in `supabase/migrations/`).
  Route handlers use the secret key; browsers never touch the tables (RLS is on with no policies).
  Scoring runs in the `buzz_end_question()` database function so concurrent requests can't double-score.
- **Real-time** uses Supabase Realtime Broadcast: after each change the server pings channel `buzzline:game:<PIN>`,
  and each screen refetches its own view from `/api/view`. Question timers need no background job:
  the first read after the buzzer ends the question. This makes it safe on serverless hosts like Vercel.
- **Quizzes** are saved in the host browser's localStorage. Use Export/Import JSON to move them between machines.
