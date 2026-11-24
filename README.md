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

Lobby → 10‑second countdown after Start game → 3‑second "get ready" → question with timer → answer reveal and chart → scoreboard → … → podium.

Players get a random avatar when they join and can pick another in the lobby. The big screen plays music
and sound effects for each stage (lobby, countdown, question, last five seconds, reveal, scoreboard, podium);
phones play short effects only. Both have a mute button. Everything is synthesized in `lib/sound.tsx`, no audio files.

**Auto** (top bar) moves from the answer reveal to the scoreboard to the next question by itself; the host picks how many
seconds each of those screens stays up (3 by default).

Scoring: a correct answer is worth 500–1000 points (faster is more), ×2 on double-points questions,
plus a streak bonus of +100 for each answer in a row (up to +500). A round ends early once everyone has answered.

**Sharing a result**: when the game ends, each phone offers **Share your win** (or **Share my result**), **Play again**
and a link to host a quiz of their own. Sharing uses the phone's share sheet, or copies the link where there isn't one.
The link, `/r/<code>`, carries the player's name, avatar, place, score, the quiz title and theme, signed with a key
derived from `SUPABASE_SECRET_KEY` (`lib/results.ts`). That means it needs no database table, keeps working after the
game is cleaned up, and an edited link just shows "not found". `/api/result` only signs a result for a real player of
a finished game. The page shows the result in the quiz's theme with a "make your own quiz" button. Its preview picture
in chats is drawn at `/r/<code>/card` (`lib/og-result.tsx`). Result pages are `noindex`.

## Question types, teams and challenges

**Question types** (the type picker on each question in **Edit quiz**, `lib/kinds.ts`):

- **Multiple choice** (2–4 answers; 2 makes it true or false), as before.
- **Type answer**: players type it. The host adds the answer plus other spellings that also count. The check ignores case,
  accents, punctuation and a leading "the/a/an", and forgives one typo (two in long words). Numbers must match exactly.
- **Put in order**: the host types 2–4 items in the right order. Every screen shows them in the same shuffled order
  (seeded by the PIN and question), and players tap them in order.
- **Poll**: no right answer and no points, and it doesn't break anyone's streak. The reveal shows the votes.

Typed answers and orders are checked by the server against the question they were given for, then stored as right (0) or
wrong (1). `buzz_answer()` only accepts that from the server, so a raw "choice 0" can't score a typed question. Phones
never see the accepted answers or the right order before the reveal.

**Team mode**: pick **Solo** or **2–4 teams** next to the theme before hosting. Players join the smallest team (Foxes, Owls,
Bees, Frogs; `lib/teams.ts`). A team scores the average of its players' scores, so a small team can win. The lobby shows
the teams, the scoreboard shows team standings above the players, the podium names the winning team, and each phone
shows its team and place.

**Challenge links** (**🏁 Challenge link** in the studio, `lib/challenge.ts`, `/c/<id>`): anyone plays the quiz alone on
their phone, whenever they like, against a shared leaderboard. The server keeps each player's clock, so answers are timed
and scored exactly like a live game. Nicknames are unique per challenge, and a reloaded page carries on where it left off.
Links last 30 days (`buzz_challenges`, `buzz_challenge_runs`).

## Ready-made quizzes

`/quiz` lists free quizzes with answers, and each has its own page at `/quiz/<slug>`: Christmas movies, Christmas around
the world, Christmas music, New Year's Eve, winter science, a pub quiz, food, 90s and 2000s, an office party quiz, capital
cities, science and animals (`lib/packs.ts`). Pages are static, carry `Quiz` JSON-LD and are in the sitemap.
**Host this quiz** opens `/host?pack=<slug>`, which adds the quiz to the studio once, in its suggested theme.
To add a quiz, add it to `PACKS`. Every question must pass the same checks as a hosted quiz.

## Sync link (quizzes on every device)

**☁️ Sync devices** in the studio sidebar makes a private link, `/host?sync=<secret>`, shown with a QR code. Every browser
that opens it shares one library, with no account or email. Each quiz carries the time it was last changed. Deletes are
kept for 120 days as tombstones. Browsers send their changes a moment after each edit and pick up others' changes when
the studio opens or the tab comes back into view. The newest copy of each quiz wins (`lib/sync.ts`). The server stores
the library under a SHA-256 of the secret (`buzz_sync_libraries`), so the table alone can't open anyone's quizzes.
Anyone with the link can change the quizzes, and the studio says so.

