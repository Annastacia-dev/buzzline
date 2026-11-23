// Share links and question images. Server only (uses the Supabase secret key).
import crypto from 'crypto';
import { db } from './supabase-server';
import { GameError, cleanQuiz } from './game';
import { IMAGE_BUCKET, MAX_IMAGE_BYTES } from './images';
import { checkImage } from './moderate';
import type { Quiz } from './types';

// Small per-instance limits so one visitor can't fill the database or the bucket. Reset every hour.
const hits = new Map<string, { n: number; since: number }>();
function rateLimit(key: string, limit: number, what: string) {
  const now = Date.now(), h = hits.get(key);
  if (!h || now - h.since > 3600e3) { hits.set(key, { n: 1, since: now }); return; }
  if (++h.n > limit) throw new GameError(`Too many ${what} — try again in a while`, 429);
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const shortId = (n: number) => Array.from(crypto.randomBytes(n), b => ALPHABET[b % ALPHABET.length]).join('');
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

/** Saves a copy of a quiz and returns its share id (used as /host?quiz=<id>). */
export async function shareQuiz(quiz: unknown, ip: string) {
  rateLimit(`share:${ip}`, 30, 'share links');
  const clean = cleanQuiz(quiz as Quiz);
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = shortId(10);
    const { error } = await db().from('buzz_shared_quizzes').insert({ id, quiz: clean });
    if (!error) return { id };
    if (error.code !== '23505') throw new Error(error.message);
  }
  throw new GameError('Could not create a link, try again', 503);
}

/** The shared quiz for an id. */
export async function sharedQuiz(idIn: unknown): Promise<Quiz> {
  const id = String(idIn ?? '');
  if (!/^[A-Za-z0-9]{10}$/.test(id)) throw new GameError('That quiz link is not valid', 400);
  const { data, error } = await db().from('buzz_shared_quizzes').select('quiz').eq('id', id).maybeSingle();
  fail(error);
  if (!data) throw new GameError('That quiz link has expired or never existed', 404);
  return data.quiz as Quiz;
}

/** Recognises the image formats we accept from their first bytes (the declared type can't be trusted). */
function sniff(b: Uint8Array): { type: 'image/jpeg' | 'image/png' | 'image/webp'; ext: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return { type: 'image/png', ext: 'png' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  return null;
}

/** Checks a question image is suitable for all ages, stores it and returns its public URL. */
export async function uploadImage(file: unknown, ip: string) {
  rateLimit(`image:${ip}`, 120, 'image uploads');
  if (!(file instanceof Blob)) throw new GameError('No image received', 400);
  if (file.size > MAX_IMAGE_BYTES) throw new GameError('That image is too large (1.2 MB at most)', 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) throw new GameError('Pick a JPG, PNG or WebP image', 415);
  await checkImage(bytes, kind.type);
  const path = `q/${shortId(16)}.${kind.ext}`;
  const { error } = await db().storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: kind.type, cacheControl: '31536000', upsert: false });
  fail(error);
  return { url: db().storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl };
}
