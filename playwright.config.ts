import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: process.env.PRISM_E2E_BASE_URL ? undefined : ['**/deployed.spec.ts'],
  timeout: 60_000,
  workers: 1,
  use: { baseURL: process.env.PRISM_E2E_BASE_URL ?? 'http://127.0.0.1:5173', storageState: process.env.PRISM_E2E_STORAGE_STATE, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', ...(process.platform==='win32'?{channel:'msedge'}:{}) },
  // Routing disables the browser HTTP cache. Serving the unbundled development
  // module graph made every reload repeat costly loading/parsing under pressure.
  // Build with fixture configuration, then test the release bundle on loopback.
  webServer: process.env.PRISM_E2E_BASE_URL ? undefined : { command: 'node scripts/e2e-server.mjs', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
});
