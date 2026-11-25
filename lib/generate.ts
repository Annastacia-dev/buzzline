// AI quiz generation with Claude. Server only: needs ANTHROPIC_API_KEY.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { GameError, validateQuiz } from './game';
import { AI_KINDS, PICTURE_KINDS, kindError, normalize, pictureShare, type AiKind } from './kinds';
import { storeImage } from './library';
import { findPicture } from './pictures';
import type { Question, QuestionKind, Quiz } from './types';

export const TIMES = [5, 10, 15, 20, 30, 45, 60, 90];
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'] as const;
export const MAX_QUESTIONS = 20;
/** Which questions get a picture: none, a share of them (mixed), or all. */
export type PictureMode = 'none' | 'some' | 'all';
const MAX_TOPIC = 200;

/** What Claude returns: each question names its type, and with pictures also the picture to show ("" for none). */
function quizSchema(kinds: AiKind[], pictures: boolean) {
  const question = z.object({
    kind: z.enum(kinds as [AiKind, ...AiKind[]]).describe('The question type'),
    q: z.string().describe('The question, at most 120 characters. With a picture, it refers to it without naming the answer'),
    answers: z.array(z.string()).describe('Each at most 60 characters. choice: 4 options. truefalse: "True", "False". type: the answer, then other accepted spellings. order: 3 or 4 items in the right order.'),
    correct: z.number().int().describe('choice and truefalse: index of the correct answer in answers. Other types: 0'),
  });
  return z.object({
    title: z.string().describe('Short, catchy quiz title'),
    questions: z.array(pictures ? question.extend({
      picture: z.string().describe('A precise Wikimedia Commons search for the one picture to show, e.g. "Flag of Japan". Empty for a question without a picture'),
    }) : question),
  });
}

// How to write each type; only the ones asked for are sent.
const KIND_RULES: Record<AiKind, string> = {
  choice: 'choice: 4 options with exactly one correct. Wrong options should be plausible. Vary the position of the correct one.',
  truefalse: 'truefalse: a statement that is clearly true or clearly false. Answers are exactly "True" and "False". Use a balance of both.',
  type: `type: players type the answer on a phone, so it must be one short, unambiguous answer (a name, word or number of 1 to 3 words). Put it first in answers,
then up to 3 other names or spellings that are equally right. Never list a wrong answer, and never hint at the answer in the question.`,
  order: `order: 3 or 4 short items (1 to 4 words) listed in the right order, which players see shuffled. The question must say what to order by and which end
comes first, for example "Put these in order, oldest first". The order must be a clear fact with no ties, and the items must not give it away (no dates or numbers in them).`,
};

// "hard" alone gets textbook questions: say who should be able to answer.
const LEVELS: Record<(typeof DIFFICULTIES)[number], string> = {
  easy: 'Difficulty: easy. Someone with only a casual interest in the topic should get about 8 in 10 right. Ask about its most famous facts.',
  medium: 'Difficulty: medium. A casual fan should get about half right. Go past the first facts everyone knows, but stay out of specialist detail.',
  hard: `Difficulty: hard. A keen fan should get about half right, and a casual player only about 1 in 4.
Never ask the facts people first learn about the topic, the ones in the opening paragraph of an encyclopedia article, or anything most adults know.
Ask about specifics: lesser-known people, works, events, causes, exceptions, records, and how things connect. Before keeping a question, ask
whether someone who only knows the topic by name could answer it; if so, replace it.
Wrong options must be close: the same kind, period and fame as the right one, so they can't be ruled out by common sense. False statements must be believable.
Hard means deeper knowledge, not trick wording, arbitrary exact numbers or disputed facts. Only use facts you are sure of.`,
  mixed: `Difficulty: mixed. About a third easy (most players know it), a third medium (a casual fan gets about half) and a third hard
(only a keen fan knows it, with close wrong options and nothing from the topic's best-known facts). Start easy and build up.`,
};
// Multiple choice is the backbone of a mixed quiz.
const WEIGHT: Record<AiKind, number> = { choice: 2, truefalse: 1, type: 1, order: 1 };

/** Shares n questions out between kinds by weight, giving each kind at least one while there are enough. */
function share(n: number, kinds: AiKind[]): Map<AiKind, number> {
  const out = new Map(kinds.map(k => [k, 0]));
  for (let i = 0; i < n; i++) {
    const next = kinds.reduce((a, b) => (out.get(b)! / WEIGHT[b] < out.get(a)! / WEIGHT[a] ? b : a));
    out.set(next, out.get(next)! + 1);
  }
  return out;
}
const spell = (m: Map<AiKind, number>) => [...m].filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ');

