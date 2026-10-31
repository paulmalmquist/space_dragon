import { defineConfig } from '@playwright/test';

const previewPort = Number(process.env.SPACE_DRAGON_PREVIEW_PORT ?? 4177);
const nativeChrome = process.env.SPACE_DRAGON_NATIVE_CHROME === '1' && !process.env.CI;

/** Exercises the static artifact, where development tools must not exist. */
export default defineConfig({
  testDir: './tests',
  testMatch: ['production.spec.ts', 'navigation.production.spec.ts', 'drive.production.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: process.env.CI ? 90_000 : 45_000,
  reporter: 'list',
  outputDir: 'artifacts/production-test-results',
  use: {
    baseURL: `http://127.0.0.1:${previewPort}/space-dragon/`,
    browserName: 'chromium',
    ...(nativeChrome ? { channel: 'chrome' } : {}),
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: nativeChrome ? {} : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: `npm run preview -- --port ${previewPort}`,
    url: `http://127.0.0.1:${previewPort}/space-dragon/`,
    reuseExistingServer: false,
  },
});
