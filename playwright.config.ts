import { defineConfig } from '@playwright/test';

const testPort = Number(process.env.SPACE_DRAGON_TEST_PORT ?? 5175);

export default defineConfig({
  testDir: './tests',
  testMatch: ['first-contact.spec.ts', 'navigation.spec.ts', 'drive.spec.ts', 'drive-traffic.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: process.env.CI ? 90_000 : 45_000,
  reporter: 'list',
  outputDir: 'artifacts/test-results',
  use: {
    baseURL: `http://127.0.0.1:${testPort}/space-dragon/`,
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    hasTouch: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Deterministic software rendering in automation; not a hardware benchmark.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: `npm run dev -- --port ${testPort}`,
    url: `http://127.0.0.1:${testPort}/space-dragon/`,
    env: { SPACE_DRAGON_TESTING: '1' },
    reuseExistingServer: false,
  },
});
