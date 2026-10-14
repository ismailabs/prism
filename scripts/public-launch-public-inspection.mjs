// Read-only public/configuration inspection. Never queries customer or Auth rows.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const origin = 'https://prism.ismailstudio.my';
const expectedAuthOrigin = 'https://hyhsppiitijkuvpyswce.supabase.co';
const receipt = { checkedAtUTC: new Date().toISOString(), evidenceClass: 'PROD-PUBLIC-METADATA',
  customerRowsAccessed: false, writesPerformed: false, routes: [] };
let homepage;
for (const path of ['/', '/privacy', '/terms', '/demo', '/login']) {
  const response = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200, `Public route ${path} status`);
  const html = await response.text();
  receipt.routes.push({ path, status: response.status,
    headers: Object.fromEntries(['cache-control', 'strict-transport-security', 'content-security-policy',
      'x-content-type-options', 'x-frame-options', 'referrer-policy'].map(name => [name, response.headers.get(name)])),
    htmlSHA256: createHash('sha256').update(html).digest('hex') });
  if (path === '/') homepage = html;
}
const asset = homepage.match(/<script[^>]+src="(\/assets\/[^"?]+\.js)"/);
assert.ok(asset, 'Published same-origin entry asset');
const entry = await fetch(origin + asset[1], { redirect: 'error', signal: AbortSignal.timeout(20_000) });
assert.equal(entry.status, 200);
const source = await entry.text();
// Follow only the published bundle's explicit same-origin static JS references.
// Split Vite chunks can hold public client configuration outside the entry chunk.
const queue = [[origin + asset[1], source]];
const visited = new Set();
const sources = [];
for (let index = 0; index < queue.length; index++) {
  assert.ok(queue.length <= 60, 'Bounded static asset graph');
  const [url, body] = queue[index];
  if (visited.has(url)) continue;
  visited.add(url);
  sources.push(body);
  for (const match of body.matchAll(/["']((?:\.\/|\/assets\/)[^"'?#]+\.js)["']/g)) {
    const child = new URL(match[1], url);
    assert.equal(child.origin, origin);
    assert.ok(child.pathname.startsWith('/assets/'));
    if (visited.has(child.href) || queue.some(([queued]) => queued === child.href)) continue;
    const response = await fetch(child, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
    assert.equal(response.status, 200, 'Published referenced asset');
    queue.push([child.href, await response.text()]);
  }
}
const publicSource = sources.join('\n');
assert.ok(publicSource.includes(expectedAuthOrigin), 'Published app binds the expected production Auth project');
const tokens = [...new Set([...publicSource.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)].map(match => match[0]))];
const anonymousKeys = tokens.filter(token => {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  assert.notEqual(payload.role, 'service_role', 'Privileged token must never appear in a public asset');
  return payload.role === 'anon' && payload.ref === 'hyhsppiitijkuvpyswce';
});
assert.equal(anonymousKeys.length, 1, 'One intended public anonymous configuration key');
// The public key remains in memory only and is never printed or persisted.
const headers = { apikey: anonymousKeys[0] };
const settingsResponse = await fetch(expectedAuthOrigin + '/auth/v1/settings', {
  headers, redirect: 'error', signal: AbortSignal.timeout(20_000),
});
assert.equal(settingsResponse.status, 200);
const settings = await settingsResponse.json();
receipt.auth = { project: 'hyhsppiitijkuvpyswce', status: settingsResponse.status,
  disableSignup: settings.disable_signup, emailAutoconfirm: settings.mailer_autoconfirm,
  emailEnabled: settings.external?.email, googleEnabled: settings.external?.google,
  captchaEnabled: settings.captcha_enabled ?? 'NOT EXPOSED BY PUBLIC SETTINGS',
  passwordPolicy: 'NOT EXPOSED BY PUBLIC SETTINGS' };
receipt.publicAsset = { path: asset[1], sha256: createHash('sha256').update(source).digest('hex'),
  inspectedStaticAssets: visited.size, privilegedJWTFound: false };
await mkdir('artifacts/public-launch', { recursive: true });
await writeFile('artifacts/public-launch/public-metadata.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
