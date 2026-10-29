import { defineConfig } from '@playwright/test';

/** Exercises the static artifact, where development tools must not exist. */
export default defineConfig({
  testDir: './tests',
  testMatch: 'production.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  reporter: 'list',
  outputDir: 'artifacts/production-test-results',
  use: {
    baseURL: 'http://127.0.0.1:4177/space-dragon/',
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm run preview -- --port 4177',
    url: 'http://127.0.0.1:4177/space-dragon/',
    reuseExistingServer: false,
  },
});