## Generate with AI

In the quiz studio, **✨ Generate with AI** asks for a topic, number of questions (up to 20), seconds per question
and difficulty. `app/api/generate` sends that to Claude (`claude-opus-5-5`, structured JSON output) in `lib/generate.ts`,
checks the result (2–4 unique answers, a valid correct index) and the new quiz opens in the editor for changes.

**🖼 Add a picture to every question** (or a 🖼 topic idea such as *Flags of the world*) makes it a picture round: Claude
writes each question about the picture ("Which country's flag is this?") without naming the answer, plus the words of a
Wikimedia Commons file name for it. `lib/pictures.ts` looks that up on Commons (exact file name first, then titles that
contain every key word, then a close match; a wrong picture is worse than none), and each picture goes through the same
all-ages check as an upload before it is stored in the `buzz-images` bucket. Questions without a usable picture are
dropped, so Claude writes a few spares. Commons files are free to use, but many photos ask for credit to their author.
Each server instance allows 10 generations per visitor per hour. Without `ANTHROPIC_API_KEY` the button shows a
"not set up" message and everything else works.

## Quiz themes

Pick a theme from the dropdown next to **Host this quiz** in the studio. The choice is remembered in the browser and
stays as you switch quizzes; the preview, the host screen and every player's phone use it. The join page takes on the
game's theme as soon as the PIN matches a game (including PINs that arrive in a link), and the landing page shows them
all side by side.

- **Classic** (default): cream paper, pastel blocks, black pills and stickers.
- **Doodlebug**: blue ink on beige paper, handwriting (Caveat Brush and Patrick Hand) and wobbly hand-drawn outlines,
  with doodle illustrations by a little bee mascot.
- **Inkblot**: black and white line art, Space Grotesk with Space Mono labels, solid ink accents, hatched fills and
  flat grey circles behind the illustrations, with a buzzer mascot.
- **Toybox**: soft pastel clay: puffy matte shapes in lavender, pink, mint and butter, lit from the top-left with soft
  tinted shadows, that squish when tapped. Rounded Fredoka font, with Classic's shapes as clay cut-outs.
- **Glass**: clear frosted glass floating over vivid, glowing bokeh: soft pools of orange, blue, magenta and teal
  with drifting circles of light, thin bright rims, white text in the device's own system font, pill-shaped answers
  with round glass badges and tinted glass buttons. Each phone moment swaps the colours (teal for correct, pink for
  wrong, gold for the podium). The QR card stays white so it scans.

Illustrations for the illustrated themes are in `lib/doodles.tsx`. Themes are listed in `lib/themes.ts`. Each is a `[data-theme=…]` block of CSS variables and overrides at the end of
`app/globals.css`, so a new theme is a new entry there plus its CSS.

## Sharing, backups and images

Quizzes are saved in the browser, so the studio has three ways to move them around:

- **🔗 Share** saves a copy of the quiz on the server (`buzz_shared_quizzes`) and gives a link,
  `/host?quiz=<id>`. Opening it adds the quiz to that browser's studio once; opening it again just selects it.
  Later edits aren't in the copy, so share again to send them.
- **⤓ Back up** downloads every quiz as one JSON file. **Restore a backup** (or Import) adds the quizzes from it,
  skipping ones that are already there.
- **Question images**: add a picture under any question (click or drop). The browser shrinks it to at most 1600 px
  WebP (a GIF becomes a still of its first frame), then `/api/image` checks the file's real type and size (1.2 MB),
  asks Claude Haiku whether it is suitable for all ages (`lib/moderate.ts`) and only then stores it in the public
  `buzz-images` Supabase Storage bucket. Nudity, sexual content, gore, hate symbols and the like are refused, and so
  is any upload the check can't complete, so image uploads need `ANTHROPIC_API_KEY` too.
