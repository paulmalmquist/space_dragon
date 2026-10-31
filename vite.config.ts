import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { ideaInboxPlugin } from './tools/dev-idea-inbox.ts';

const portArgument = process.argv.indexOf('--port');
const cacheSuffix = process.env.SPACE_DRAGON_TESTING === '1' ? 'test' : portArgument >= 0 ? process.argv[portArgument + 1] : 'local';

export default defineConfig({
  base: '/space-dragon/',
  // Independent dev/test ports must not invalidate one another's optimized shaders.
  cacheDir: `node_modules/.vite-${cacheSuffix}`,
  // Only explicitly promoted runtime assets are served/copied. Never serve references.
  publicDir: 'public',
  plugins: [ideaInboxPlugin(fileURLToPath(new URL(
    process.env.SPACE_DRAGON_TESTING === '1' ? './artifacts/test-inbox.md' : './ideas/INBOX.md',
    import.meta.url,
  )))],
  server: {
    port: 5173, strictPort: true,
    // Generated playtest/review HTML and local source exports must not reload
    // a running game. Real application/configuration edits remain watched.
    watch: { ignored: ['**/artifacts/**', '**/.tools/**', '**/assets/reference/**', '**/assets/source/**', '**/assets/game/**'] },
    fs: {
      strict: true,
      deny: ['**/.git/**', '**/.env*', '**/assets/reference/**', '**/assets/source/**', '**/assets/game/**', '**/seeles-assets/**', '**/ideas/**', '**/docs/**', '**/artifacts/**', '**/*.blend'],
    },
  },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        drive: fileURLToPath(new URL('./drive/index.html', import.meta.url)),
        dogfight: fileURLToPath(new URL('./dogfight/index.html', import.meta.url)),
      },
    },
  },
});
