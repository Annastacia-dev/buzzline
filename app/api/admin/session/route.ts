import { cookies } from 'next/headers';
import { ADMIN_COOKIE, currentAdmin, sessionFor, verifyGoogle } from '@/lib/admin';
import { respond } from '@/lib/route';

const noStore = { 'Cache-Control': 'no-store' };

/** GET /api/admin/session → { email } when signed in as an admin, else { email: null }. */
export async function GET() {
  return respond(async () => ({ email: await currentAdmin() }), noStore);
}

/** POST /api/admin/session { credential } (a Google ID token) → signs in, if the address is an admin's. */
export async function POST(req: Request) {
  return respond(async () => {
    const b = (await req.json().catch(() => ({}))) as { credential?: unknown };
    const email = await verifyGoogle(b.credential);
    const s = sessionFor(email);
    (await cookies()).set(ADMIN_COOKIE, s.value, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: s.maxAge,
    });
    return { email };
  }, noStore);
}

/** DELETE /api/admin/session → signs out. */
export async function DELETE() {
  return respond(async () => { (await cookies()).delete(ADMIN_COOKIE); return { email: null }; }, noStore);
}
