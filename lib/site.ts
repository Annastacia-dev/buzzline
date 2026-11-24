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
  'Three quiz themes (Classic, Doodlebug and Inkblot) that style the host screen, the join page and every player’s phone',
  'Picture questions, including grid reveal: the picture starts hidden behind tiles that clear as the timer runs',
  'Share a quiz with a link, and back up or restore all your quizzes as one file',
  'Question types: multiple choice, true or false, type the answer, put in order and polls',
  'Team mode with 2 to 4 teams, scored on each team’s average',
  'Challenge links: anyone plays a quiz alone on their phone, any time, against a shared leaderboard',
  'Ready-made quizzes with answers (Christmas, New Year, pub, office party and classroom), hosted in one click',
  'Sync link: the same quizzes on every device, with no account',
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
    q: 'Can I change how a quiz looks?',
    a: 'Yes. Pick a theme in the studio: Classic (bright pastel blocks), Doodlebug (blue ink on beige paper with handwriting and doodles) or Inkblot (black and white line art). The host screen, the join page and every player’s phone use it.',
  },
  {
    q: 'Can I add pictures to questions?',
    a: 'Yes. Add an image to any question and it shows big on the host screen. Turn on grid reveal to hide the picture behind tiles that clear one by one while the timer runs, for “what’s in the picture?” rounds. Images are checked to make sure they suit all ages.',
  },
  {
    q: 'Where are my quizzes saved?',
    a: 'Quizzes are saved in your browser, so there is nothing to sign up for. To use them on other devices, turn on sync in the studio: you get a private link (and QR code) that opens the same quizzes anywhere and keeps them up to date. You can also share a single quiz with a link or download a backup.',
  },
  {
    q: 'Can we play in teams?',
    a: 'Yes. Pick 2, 3 or 4 teams before you host. Players are put in the smallest team as they join, and each team scores the average of its players, so a small team can still win.',
  },
  {
    q: 'Can people play a quiz on their own time?',
    a: 'Yes. Make a challenge link in the studio and send it round. Everyone plays alone on their phone, whenever they like, against the clock, and sees where they rank on a shared leaderboard. Good for homework and remote friends.',
  },
  {
    q: 'What kinds of questions can I ask?',
    a: 'Multiple choice with 2 to 4 answers, true or false, type the answer (small typos are forgiven), put items in the right order, and polls with no right answer.',
  },
  {
    q: 'Are there ready-made quizzes?',
    a: 'Yes. Buzzline has free ready-made quizzes with answers, including Christmas movies, Christmas around the world, New Year’s Eve, pub general knowledge, office party icebreakers and classroom science and geography. Host any of them in one click.',
  },
  {
    q: 'Is Buzzline free?',
    a: 'Yes. Hosting and playing are free.',
  },
];
