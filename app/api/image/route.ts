import { uploadImage } from '@/lib/library';
import { GameError } from '@/lib/game';
import { ipOf, respond } from '@/lib/route';

/** POST /api/image (multipart, field "file") → { url } of the stored question image. */
export async function POST(req: Request) {
  return respond(async () => {
    const form = await req.formData().catch(() => { throw new GameError('Send the image as a file upload', 400); });
    return uploadImage(form.get('file'), ipOf(req));
  });
}
