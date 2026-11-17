// serve.ts — a tiny static server for playing Ember Keeper locally.
//
// Serves game/ at http://localhost:8080 so the game can be play-tested in
// a desktop browser and its screenshots taken. No dependencies, no network
// beyond localhost.

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(process.cwd(), 'game');
const PORT = Number(process.env.PORT || '8080');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = join(ROOT, path === '/' ? 'index.html' : path);
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(PORT, () => {
  console.log(`Ember Keeper at http://localhost:${PORT}`);
});