- **🧩 Grid reveal**: tick it under a question's image and the picture starts hidden behind a 5 × 4 grid of tiles
  that clear one at a time, in a random order, while the timer runs. The last tile only goes when time is up, and the
  answer screen shows the whole picture. Good for "what's in the picture?" rounds (`lib/reveal.tsx`). The host screen shows it in place of the mascot. Quizzes only keep image URLs from that
  bucket, so a shared quiz can't pull in pictures from other sites.

Both API routes are rate-limited per IP (30 shares and 120 images an hour). The table and bucket are created by
`supabase/migrations/20261123000000_shared_quizzes_and_images.sql`.

## Brand, SEO and GEO

- **Brand assets** live in `public/brand/` (logo, white logo, logo + mark lockup, the "b." mark; SVG and PNG) and are
  built from the brand font by `pnpm brand` (`scripts/brand.mjs`), which also writes the favicon (`app/favicon.ico`,
  `app/icon.svg`), the Apple touch icon and the web app icons in `public/icons/`. Fonts are in `assets/fonts/` (SIL OFL).
- **Share images** are plain JPEG files in `public/share/` (`home`, `host`, `join`), since chat apps such as WhatsApp
  show those most reliably. They're drawn with `next/og` in `lib/og-cards.tsx` (served as PNG drafts at `/og/<name>`);
  after changing a drawing, run the app and `pnpm og` (or `pnpm og http://localhost:3030`) to save new JPEGs. Game
  links (`/join?pin=…`) are drawn on request by `app/join/card/route.ts` (`lib/og-join.tsx`) with the quiz's name and
  PIN in its theme's colours, with a matching title (and `noindex`).
- **Metadata**: titles, descriptions, canonical links and Open Graph / X cards in each segment's `layout.tsx`;
  `app/sitemap.ts`, `app/robots.ts` and `app/manifest.ts`. The in-game `/play` screen is `noindex`.
- **GEO** (answer engines like ChatGPT, Claude, Perplexity and Google AI Overviews): the landing page has a visible FAQ plus
  JSON-LD (`WebSite`, `WebApplication`, `FAQPage`), `/llms.txt` gives a plain-text summary, and `robots.txt` welcomes AI crawlers.
  All of it comes from one source, `lib/site.ts`, so the facts stay in step.
- Set `NEXT_PUBLIC_SITE_URL` if you add a custom domain; otherwise Vercel's production URL is used for canonical links.

## How it's built

- **Next.js App Router**. Pages: `app/page.tsx` (landing), `app/join`, `app/play` (phone), `app/host` (quiz studio + stage).
- **Game state** lives in Supabase (`buzz_games` and `buzz_players` tables, schema in `supabase/migrations/`; challenges, sync links and shared quizzes have their own `buzz_` tables).
  Route handlers use the secret key; browsers never touch the tables (RLS is on with no policies).
  Answers go through `buzz_answer()` and scoring through `buzz_end_question()`: database functions that lock
  the game row, so simultaneous answers can't double-score or miss ending the round.
- **Real-time** uses Supabase Realtime Broadcast: after each change the server pings channel `buzzline:game:<PIN>`,
  and each screen refetches its own view from `/api/view`. Question timers need no background job:
  the first read after the buzzer ends the question. This makes it safe on serverless hosts like Vercel.
- **Region**: `vercel.json` runs functions in Dublin (`dub1`), next to the Supabase project (eu-west-1).
  If your Supabase project is elsewhere, change it to the nearest Vercel region.
- **Quizzes** are saved in the host browser's localStorage. Each quiz opens in **Preview** (questions and answers, with the right
  answer hidden); **Edit quiz** shows the answers and lets the host add, edit, duplicate, delete and reorder questions
  (one question at a time, with a scrollable rail of all questions: drag in the rail or use the arrows). **Import spreadsheet** creates a quiz from a Kahoot-format `.xlsx`
  (header row Question, Answer 1–4, Time limit (seconds), Correct answer(s), with Kahoot's official template also accepted;
  read in the browser by `lib/spreadsheet.ts`). Rows it can't use are listed after the import.
  **Download spreadsheet template** under the button gives a ready `.xlsx` with those columns and four example questions
  (built in the browser by `lib/template.ts`); a filled-in template also imports into Kahoot.
