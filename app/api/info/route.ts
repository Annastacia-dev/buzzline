import os from 'os';

// LAN addresses so the host screen can tell players where to go.
export function GET(req: Request) {
  const port = new URL(req.url).port || '80';
  const urls: string[] = [];
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) urls.push(`http://${a.address}:${port}`);
  return Response.json({ urls });
}
