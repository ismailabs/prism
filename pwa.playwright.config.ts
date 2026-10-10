import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', testMatch: 'pwa.spec.ts', timeout: 60_000, workers: 1,
  outputDir: `artifacts/phase7/pwa-results-${Date.now()}`,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) },
  webServer: { command: 'node scripts/pwa-server.mjs', url: 'http://127.0.0.1:5174', reuseExistingServer: false },
});
