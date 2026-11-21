import os from 'os';

// Typical home/office Wi-Fi ranges first; 172.16–31.* is often a virtual adapter (WSL, Docker, Hyper-V)
// that phones can't reach, so it goes last.
const rank = (ip: string) => (ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 3 : 2);

// LAN addresses so the host screen can tell players where to go.
export function GET(req: Request) {
  const port = new URL(req.url).port || '80';
  const ips: string[] = [];
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) ips.push(a.address);
  ips.sort((a, b) => rank(a) - rank(b));
  return Response.json({ urls: ips.map(ip => `http://${ip}:${port}`) });
}
