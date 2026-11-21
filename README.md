# Buzzline

A live multiplayer quiz game. One big screen hosts; players join on their phones with a PIN.

## Run it

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

- **Next.js App Router**. Pages: `app/page.tsx` (join), `app/play` (phone), `app/host` (quiz studio + stage).
- **Real-time** uses Server-Sent Events from `app/api/events/route.ts`; actions are plain POST route handlers.
- **Game state** is in memory in `lib/game.ts`. That means it needs a single long-running Node process
  (`next dev` / `next start`, or a VPS/Render/Railway/Fly). It will **not** work on serverless hosts like Vercel
  without moving state to something shared (for example Redis pub/sub).
- **Quizzes** are saved in the host browser's localStorage. Use Export/Import JSON to move them between machines.
