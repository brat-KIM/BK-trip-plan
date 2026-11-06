#!/usr/bin/env node
/* 로컬 미리보기 서버 (의존성 없음)
   node scripts/serve.mjs [포트]  →  http://localhost:4173
   vercel.json 처럼 /<slug> 를 /app/index.html 로 연결해줌. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.argv[2] || process.env.PORT || 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };
const HIDDEN = /^\/(_originals|scripts|node_modules|\.git)(\/|$)/;

function send(res, file, status = 200) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(status, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex, nofollow' });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (HIDDEN.test(p)) { res.writeHead(404); return res.end('Not found'); }
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return send(res, file);
  if (/^\/[a-z0-9][a-z0-9-]*\/?$/.test(p)) return send(res, path.join(ROOT, 'app/index.html'));
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found');
}).listen(PORT, () => console.log('BK Trip 미리보기 → http://localhost:' + PORT));