/** Takes n questions with the wanted share of each kind, then whatever is left, keeping their order. */
function pick<T extends { ai: AiKind }>(list: T[], n: number, kinds: AiKind[]): T[] {
  const left = share(n, kinds), chosen = new Set<T>();
  for (const x of list) if ((left.get(x.ai) ?? 0) > 0) { chosen.add(x); left.set(x.ai, left.get(x.ai)! - 1); }
  for (const x of list) if (chosen.size < n) chosen.add(x);
  return list.filter(x => chosen.has(x));
}

const PICTURES = `A picture question is shown with a picture, and players answer by looking at it.
Write it about the picture, for example "Which country's flag is this?", "Which landmark is this?" or "Who painted this?".
Never name, spell out or describe the answer in the question text: the picture gives the clue.
For each picture question, give "picture": the words a Wikimedia Commons file name for that one picture would contain, in English.
Keep it to the subject's common name, plus at most one disambiguating word. Flags are always "Flag of <country>" (for example "Flag of Japan");
otherwise for example "Eiffel Tower", "Mona Lisa", "Red panda", "Taj Mahal". Pick subjects with clear, well-known pictures there.`;
// Extra questions to ask for, so a few with no usable picture can be dropped.
const PICTURE_SPARES = 4;
// In a mixed quiz, spare plain questions that fill in for pictures that can't be found.
const PLAIN_SPARES = 2;

/** Spreads `some` evenly through `rest`, keeping each list's own order. */
function spread<T>(some: T[], rest: T[]): T[] {
  const at = (i: number, n: number) => (i + 0.5) / n;
  return [...some.map((x, i) => ({ x, k: at(i, some.length) })), ...rest.map((x, i) => ({ x, k: at(i, rest.length) }))]
    .sort((a, b) => a.k - b.k).map(e => e.x);
}

const SYSTEM = `You write questions for Buzzline, a live multiplayer quiz game played on a big screen with players answering on their phones.
Write questions that are factually accurate and unambiguous, with exactly one correct answer.
Keep questions short enough to read in a few seconds (at most 120 characters) and answers short enough to fit on a phone button (at most 60 characters).
Cover different aspects of the topic. Do not repeat questions, and don't let one question give away another's answer. Mix the question types through the quiz.
If the topic is unsafe or inappropriate for a general audience, write a general-knowledge quiz instead.`;

// A small per-instance limit so one visitor can't run up the bill. Resets every hour.
const LIMIT = 10, WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, { n: number; since: number }>();
function rateLimit(key: string) {
  const now = Date.now(), h = hits.get(key);
  if (!h || now - h.since > WINDOW_MS) { hits.set(key, { n: 1, since: now }); return; }
  if (++h.n > LIMIT) throw new GameError('Too many quizzes generated — try again in a while', 429);
}

let client: Anthropic | null = null;

