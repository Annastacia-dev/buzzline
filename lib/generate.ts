// AI quiz generation with Claude. Server only: needs ANTHROPIC_API_KEY.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { GameError, validateQuiz } from './game';
import type { Quiz } from './types';

export const TIMES = [5, 10, 15, 20, 30, 45, 60, 90];
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'] as const;
export const MAX_QUESTIONS = 20;
const MAX_TOPIC = 200;

const QuizSchema = z.object({
  title: z.string().describe('Short, catchy quiz title'),
  questions: z.array(z.object({
    q: z.string().describe('The question, at most 120 characters'),
    answers: z.array(z.string()).describe('2 to 4 answer options, each at most 60 characters'),
    correct: z.number().int().describe('Index of the correct answer in answers'),
  })),
});

const SYSTEM = `You write questions for Buzzline, a live multiplayer quiz game played on a big screen with players answering on their phones.
Write questions that are factually accurate and unambiguous, with exactly one correct answer.
Keep questions short enough to read in a few seconds (at most 120 characters) and answers short enough to fit on a phone button (at most 60 characters).
Use 4 answer options normally; use 2 only for true/false questions, with answers "True" and "False".
Wrong answers should be plausible but clearly wrong to someone who knows the topic.
Vary the position of the correct answer and cover different aspects of the topic. Do not repeat questions.
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
  const difficulty = DIFFICULTIES.includes(body.difficulty as never) ? (body.difficulty as string) : 'mixed';
  if (topic.length < 2) throw new GameError('Enter a topic', 400);
  if (topic.length > MAX_TOPIC) throw new GameError(`Keep the topic under ${MAX_TOPIC} characters`, 400);
  if (!Number.isInteger(count) || count < 1 || count > MAX_QUESTIONS) throw new GameError(`Choose 1–${MAX_QUESTIONS} questions`, 400);
  if (!TIMES.includes(time)) throw new GameError('Choose a valid time per question', 400);
  rateLimit(ip);

  client ??= new Anthropic();
  let res;
  try {
    res = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low', format: betaZodOutputFormat(QuizSchema) },
      // If the main model declines, the API retries on a fallback model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Write exactly ${count} ${difficulty === 'mixed' ? 'questions of mixed difficulty (easy to hard)' : `${difficulty} questions`} about this topic:\n<topic>${topic}</topic>\nPlayers get ${time} seconds per question, so make them answerable in that time.`,
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

  // Clean up: trim, clip lengths, keep 2–4 unique answers with a valid correct index.
  const clip = (s: string, n: number) => s.replace(/\s+/g, ' ').trim().slice(0, n);
  const questions = out.questions.flatMap(q => {
    const answers = q.answers.map(a => clip(a, 80)).slice(0, 4);
    if (!clip(q.q, 200) || answers.length < 2 || answers.some(a => !a) || new Set(answers).size !== answers.length) return [];
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= answers.length) return [];
    return [{ q: clip(q.q, 200), answers, correct: q.correct, time }];
  }).slice(0, count);

  const quiz: Quiz = { title: clip(out.title, 80) || topic.slice(0, 80), questions };
  const err = validateQuiz(quiz);
  if (err) throw new GameError('The AI made an incomplete quiz — try again', 502);
  return quiz;
}
