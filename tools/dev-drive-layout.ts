import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';

/** One fixed local JSON file, only on the loopback development server. Never a file server. */
export function driveLayoutPlugin(layoutPath: string): Plugin {
  return {
    name: 'local-drive-house', apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/space-dragon/__drive-layout', (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json');
        const host = req.headers.host ?? '';
        let source = req.headers.origin ?? '';
        try { if (!source && req.headers.referer) source = new URL(req.headers.referer).origin; } catch { /* Reject malformed callers. */ }
        const localSocket = ['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(req.socket.remoteAddress ?? '');
        if (!localSocket || req.method !== 'GET' || !/^127\.0\.0\.1:\d+$/.test(host) || source !== `http://${host}` || process.env.SPACE_DRAGON_TESTING === '1') {
          res.statusCode = 404; res.end('{}'); return;
        }
        void readFile(layoutPath, 'utf8').then(data => {
          if (Buffer.byteLength(data) > 64_000) throw new Error('Layout too large');
          const parsed: unknown = JSON.parse(data);
          res.end(JSON.stringify(parsed));
        }).catch(() => { res.statusCode = 404; res.end('{}'); });
      });
    },
  };
}
