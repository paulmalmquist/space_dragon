import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  reporter: 'list',
  outputDir: 'artifacts/test-results',
  use: {
    baseURL: 'http://127.0.0.1:5175/space-dragon/',
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    hasTouch: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // Deterministic software rendering in automation; not a hardware benchmark.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm run dev -- --port 5175',
    url: 'http://127.0.0.1:5175/space-dragon/',
    env: { SPACE_DRAGON_TESTING: '1' },
    reuseExistingServer: false,
  },
});
