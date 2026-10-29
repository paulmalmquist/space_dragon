import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Plugin } from 'vite';

/** Local development only; never registered by vite preview or included in a build. */
export function ideaInboxPlugin(inboxPath: string): Plugin {
  let pending = Promise.resolve();
  return {
    name: 'local-idea-inbox',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/space-dragon/__ideas', (req, res) => {
        void (async () => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          const reply = (status: number, body: object) => {
            res.statusCode = status;
            res.end(JSON.stringify(body));
          };
          if (req.method !== 'POST') return reply(405, { error: 'Use the idea notebook to add a thought.' });
          // Require the browser's exact local origin; reject cross-site writes and DNS rebinding.
          const host = req.headers.host ?? '';
          if (!/^127\.0\.0\.1:\d+$/.test(host) || req.headers.origin !== `http://${host}`) {
            return reply(403, { error: 'Open the notebook on this computer at 127.0.0.1.' });
          }
          if (!req.headers['content-type']?.startsWith('application/json')) {
            return reply(415, { error: 'Expected a notebook entry.' });
          }
          req.setEncoding('utf8');
          let body = '';
          for await (const chunk of req) {
            body += chunk.toString();
            if (Buffer.byteLength(body) > 20_000) return reply(413, { error: 'Please split this into smaller thoughts.' });
          }
          let thought: unknown;
          try { thought = JSON.parse(body).thought; } catch { return reply(400, { error: 'Could not read this entry.' }); }
          if (typeof thought !== 'string' || !thought.trim() || thought.length > 12_000) {
            return reply(400, { error: 'Write a thought of up to 12,000 characters.' });
          }
          const now = new Date();
          const id = `NOTE-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;
          const quoted = thought.trim().replace(/\r\n?/g, '\n').split('\n').map(line => `> ${line}`).join('\n');
          const entry = `\n\n## ${id}\n\nCaptured: ${now.toISOString()} · Source: local idea notebook · State: untriaged\n\n${quoted}\n`;
          const write = pending.then(async () => {
            await mkdir(dirname(inboxPath), { recursive: true });
            await appendFile(inboxPath, entry, 'utf8');
          });
          pending = write.catch(() => {});
          await write;
          return reply(201, { id });
        })().catch(() => {
          if (!res.headersSent) res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Could not save. Your text is still here; try again.' }));
        });
      });
    },
  };
}
