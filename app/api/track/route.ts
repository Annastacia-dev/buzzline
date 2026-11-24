import { track } from '@/lib/track';
import { SITE_URL } from '@/lib/site';

// POST /api/track: the browser's side of usage counting (see lib/track.ts).
//   { kind: 'visit', path, ref? }        a page view
//   { kind: 'quiz_created', source }     a quiz made in the studio (blank, ai, import, sample, shared, pack)
// Sent with navigator.sendBeacon. Always answers 204, so nothing on the page waits on it or reports errors.

const SOURCES = new Set(['blank', 'ai', 'import', 'sample', 'shared', 'pack']);
const ok = () => new Response(null, { status: 204 });

/** Collapses links that carry an id, so the dashboard shows "/r/[code]" once instead of every result link. */
function cleanPath(p: unknown) {
  const path = String(p ?? '').split(/[?#]/)[0].slice(0, 120) || '/';
  if (!path.startsWith('/')) return null;
  return path.replace(/^\/r\/[^/]+/, '/r/[code]').replace(/^\/c\/[^/]+/, '/c/[id]');
}

/** The referring site's host, or null for direct visits and links within Buzzline. */
function cleanRef(r: unknown) {
  try {
    const host = new URL(String(r)).hostname.replace(/^www\./, '');
    const own = new URL(SITE_URL).hostname.replace(/^www\./, '');
    return host && host !== own && host !== 'localhost' && host !== '127.0.0.1' ? host.slice(0, 80) : null;
  } catch { return null; }
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.kind === 'visit') {
    const path = cleanPath(b.path);
    if (path && !path.startsWith('/admin')) track('visit', req, { path, ref: cleanRef(b.ref) ?? undefined });
  } else if (b.kind === 'quiz_created') {
    const source = SOURCES.has(String(b.source)) ? String(b.source) : 'blank';
    track('quiz_created', req, { meta: { source } });
  }
  return ok();
}
