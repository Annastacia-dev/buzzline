// Admin sign-in for /admin. Server-only.
//
// "Sign in with Google" (Google Identity Services) gives the page an ID token; the server checks it with Google,
// checks the address is in ADMIN_EMAILS, and sets a signed, httpOnly session cookie for 7 days.
// Env:
//   NEXT_PUBLIC_GOOGLE_CLIENT_ID  the OAuth client ID (a "Web application" client in Google Cloud)
//   ADMIN_EMAILS                  comma-separated addresses allowed in
//   ADMIN_SESSION_SECRET          optional; signs the cookie (falls back to a key derived from SUPABASE_SECRET_KEY)
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { GameError } from './game';

export const ADMIN_COOKIE = 'bz_admin';
const DAYS = 7;

const admins = () => (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
export const isAdminEmail = (email: string) => admins().includes(email.trim().toLowerCase());

function key() {
  const own = process.env.ADMIN_SESSION_SECRET;
  if (own) return crypto.createHash('sha256').update(own).digest();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new GameError('Admin sign-in is not set up on this server', 503);
  return crypto.createHmac('sha256', secret).update('buzzline:admin-session:v1').digest();
}
const sign = (data: string) => crypto.createHmac('sha256', key()).update(data).digest('base64url');

/** A session cookie value for an address: base64url(email|expiry).signature */
export function sessionFor(email: string, now = Date.now()) {
  const data = Buffer.from(`${email.toLowerCase()}|${now + DAYS * 86400e3}`).toString('base64url');
  return { value: `${data}.${sign(data)}`, maxAge: DAYS * 86400 };
}

function readSession(value: string | undefined): string | null {
  if (!value) return null;
  const [data, sig] = value.split('.');
  if (!data || !sig) return null;
  const want = Buffer.from(sign(data)), got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  const [email, exp] = Buffer.from(data, 'base64url').toString().split('|');
  if (!email || !(Number(exp) > Date.now())) return null;
  return isAdminEmail(email) ? email : null; // removing an address from ADMIN_EMAILS signs it out
}

/** The signed-in admin's address, or null. */
export async function currentAdmin() {
  return readSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin() {
  const email = await currentAdmin();
  if (!email) throw new GameError('Sign in as an admin', 401);
  return email;
}

/** Checks a Google ID token with Google and returns its verified address, if it is an admin's. */
export async function verifyGoogle(credential: unknown): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new GameError('Google sign-in is not set up on this server', 503);
  if (typeof credential !== 'string' || credential.length > 4096) throw new GameError('Missing sign-in token', 400);
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { cache: 'no-store' });
  if (!res.ok) throw new GameError('Google could not verify that sign-in', 401);
  const t = (await res.json()) as { aud?: string; iss?: string; email?: string; email_verified?: string | boolean; exp?: string };
  const verified = t.email_verified === true || t.email_verified === 'true';
  if (t.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(t.iss ?? '')
    || !verified || !t.email || !(Number(t.exp) * 1000 > Date.now())) {
    throw new GameError('Google could not verify that sign-in', 401);
  }
  if (!isAdminEmail(t.email)) throw new GameError(`${t.email} is not an admin`, 403);
  return t.email.toLowerCase();
}
