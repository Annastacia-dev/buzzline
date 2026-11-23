// One place for what Buzzline is: used by page metadata, structured data (JSON-LD), the FAQ and /llms.txt.

/** Canonical origin. Set NEXT_PUBLIC_SITE_URL for a custom domain; Vercel's production URL is the fallback. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
).replace(/\/$/, '');

export const SITE = {
  name: 'Buzzline',
  title: 'Buzzline: free live multiplayer quiz game',
  tagline: 'Quiz night, just for your crowd.',
  description:
    'Host a live quiz on the big screen while everyone answers from their phones. Free, with no app or accounts: share a 6-digit PIN, race the clock and climb the leaderboard.',
  keywords: [
    'live quiz game', 'multiplayer quiz', 'quiz maker', 'trivia night', 'pub quiz', 'classroom quiz',
    'Kahoot alternative', 'AI quiz generator', 'team building game', 'free quiz app', 'quiz with game PIN',
  ],
};

export const FEATURES = [
  'Live hosting: questions on a shared screen, answers from any phone browser',
  'Join with a 6-digit game PIN or QR code and a nickname: no app, no account',
  'Speed scoring (500 to 1,000 points per right answer), streak bonuses up to +500 and 2× double-points questions',
  'Up to 200 players per game',
  'Live answer chart, leaderboard after each question and a podium at the end',
  'AI quiz generator: type a topic and get up to 20 questions',
  'Import Kahoot-format spreadsheets (.xlsx) and download a ready-made template',
  'Auto mode that moves through the game on a timer',
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is Buzzline?',
    a: 'Buzzline is a free live multiplayer quiz game for the web. The host shows questions on a big screen (a TV, projector or shared video call), and players answer at the same time from their own phones. Quicker right answers score more points, and a leaderboard after every question keeps the room competitive.',
  },
  {
    q: 'Do players need to download an app or create an account?',
    a: 'No. Players open the join page in any phone browser, type the 6-digit game PIN (or scan the QR code on the host screen) and pick a nickname. Hosts don’t need an account either.',
  },
  {
    q: 'How many people can play at once?',
    a: 'Up to 200 players can join a single game.',
  },
  {
    q: 'How does scoring work?',
    a: 'Each right answer is worth 500 to 1,000 points depending on how fast it was given. Answering several in a row adds a streak bonus of +100 per answer, up to +500. Questions marked as double points score 2×.',
  },
  {
    q: 'Can I make a quiz with AI?',
    a: 'Yes. In the quiz studio choose “Generate with AI”, enter a topic and pick how many questions (up to 20), the seconds per question and the difficulty. The quiz is ready in under a minute, and you can edit every question before hosting.',
  },
  {
    q: 'Can I import quizzes from Kahoot or a spreadsheet?',
    a: 'Yes. Buzzline imports Kahoot-format .xlsx spreadsheets with the columns Question, Answer 1–4, Time limit and Correct answer. You can download a ready-made template from the studio.',
  },
  {
    q: 'Where are my quizzes saved?',
    a: 'Quizzes are saved in your browser on the device you made them on, so there is nothing to sign up for. Use the same browser to find them again.',
  },
  {
    q: 'Is Buzzline free?',
    a: 'Yes. Hosting and playing are free.',
  },
];
