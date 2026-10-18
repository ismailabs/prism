import { defineConfig } from '@playwright/test';
import { readdirSync } from 'node:fs';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/pwa.spec.ts', '**/auth-security.spec.ts', ...(process.env.PRISM_E2E_BASE_URL ? [] : ['**/deployed.spec.ts'])],
  timeout: 60_000,
  workers: 1,
  // Each Windows spec gets a fresh browser worker, releasing axe/screenshot
  // caches on memory-constrained hosts. The complete test set, assertions,
  // deadlines and single loopback server remain unchanged.
  projects: process.platform === 'win32' ? readdirSync(new URL('./e2e/', import.meta.url))
    .filter(file => file.endsWith('.spec.ts')).sort()
    .map(file => ({ name: file.replace('.spec.ts', ''), testMatch: `**/${file}` })) : undefined,
  use: { baseURL: process.env.PRISM_E2E_BASE_URL ?? 'http://127.0.0.1:5173', storageState: process.env.PRISM_E2E_STORAGE_STATE, headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', ...(process.platform==='win32'?{channel:'msedge'}:{}) },
  // Routing disables the browser HTTP cache. Serving the unbundled development
  // module graph made every reload repeat costly loading/parsing under pressure.
  // Build with fixture configuration, then test the release bundle on loopback.
  webServer: process.env.PRISM_E2E_BASE_URL ? undefined : { command: 'node scripts/e2e-server.mjs', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
});
