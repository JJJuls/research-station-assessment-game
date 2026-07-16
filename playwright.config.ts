import { defineConfig } from '@playwright/test';

/**
 * V1-slice smoke suite (docs/testing/playwright-smoke-plan.md; V3 §9).
 * Run with: npx playwright test
 * Reuses a dev server already running on the port, otherwise starts one.
 *
 * PW_DEV_PORT overrides the dev-server port (default 5173) so parallel
 * checkouts/worktrees can run their own server instead of silently reusing
 * another tree's :5173 instance (reuseExistingServer would otherwise test
 * the WRONG code — observed live during the pilot-slice bring-up).
 */
const port = Number(process.env.PW_DEV_PORT ?? 5173);

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: 1,
  // The game is a single shared dev server; keep runs serial so sessions
  // never interleave keyboard input.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 800, height: 600 },
    // The first WebGL context of a fresh headless Chromium on this machine
    // fails Phaser's renderer boot ("Framebuffer status: Framebuffer
    // Unsupported" + context loss), so the run's FIRST test always burned
    // its first attempt (the historical "cold-Vite first-load" flake —
    // misattributed). SwiftShader software GL is deterministic from the
    // first context onward.
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader'],
    },
  },
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
