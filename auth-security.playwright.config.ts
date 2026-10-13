import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// A separately built fixture bundle exercises the configured CAPTCHA branch.
// No real challenge service or hosted Auth endpoint is contacted by these tests.
export default defineConfig({ ...base, projects: undefined, testMatch: '**/auth-security.spec.ts', testIgnore: [],
  webServer: { command: 'node scripts/e2e-server.mjs', url: 'http://127.0.0.1:5173', reuseExistingServer: false,
    env: { VITE_TURNSTILE_SITE_KEY: 'prism-fixture-site-key' } },
});
