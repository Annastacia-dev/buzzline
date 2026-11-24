import { GameError } from './game';

/** Wraps a POST handler: parses JSON, maps GameError to a status code. */
export function post(fn: (body: Record<string, unknown>, req: Request) => unknown) {
  return async (req: Request) => {
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      return Response.json((await fn(body, req)) ?? { ok: true });
    } catch (e) {
      const status = e instanceof GameError ? e.status : 500;
      if (status === 500) console.error(e);
      return Response.json({ error: e instanceof Error ? e.message : 'Server error' }, { status });
    }
  };
}
