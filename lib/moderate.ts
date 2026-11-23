// Checks question images before they are stored. Server only: needs ANTHROPIC_API_KEY.
// Fails closed: if the check can't run or Claude declines to look, the image is not stored.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { GameError } from './game';

const Verdict = z.object({
  safe: z.boolean().describe('true only if the image is fine to show to a general audience, including children'),
  reason: z.string().describe('A few words on what was found, for the server log'),
});

const SYSTEM = `You check pictures uploaded to Buzzline, a quiz game shown on big screens in classrooms, offices and family events.
Decide whether the picture is fine to show to a general audience that includes children.
Not fine: nudity or partial nudity, sexual or suggestive content, graphic violence, gore or injury, self-harm, drug use,
hate symbols or slurs, and anything shocking or disturbing. Text in the picture counts too.
Fine: ordinary photos, art, maps, diagrams, logos, screenshots, people in everyday clothing, swimwear at a beach or pool,
classical art and museum pieces that are not sexual, and cartoon violence suitable for children.
When unsure, answer not fine.`;

let client: Anthropic | null = null;

/** Throws a GameError unless Claude judges the image suitable for a general audience. */
export async function checkImage(bytes: Uint8Array, type: 'image/jpeg' | 'image/png' | 'image/webp') {
  if (!process.env.ANTHROPIC_API_KEY) throw new GameError('Image uploads are not set up on this server', 503);
  client ??= new Anthropic();
  let res;
  try {
    res = await client.beta.messages.parse({
      model: 'claude-haiku-5-5',
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: betaZodOutputFormat(Verdict) },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: type, data: Buffer.from(bytes).toString('base64') } },
          { type: 'text', text: 'Is this picture fine for a general audience?' },
        ],
      }],
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error('moderate', e.status, e.message);
      throw new GameError("Couldn't check that image right now — try again in a minute", 503);
    }
    throw e;
  }
  const v = res.stop_reason === 'refusal' ? { safe: false, reason: 'refused' } : res.parsed_output;
  if (!v) throw new GameError("Couldn't check that image right now — try again", 502);
  if (!v.safe) {
    console.warn('moderate: rejected image:', v.reason);
    throw new GameError("That image can't be used: pictures must be suitable for all ages", 422);
  }
}
