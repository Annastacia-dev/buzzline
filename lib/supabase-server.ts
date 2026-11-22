// Server-only Supabase access. Uses the secret key, so never import this from a client component.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { after } from 'next/server';

let client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** What changed, so screens know whether to refetch. 'host' = only the host screen cares (e.g. answer counts). */
export type Ping = { to: 'all' | 'host'; players?: number };

/**
 * Tells every screen in a game that its view changed. Sent over REST, so it works from serverless functions.
 * Runs after the response is sent (next/server `after`), so the person who clicked isn't kept waiting for it.
 */
export async function notify(pin: string, ping: Ping) {
  try { after(() => send(pin, ping)); }
  catch { await send(pin, ping); } // outside a request (scripts): just send it now
}

async function send(pin: string, ping: Ping) {
  const channel = db().channel(`buzzline:game:${pin}`);
  try {
    const res = await channel.httpSend('update', ping);
    if (!res.success) console.error('Realtime broadcast failed', res.status, res.error);
  } catch (e) {
    console.error('Realtime broadcast failed', e);
  } finally {
    await db().removeChannel(channel);
  }
}
