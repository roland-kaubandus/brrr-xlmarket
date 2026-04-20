import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: ['e2e.spec.ts'],
  timeout: 30000,
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  outputDir: '/tmp/playwright-results/artifacts',
  reporter: [['list'], ['json', { outputFile: '/tmp/playwright-results/results.json' }]],
});
