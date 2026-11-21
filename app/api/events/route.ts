import { subscribe } from '@/lib/game';

// Server-Sent Events: one long-lived stream per screen, pushing that screen's view on every change.
export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const enc = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let open = true;
      const raw = (s: string) => {
        if (open) try { controller.enqueue(enc.encode(s)); } catch { open = false; }
      };
      const send = (data: unknown) => raw(`data: ${JSON.stringify(data)}\n\n`);
      raw('retry: 1500\n\n');
      const unsub = subscribe(params, send);
      if (!unsub) { open = false; controller.close(); return; }
      const ping = setInterval(() => raw(': ping\n\n'), 20000);
      cleanup = () => {
        if (!open) return;
        open = false; clearInterval(ping); unsub();
        try { controller.close(); } catch {}
      };
      req.signal.addEventListener('abort', cleanup);
    },
    cancel() { cleanup(); },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
