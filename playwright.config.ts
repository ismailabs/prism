import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: process.env.PRISM_E2E_BASE_URL ? undefined : ['**/deployed.spec.ts'],
  timeout: 60_000,
  workers: 1,
  use: { baseURL: process.env.PRISM_E2E_BASE_URL ?? 'http://127.0.0.1:5173', headless: true, ...(process.platform==='win32'?{channel:'msedge'}:{}) },
  webServer: process.env.PRISM_E2E_BASE_URL ? undefined : { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true, env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'fixture-anon-key' } },
});
