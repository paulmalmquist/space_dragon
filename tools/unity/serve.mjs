import http from 'node:http';
import { stat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { createReadStream } from 'node:fs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const candidate = process.env.SPACE_DRAGON_UNITY_BUILD || 'first-contact';
if (!['first-contact', 'launch'].includes(candidate)) throw new Error('Unknown local candidate.');
const root = path.join(repo, 'unity/SpaceDragon/Builds', candidate === 'launch' ? 'LaunchWeb' : 'Web');
const prefix = candidate === 'launch' ? '/space-dragon-launch/' : '/space-dragon-unity/';
const realRoot = await realpath(root);
const port = Number(process.env.SPACE_DRAGON_UNITY_PORT || 5194);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port.');
const compression = process.env.SPACE_DRAGON_UNITY_HTTP_COMPRESSION || 'gzip';
if (!['gzip', 'none'].includes(compression)) throw new Error('HTTP compression must be gzip or none.');
await stat(path.join(root, 'index.html'));
const mime = { '.html':'text/html; charset=utf-8', '.js':'application/javascript', '.mjs':'application/javascript', '.wasm':'application/wasm', '.json':'application/json', '.map':'application/json', '.css':'text/css', '.txt':'text/plain; charset=utf-8', '.xml':'application/xml', '.svg':'image/svg+xml', '.csv':'text/csv', '.md':'text/markdown', '.png':'image/png', '.jpg':'image/jpeg', '.mp4':'video/mp4', '.webm':'video/webm' };
const compressible = new Set(['.html', '.js', '.mjs', '.wasm', '.data', '.json', '.map', '.css', '.txt', '.xml', '.svg', '.csv', '.md']);
const gzipAsync = promisify(gzip);
const compressed = new Map();
const insideRoot = file => file.startsWith(realRoot + path.sep);
function acceptsGzip(header = '') {
  const entries = header.split(',').map(entry => {
    const [name, ...parameters] = entry.trim().toLowerCase().split(';');
    const parameter = parameters.find(value => value.trim().startsWith('q='));
    const quality = parameter === undefined ? 1 : Number(parameter.trim().slice(2));
    return { name: name.trim(), quality: Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0 };
  });
  // An explicit gzip;q=0 overrides a permissive wildcard.
  return (entries.find(entry => entry.name === 'gzip') ?? entries.find(entry => entry.name === '*'))?.quality > 0;
}
async function compressedFile(file, info) {
  const cached = compressed.get(file);
  if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) return cached.body;
  const body = await gzipAsync(await readFile(file));
  compressed.set(file, { mtimeMs: info.mtimeMs, size: info.size, body });
  return body;
}
async function warmCompression(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await warmCompression(file);
    else if (entry.isFile() && compressible.has(path.extname(file).toLowerCase())) await compressedFile(file, await stat(file));
  }
}
// Finish compression before accepting traffic: first-load timings measure transfer
// and browser startup, not a first-request compression job. Build files stay intact.
if (compression === 'gzip') await warmCompression(realRoot);
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
    const relative = pathname.slice(prefix.length) || 'index.html';
    const resolved = path.resolve(root, relative);
    if (!resolved.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const file = await realpath(resolved);
    if (!insideRoot(file)) { res.writeHead(403); res.end(); return; }
    const info = await stat(file);
    if (!info.isFile()) { res.writeHead(404); res.end(); return; }
    let encoding = file.endsWith('.br') ? 'br' : file.endsWith('.gz') ? 'gzip' : null;
    const plainName = encoding ? file.slice(0, -3) : file;
    let body;
    if (!encoding && compressible.has(path.extname(file).toLowerCase())) {
      res.setHeader('Vary', 'Accept-Encoding');
      if (compression === 'gzip' && acceptsGzip(req.headers['accept-encoding'])) {
        body = await compressedFile(file, info);
        encoding = 'gzip';
      }
    }
    res.setHeader('Content-Type', mime[path.extname(plainName).toLowerCase()] || 'application/octet-stream');
    if (encoding) res.setHeader('Content-Encoding', encoding);
    res.setHeader('Content-Length', body ? body.length : info.size);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    if (!encoding && ['.mp4','.webm'].includes(path.extname(file))) {
      res.setHeader('Accept-Ranges', 'bytes');
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        let start = match?.[1] ? Number(match[1]) : 0;
        let end = match?.[2] ? Number(match[2]) : info.size - 1;
        if (match && !match[1] && match[2]) { start = Math.max(0, info.size - Number(match[2])); end = info.size - 1; }
        if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= info.size || end < start) {
          res.setHeader('Content-Range', `bytes */${info.size}`); res.setHeader('Content-Length', 0); res.writeHead(416); res.end(); return;
        }
        end = Math.min(end, info.size - 1);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`); res.setHeader('Content-Length', end - start + 1); res.writeHead(206);
        if (req.method === 'HEAD') res.end(); else createReadStream(file, { start, end }).on('error',()=>res.destroy()).pipe(res);
        return;
      }
    }
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : body ?? await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
server.listen(port, '127.0.0.1', () => console.log(`Unity candidate: http://127.0.0.1:${port}${prefix} (HTTP compression: ${compression}; ${compressed.size} files precompressed)`));
