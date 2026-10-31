// Local review only. This server cannot serve the repository or another Unity build.
import http from 'node:http';
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.join(repo, 'unity/SpaceDragon/Builds/TownDriveWeb');
const realRoot = await realpath(root);
await stat(path.join(realRoot, 'index.html'));
const port = Number(process.env.SPACE_DRAGON_TOWN_DRIVE_PORT || 5208);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local review port.');
const prefix = '/space-dragon-town-drive/';
const compression = process.env.SPACE_DRAGON_UNITY_HTTP_COMPRESSION || 'gzip';
if (!['gzip', 'none'].includes(compression)) throw new Error('HTTP compression must be gzip or none.');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.mp4': 'video/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const compressible = new Set(['.html', '.js', '.wasm', '.data', '.json', '.css', '.svg', '.txt', '.xml']);
const gzipAsync = promisify(gzip);
const compressed = new Map();
const within = (directory, file) => file.startsWith(directory + path.sep);

function acceptsGzip(header = '') {
  const entries = header.split(',').map(entry => {
    const [name, ...parameters] = entry.trim().toLowerCase().split(';');
    const parameter = parameters.find(value => value.trim().startsWith('q='));
    const quality = parameter === undefined ? 1 : Number(parameter.trim().slice(2));
    return { name: name.trim(), quality: Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0 };
  });
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
// First-load measurements should not include one-time server compression work.
if (compression === 'gzip') await warmCompression(realRoot);

const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname); }
    catch { res.writeHead(400); res.end(); return; }
    if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
    const resolved = path.resolve(root, pathname.slice(prefix.length) || 'index.html');
    if (!within(root, resolved)) { res.writeHead(403); res.end(); return; }
    const file = await realpath(resolved);
    if (!within(realRoot, file)) { res.writeHead(403); res.end(); return; }
    const info = await stat(file);
    if (!info.isFile()) { res.writeHead(404); res.end(); return; }
    let encoding = file.endsWith('.br') ? 'br' : file.endsWith('.gz') ? 'gzip' : null;
    const plainName = encoding ? file.slice(0, -3) : file;
    let body;
    if (!encoding && compressible.has(path.extname(file).toLowerCase())) {
      res.setHeader('Vary', 'Accept-Encoding');
      if (compression === 'gzip' && acceptsGzip(req.headers['accept-encoding'])) { body = await compressedFile(file, info); encoding = 'gzip'; }
    }
    res.setHeader('Content-Type', mime[path.extname(plainName).toLowerCase()] || 'application/octet-stream');
    if (encoding) res.setHeader('Content-Encoding', encoding);
    res.setHeader('Content-Length', body ? body.length : info.size);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.writeHead(200);
    if (req.method === 'HEAD') res.end();
    else if (body) res.end(body);
    else createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch {
    if (res.headersSent) res.destroy();
    else { res.writeHead(404); res.end(); }
  }
});
server.on('error', error => { console.error(`Town Drive review server: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Unity Town Drive: http://127.0.0.1:${port}${prefix} (HTTP compression: ${compression}; ${compressed.size} files precompressed)`));
