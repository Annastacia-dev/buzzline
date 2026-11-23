// Saves the share images as JPEG files: public/share/<name>.jpg, from the PNG drafts at /og/<name>.
// Run with the app running (pnpm dev or pnpm start): `pnpm og` (default http://localhost:3000) or `pnpm og <base url>`.
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const names = ['home', 'host', 'join'];
await mkdir('public/share', { recursive: true });
for (const name of names) {
  const res = await fetch(`${base}/og/${name}`);
  if (!res.ok) throw new Error(`${base}/og/${name}: ${res.status}`);
  const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
    .flatten({ background: '#fbf6ec' })
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
  await writeFile(`public/share/${name}.jpg`, jpg);
  console.log(`public/share/${name}.jpg  ${(jpg.length / 1024).toFixed(0)} KB`);
}
