import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { ideaInboxPlugin } from './tools/dev-idea-inbox.ts';

export default defineConfig({
  base: '/space-dragon/',
  // Only explicitly promoted runtime assets are served/copied. Never serve references.
  publicDir: 'public',
  plugins: [ideaInboxPlugin(fileURLToPath(new URL(
    process.env.SPACE_DRAGON_TESTING === '1' ? './artifacts/test-inbox.md' : './ideas/INBOX.md',
    import.meta.url,
  )))],
  server: {
    port: 5173, strictPort: true,
    fs: {
      strict: true,
      deny: ['**/.git/**', '**/.env*', '**/assets/reference/**', '**/assets/source/**', '**/assets/game/**', '**/ideas/**', '**/docs/**', '**/artifacts/**', '**/*.blend'],
    },
  },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022' },
});
