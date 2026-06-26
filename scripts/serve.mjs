import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8']
]);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^([.][.][/\\])+/, '');
  return path.join(root, normalized);
}

function resolveFile(urlPath) {
  const base = safePath(urlPath === '/' ? '/index.html' : urlPath);
  const options = [base, base + '.html', path.join(base, 'index.html')];
  return options.find((candidate) => candidate.startsWith(root) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || path.join(root, '404.html');
}

const server = http.createServer((req, res) => {
  const file = resolveFile(req.url || '/');
  const ext = path.extname(file);
  res.setHeader('Content-Type', mime.get(ext) || 'application/octet-stream');
  if (path.basename(file) === '404.html' && !(req.url || '').includes('404.html')) res.statusCode = 404;
  fs.createReadStream(file).pipe(res);
});

server.listen(port, () => {
  console.log(`DITT UNAB local: http://localhost:${port}`);
});
