import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { request } from '@playwright/test';

// Keep protection credentials out of logs and off third-party requests.
const url = process.argv[2];
assert.match(url ?? '', /^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/);
const mode = process.argv.includes('--production') ? 'production' : 'preview';
const envText = await readFile(`.env.${mode}.local`, 'utf8');
function publicSetting(name) {
  const line = envText.split(/\r?\n/).find(line => line.startsWith(name + '='));
  assert.ok(line, `Missing ${name}`);
  const value = line.slice(name.length + 1);
  return value.startsWith('"') ? JSON.parse(value) : value;
}
const supabaseUrl = publicSetting('VITE_SUPABASE_URL');
const publicKey = publicSetting('VITE_SUPABASE_ANON_KEY');
const context = await request.newContext({ baseURL: url });
try {
  let response = await context.get('/', { maxRedirects: 0 });
  if ((response.status() >= 300 && response.status() < 400) || [401, 403].includes(response.status())) {
    const { token } = JSON.parse(await readFile('.cache/deployment-protection.json', 'utf8'));
    assert.ok(token, 'Protected preview requires the existing project bypass credential.');
    response = await context.get('/', {
      maxRedirects: 0,
      headers: { 'x-vercel-protection-bypass': token, 'x-vercel-set-bypass-cookie': 'true' },
    });
    if (response.status() >= 300 && response.status() < 400) {
      const redirect = new URL(response.headers().location, url);
      assert.equal(redirect.origin, new URL(url).origin, 'Protection access must remain on the deployment.');
      response = await context.get(redirect.href, { maxRedirects: 0 });
    }
  }
  assert.equal(response.status(), 200, 'Deployed app must load.');
  assert.match(await response.text(), /P\.R\.I\.S\.M\.|PRISM/i);
  assert.equal(response.headers()['x-content-type-options'], 'nosniff');
  assert.equal(response.headers()['x-frame-options'], 'DENY');
  assert.match(response.headers()['content-security-policy'] ?? '', /frame-ancestors 'none'/);
  await mkdir('.cache', { recursive: true });
  const storageState = `.cache/${mode}-qa-browser.json`;
  await context.storageState({ path: storageState });
  console.log(`PASS ${mode} HTML and security headers; protected access stays scoped to the deployment.`);
  const tests = process.argv.includes('--all') ? [] : ['e2e/deployed.spec.ts', 'e2e/periods-colors.spec.ts', 'e2e/pagination.spec.ts'];
  const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...tests], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PRISM_E2E_BASE_URL: url,
      PRISM_E2E_SUPABASE_URL: supabaseUrl,
      PRISM_E2E_PUBLIC_KEY: publicKey,
      PRISM_E2E_STORAGE_STATE: storageState,
    },
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(exitCode, 0, 'Deployed browser QA failed.');
} finally {
  await context.dispose();
}
