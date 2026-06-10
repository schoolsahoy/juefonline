// Local dev server: serves the static site and mounts api/submit.js the way
// Vercel does (parsed req.body + res.status/json/send helpers), so the form
// flow can be tested end-to-end before deploying.
//
//   DATABASE_URL="postgresql://…" node scripts/dev-server.mjs
//
// RESEND_API_KEY / TO_EMAIL / FROM_EMAIL are honored if set.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from '../api/submit.js';

const PORT = process.env.PORT || 8799;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/submit') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const contentType = req.headers['content-type'] || '';
    let body = {};
    try {
      if (contentType.includes('application/json')) body = JSON.parse(raw || '{}');
      else if (contentType.includes('application/x-www-form-urlencoded')) body = Object.fromEntries(new URLSearchParams(raw));
    } catch { /* leave body empty; handler validates */ }
    req.body = body;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res; };
    res.send = (text) => { res.end(String(text)); return res; };
    try {
      return await handler(req, res);
    } catch (err) {
      console.error('handler crashed:', err);
      if (!res.writableEnded) { res.statusCode = 500; res.end('Internal error'); }
      return;
    }
  }

  let pathname = normalize(decodeURIComponent(url.pathname));
  if (pathname.includes('..')) { res.statusCode = 403; return res.end('Forbidden'); }
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  try {
    const file = await readFile(join(ROOT, pathname));
    res.setHeader('Content-Type', MIME[extname(pathname).toLowerCase()] || 'application/octet-stream');
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`juefonline dev server → http://localhost:${PORT}`));
