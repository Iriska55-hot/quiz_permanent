import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { POST, OPTIONS } from '../api/try-on.js';

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 4173);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return join(projectRoot, normalized === "/" ? "index.html" : normalized);
}

export function createAppServer(handler = POST) {
return createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname === '/api/try-on') {
      if (!['POST', 'OPTIONS'].includes(req.method)) {
        res.writeHead(405, { Allow: 'POST, OPTIONS' });
        res.end();
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 4 * 1024 * 1024) {
          res.writeHead(413, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'Das Foto ist zu groß.' }));
          return;
        }
        chunks.push(chunk);
      }
      const request = new Request(`http://127.0.0.1${req.url}`, {
        method: req.method,
        headers: req.headers,
        ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await (req.method === 'OPTIONS' ? OPTIONS(request) : handler(request));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const parts = decodeURIComponent(pathname).split('/');
    if (parts.some(part => part.startsWith('.')) ||
      !(/^\/(src|public)\//.test(pathname) || ['/', '/index.html', '/runtime-config.js', '/favicon.ico'].includes(pathname))) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    let filePath = safePath(req.url || "/");
    if (!resolve(filePath).startsWith(projectRoot + sep)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) filePath = join(projectRoot, "index.html");

    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": mime[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end('Die Anfrage konnte nicht verarbeitet werden.');
  }
});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.loadEnvFile(join(projectRoot, '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Die lokale .env-Datei konnte nicht geladen werden.');
  }
const server = createAppServer();
server.listen(port, "127.0.0.1", () => {
  console.log(`\nAIRC starter запущен: http://127.0.0.1:${port}\n`);
  console.log("Остановить: Ctrl+C\n");
});
}
