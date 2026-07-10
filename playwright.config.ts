import { defineConfig } from '@playwright/test';

/**
 * V1-slice smoke suite (docs/testing/playwright-smoke-plan.md; V3 §9).
 * Run with: npx playwright test
 * Reuses a dev server already running on :5173, otherwise starts one.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: 1,
  // The game is a single shared dev server; keep runs serial so sessions
  // never interleave keyboard input.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 800, height: 600 },
  },
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
