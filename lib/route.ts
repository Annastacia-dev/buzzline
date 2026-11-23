import { GameError } from './game';

/** The caller's IP, for rate limits. */
export const ipOf = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';

/** Runs a route body and turns errors into JSON with a status (GameError's, else 500). */
export async function respond(fn: () => Promise<unknown>, headers?: HeadersInit) {
  try {
    return Response.json(await fn(), { headers });
  } catch (e) {
    const status = e instanceof GameError ? e.status : 500;
    if (status === 500) console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : 'Server error' }, { status });
  }
}
