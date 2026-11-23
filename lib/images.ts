// Question images live in the public "buzz-images" Supabase Storage bucket. Only the server uploads to it
// (app/api/image); quizzes store the file's public URL. Shared by the browser and the server.

export const IMAGE_BUCKET = 'buzz-images';
/** Largest upload the server accepts (the bucket's own limit is a little higher). */
export const MAX_IMAGE_BYTES = 1.2 * 1024 * 1024;

const base = () => `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')}/storage/v1/object/public/${IMAGE_BUCKET}/`;

/** The URL if it points at a file in Buzzline's image bucket, otherwise undefined (so quizzes can't embed other sites' images). */
export function validImage(v: unknown): string | undefined {
  if (typeof v !== 'string' || !process.env.NEXT_PUBLIC_SUPABASE_URL) return undefined;
  const b = base();
  return v.startsWith(b) && /^[A-Za-z0-9/_-]+\.(webp|jpg|png|gif)$/.test(v.slice(b.length)) ? v : undefined;
}

/**
 * Shrinks a picked image in the browser before upload: at most 1600 px on the long side, saved as WebP.
 * A GIF becomes a still of its first frame (that is the frame the server's content check sees).
 */
export async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Pick an image file (JPG, PNG, WebP or GIF).');
  const bmp = await createImageBitmap(file).catch(() => { throw new Error("That image couldn't be read. Try a JPG or PNG."); });
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  for (const q of [0.85, 0.72, 0.6]) {
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', q));
    if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
  }
  throw new Error('That image is too large, even after shrinking. Try a smaller one.');
}
