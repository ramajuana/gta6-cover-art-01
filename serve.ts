// A development-only static server for app/ (Node 22, stdlib only).
// Run `node serve.ts` and open http://localhost:8080 to try the cover
// studio in a browser. It serves files from app/ and nothing else, and is
// not part of the entry: the app itself is plain static files.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const portArg = process.argv.indexOf('--port');
const wanted = portArg === -1 ? 8080 : Number(process.argv[portArg + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const target = resolve(join(appRoot, normalize(pathname === '/' ? 'index.html' : pathname)));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let bytes;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('not a file');
    bytes = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': bytes,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`Neon Coast Cover Studio is on http://localhost:${port}`);
});
