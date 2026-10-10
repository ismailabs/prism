// Independent event/network/cache oracle. The browser gate separately uses a real worker.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const template = await readFile('src/pwa/service-worker.js', 'utf8');
const assets = ['/assets/public-HASH.js', '/offline-HASH.html'];
const code = template.replaceAll('__CACHE_NAME__', '"prism-public-new"').replaceAll('__ASSETS__', JSON.stringify(assets)).replaceAll('__OFFLINE_URL__', '"/offline-HASH.html"');
const origin = 'https://local.fixture';
const canonical = value => new URL(typeof value === 'string' ? value : value.url, origin).href;
class LocalRequest extends Request { constructor(input, options) { super(typeof input === 'string' ? canonical(input) : input, options); } }
const handlers = {}, entries = new Map(); let fail = false, activated = false, claimed = false;
const cacheApi = { async open(name) { if (!entries.has(name)) entries.set(name, new Map()); const values = entries.get(name); return { put: async (key, value) => values.set(canonical(key), value.clone()), match: async key => values.get(canonical(key))?.clone() }; }, keys: async () => [...entries.keys()], delete: async name => entries.delete(name) };
const self = { location: { origin }, addEventListener: (type, listener) => handlers[type] = listener, clients: { claim: async () => { claimed = true; } }, skipWaiting: async () => { activated = true; } };
const calls = []; let unsafe = '';
const network = async input => { calls.push(input); if (fail) throw new Error('Fixture disconnect'); const offline = new URL(input.url).pathname === assets[1]; return new Response(offline ? 'ANONYMOUS_OFFLINE_ONLY' : 'PUBLIC_CODE', { headers: { 'Cache-Control': unsafe === 'private' ? 'private, no-store' : 'public, immutable', 'Content-Type': unsafe === 'html' ? 'text/html' : offline ? 'text/html' : 'text/javascript' }, status: unsafe === 'missing' ? 404 : 200 }); };
vm.runInNewContext(code, { self, caches: cacheApi, fetch: network, Request: LocalRequest, Response, URL, Set, Error });
async function lifecycle(type, data) { let operation; handlers[type]({ data, waitUntil: promise => operation = promise }); if (operation) await operation; }
await lifecycle('install'); assert.equal(activated, false, 'Install must not force activation'); assert.equal(entries.get('prism-public-new').size, 2);
for (const input of ['/api/private', '/exports/transactions.csv', '/search?q=private', '/auth/callback?code=private', '/notifications', '/ledger', '/assets/public-HASH.js?token=private']) {
  let intercepted = false; const request = new LocalRequest(input); handlers.fetch({ request, respondWith: () => intercepted = true }); assert.equal(intercepted, false, input);
}
for (const request of [new LocalRequest('/assets/public-HASH.js', { headers: { Authorization: 'Bearer PRIVATE_TOKEN' } }), new LocalRequest('/assets/public-HASH.js', { method: 'POST', body: 'PRIVATE' }), new Request('https://fixture.supabase.co/rest/v1/exact_accounts'), new Request('https://fixture.supabase.co/auth/v1/token')]) {
  let intercepted = false; handlers.fetch({ request, respondWith: () => intercepted = true }); assert.equal(intercepted, false, request.url);
}
const navigation = new LocalRequest('/accounts?private=PRIVATE_TOKEN'); Object.defineProperty(navigation, 'mode', { value: 'navigate' });
fail = true; let response; handlers.fetch({ request: navigation, respondWith: result => response = result }); assert.equal(await (await response).text(), 'ANONYMOUS_OFFLINE_ONLY');
assert.equal(entries.get('prism-public-new').size, 2, 'Navigations must not write a response');
await cacheApi.open('prism-public-old'); await cacheApi.open('another-app');
await lifecycle('activate'); assert.equal(claimed, true); assert(!entries.has('prism-public-old')); assert(entries.has('another-app'));
await lifecycle('message', { type: 'unknown' }); assert.equal(activated, false); await lifecycle('message', { type: 'ACTIVATE_UPDATE' }); assert.equal(activated, true);
await assert.rejects(lifecycle('install'), /Fixture disconnect/); assert(!entries.has('prism-public-new'), 'Failed installation must remove partial cache'); assert(entries.has('another-app'));
fail = false;
for (const variant of ['html', 'private', 'missing']) {
  unsafe = variant; await assert.rejects(lifecycle('install'), /Public asset/);
  assert(!entries.has('prism-public-new'), `Reject and clean ${variant} asset response`);
}
const config = JSON.parse(await readFile('vercel.json', 'utf8')), rewrite = new RegExp(`^${config.rewrites[0].source}$`);
for (const path of ['/api/rates', '/api', '/assets/missing.js', '/sw.js', '/site.webmanifest', '/offline-HASH.html', '/icon-192.png']) assert.equal(rewrite.test(path), false, path);
for (const path of ['/', '/login', '/dashboard', '/accounts', '/transactions', '/analytics']) assert.equal(rewrite.test(path), true, path);
await mkdir('artifacts/phase7', { recursive: true }); await writeFile('artifacts/phase7/pwa-review.json', JSON.stringify({ status: 'PASS', boundaryRequests: 11, publicCacheOnly: true, failedInstallCleanup: true, rejectsHtmlPrivateAnd404Assets: true, updateWait: true, offlineNavigation: true, staticAndApiRewriteExclusion: true }, null, 2));
console.log('PASS independent worker probes: public-only cache, eleven network-only boundaries, offline document, failed-install cleanup, accepted updates and static/API routing');