export async function generateQuiz(body: Record<string, unknown>, ip: string): Promise<Quiz> {
  if (!process.env.ANTHROPIC_API_KEY) throw new GameError('AI generation is not set up on this server (missing ANTHROPIC_API_KEY)', 503);

  const topic = String(body.topic ?? '').replace(/\s+/g, ' ').trim();
  const count = Number(body.count);
  const time = Number(body.time);
  const difficulty = DIFFICULTIES.find(d => d === body.difficulty) ?? 'mixed';
  // `true` is what studios opened before mixed pictures existed still send.
  const mode: PictureMode = body.pictures === true || body.pictures === 'all' ? 'all' : body.pictures === 'some' ? 'some' : 'none';
  const pictures = mode !== 'none';
  const asked = Number(body.picturePercent);
  const percent = asked >= 1 && asked <= 99 ? asked : 50;
  const wanted = mode === 'all' ? count : mode === 'some' ? pictureShare(count, percent) : 0; // questions with a picture
  const askPictures = pictures ? wanted + PICTURE_SPARES : 0;
  const askPlain = mode === 'some' ? count - wanted + PLAIN_SPARES : count - wanted;
  const ask = askPictures + askPlain;
  // Studios opened before types could be picked send none: they get what they always got.
  const sent: unknown[] = Array.isArray(body.kinds) ? body.kinds : ['choice', 'truefalse'];
  const chosen = AI_KINDS.map(k => k.id).filter(k => sent.includes(k));
  const pictureKinds = chosen.filter(k => PICTURE_KINDS.includes(k));
  const kinds = mode === 'all' ? pictureKinds : chosen;
  if (topic.length < 2) throw new GameError('Enter a topic', 400);
  if (topic.length > MAX_TOPIC) throw new GameError(`Keep the topic under ${MAX_TOPIC} characters`, 400);
  if (!Number.isInteger(count) || count < 1 || count > MAX_QUESTIONS) throw new GameError(`Choose 1–${MAX_QUESTIONS} questions`, 400);
  if (!TIMES.includes(time)) throw new GameError('Choose a valid time per question', 400);
  if (!chosen.length) throw new GameError('Choose at least one question type', 400);
  if (pictures && !pictureKinds.length) throw new GameError('Picture questions need multiple choice, true or false, or type answer', 400);
  rateLimit(ip);

  const mix = mode === 'all' ? `Every question is a picture question. Types: ${spell(share(ask, kinds))}.`
    : mode === 'some' ? `Make ${askPictures} of them picture questions (types: ${spell(share(askPictures, pictureKinds))}).
The other ${askPlain} have no picture (types: ${spell(share(askPlain, kinds))}): give them an empty "picture" and write them to make sense without one.`
    : `Types: ${spell(share(ask, kinds))}.`;
  const rules = `Question types:\n${kinds.map(k => `- ${KIND_RULES[k]}`).join('\n')}`;

  client ??= new Anthropic();
  let res;
  try {
    res = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: difficulty === 'hard' ? 'medium' : 'low', format: betaZodOutputFormat(quizSchema(kinds, pictures)) },
      // If the main model declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [SYSTEM, rules, LEVELS[difficulty], ...(pictures ? [PICTURES] : [])].join('\n\n'),
      messages: [{
        role: 'user',
        content: `Write exactly ${ask} questions about this topic:\n<topic>${topic}</topic>\nPlayers get ${time} seconds per question, so keep them quick to read.\n${mix}`,
      }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new GameError('The AI is busy right now — try again in a minute', 429);
    if (e instanceof Anthropic.AuthenticationError) throw new GameError('AI generation is misconfigured (bad API key)', 503);
    if (e instanceof Anthropic.APIError) { console.error('generate', e.status, e.message); throw new GameError('The AI could not make that quiz — try again', 502); }
    throw e;
  }
  if (res.stop_reason === 'refusal') throw new GameError('The AI declined that topic — try a different one', 422);
  const out = res.parsed_output;
  if (!out) throw new GameError('The AI returned something unexpected — try again', 502);

  // Clean up: trim, clip lengths, and drop any question that doesn't work for its type.
  const clip = (s: string, n: number) => s.replace(/\s+/g, ' ').trim().slice(0, n);
  const candidates = (out.questions as { kind: AiKind; q: string; answers: string[]; correct: number; picture?: string }[]).flatMap(x => {
    const ai = x.kind, choices = ai === 'choice' || ai === 'truefalse';
    let answers = x.answers.map(a => clip(a, 80));
    let correct = choices ? x.correct : 0;
    if (ai === 'truefalse') {
      const right = answers[correct]?.toLowerCase();
      if (right !== 'true' && right !== 'false') return [];
      answers = ['True', 'False'];
      correct = right === 'true' ? 0 : 1;
    }
    // Other spellings the checker already treats as the same add nothing.
    if (ai === 'type') answers = answers.filter((a, i) => normalize(a) && answers.findIndex(b => normalize(b) === normalize(a)) === i);
    // Extra spellings or wrong options can go, but cutting an order short would change the question.
    if (ai === 'order' && (answers.length < 3 || answers.length > 4)) return [];
    answers = answers.slice(0, 4);
    if (new Set(answers).size !== answers.length) return [];
    const kind: QuestionKind = ai === 'truefalse' ? 'choice' : ai;
    const question: Question = { q: clip(x.q, 200), answers, correct, time, ...(kind !== 'choice' ? { kind } : {}) };
    if (!question.q || kindError(question, 1)) return [];
    const picture = PICTURE_KINDS.includes(ai) ? clip(x.picture ?? '', 120) : '';
    return [{ ai, question, picture }];
  });

  let questions: Question[];
  if (pictures) {
    // Find, check and store every picture at once; questions whose picture can't be found or isn't suitable are dropped.
    const found = await Promise.all(candidates.filter(c => mode === 'all' || c.picture).map(async ({ picture, ai, question }) => {
      try {
        const bytes = picture ? await findPicture(picture) : null;
        return bytes ? { ai, question: { ...question, image: await storeImage(bytes) } } : null;
      } catch (e) {
        console.error('generate picture', picture, e instanceof Error ? e.message : e);
        return null;
      }
    }));
    const shown = found.filter(q => q !== null);
    if (!shown.length) throw new GameError('Could not find pictures for that topic — try a more visual one, or choose no pictures', 502);
    // Mixed: pictures up to their share, plain ones for the rest; if plain ones run short, spare pictures fill in.
    const plain = mode === 'some' ? candidates.filter(c => !c.picture) : [];
    const keepPlain = pick(plain, count - Math.min(wanted, shown.length), kinds);
    const keepShown = pick(shown, count - keepPlain.length, pictureKinds);
    questions = spread(keepShown.map(x => x.question), keepPlain.map(x => x.question));
  } else {
    questions = candidates.map(c => c.question).slice(0, count);
  }

  const quiz: Quiz = { title: clip(out.title, 80) || topic.slice(0, 80), questions };
  const err = validateQuiz(quiz);
  if (err) throw new GameError('The AI made an incomplete quiz — try again', 502);
  return quiz;
}
