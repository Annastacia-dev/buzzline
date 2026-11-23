import { FAQ, FEATURES, SITE, SITE_URL } from '@/lib/site';

// /llms.txt (llmstxt.org): a plain summary for AI assistants and answer engines, built from the same facts as the site.
export function GET() {
  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} is a web app for running live quiz games, like a game show in the room or on a video call. A host puts the questions on a shared screen; every player answers on their own phone at the same time, and faster right answers score more.

## How it works

1. Build a quiz in the studio (${SITE_URL}/host): write questions, generate them with AI, or import a Kahoot-format spreadsheet.
2. Start the game: the host screen shows a 6-digit PIN and a QR code.
3. Players open ${SITE_URL}/join on their phones, enter the PIN and a nickname, and answer each question before the timer runs out.
4. A leaderboard follows every question and a podium crowns the winners at the end.

## Features

${FEATURES.map(f => `- ${f}`).join('\n')}

## Good for

- Classroom quizzes and revision
- Team socials, onboarding and remote team building
- Pub quizzes, trivia nights, parties and family games

## Pages

- [Home](${SITE_URL}/): what Buzzline is, how scoring works, FAQ
- [Host a quiz](${SITE_URL}/host): quiz studio and live host screen
- [Join a game](${SITE_URL}/join): players enter a game PIN here

## FAQ

${FAQ.map(f => `### ${f.q}\n\n${f.a}`).join('\n\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
