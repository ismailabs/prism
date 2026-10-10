// Local source allowlist rehearsal; this does not link or upload to Vercel.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile, symlink, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import vm from 'node:vm';
const root = process.cwd(), directory = resolve('.cache', `phase7-package-${Date.now()}`);
assert(directory.startsWith(resolve('.cache') + '\\') || directory.startsWith(resolve('.cache') + '/'));
await mkdir(directory, { recursive: true });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean);
const configuration = new Set(['package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'vitest.config.ts', 'tsconfig.json', 'tailwind.config.js', 'postcss.config.js', 'vercel.json', '.vercelignore']);
const paths = [...new Set([...git('ls-files', '-z'), ...git('ls-files', '--others', '--exclude-standard', '-z')])].filter(path => configuration.has(path) || path.startsWith('public/') || (/^(src|api|server)\//.test(path) && !/\.test\.[jt]sx?$/.test(path)) || path === 'supabase/tests/ledger-history.synthetic.json').sort();
const inventory = [];
for (const path of paths) {
  assert(!/^(docs|artifacts|scripts|e2e|\.github)\//.test(path) && !/\.env|\.sql$/.test(path));
  const source = await readFile(path);
  inventory.push({ path, sha256: createHash('sha256').update(source).digest('hex') });
  const target = resolve(directory, path); await mkdir(dirname(target), { recursive: true }); await copyFile(resolve(root, path), target);
}
await symlink(resolve(root, 'node_modules'), resolve(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
const build = async env => {
  const child = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: directory, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
  return { exitCode: await new Promise((done, reject) => { child.once('error', reject); child.once('exit', code => done(code)); }), output };
};
const missing = await build({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' });
assert.notEqual(missing.exitCode, 0); assert.match(missing.output, /Build requires VITE_SUPABASE_URL/);
const insecure = await build({ VITE_SUPABASE_URL: 'http://fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'fixture' });
assert.notEqual(insecure.exitCode, 0); assert.match(insecure.output, /clean HTTPS/);
const started = Date.now(), result = await build({ VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'fixture-anon-key' });
await mkdir('artifacts/phase7', { recursive: true }); await writeFile('artifacts/phase7/source-package-build.log', result.output);
assert.equal(result.exitCode, 0, 'Allowlisted package must build without excluded scripts/docs/migrations');
const output = resolve(directory, 'dist'), html = await readFile(resolve(output, 'index.html'), 'utf8');
assert.match(html.replaceAll('&#39;', "'"), /connect-src 'self' https:\/\/fixture\.supabase\.co wss:\/\/fixture\.supabase\.co/);
assert.match(html, /name="referrer" content="no-referrer"/);
const worker = await readFile(resolve(output, 'sw.js'), 'utf8');
assert(!/__(CACHE_NAME|ASSETS|OFFLINE_URL)__/.test(worker), 'No unresolved build macros');
new vm.Script(worker);
const manifest = JSON.parse(await readFile(resolve(output, 'pwa-build.json'), 'utf8'));
assert(manifest.assets.includes(manifest.offline));
let rawBytes = 0, gzipBytes = 0;
for (const path of manifest.assets) { const source = await readFile(resolve(output, path.slice(1))); rawBytes += source.length; gzipBytes += gzipSync(source).length; }
assert(!(await readdir(output)).some(path => path.endsWith('.map')));
const receipt = { status: 'PASS', authority: 'local source-allowlist rehearsal only; Vercel linked source manifest remains unverified', directory, files: inventory, buildSeconds: (Date.now() - started) / 1000, publicCache: { count: manifest.assets.length, rawBytes, gzipBytes }, configurationChecks: ['missing env fails', 'HTTP provider fails', 'exact provider CSP', 'no-referrer', 'worker macros replaced', 'worker parses', 'all precache assets exist', 'no root source maps'] };
await writeFile('artifacts/phase7/source-package.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ status: receipt.status, files: paths.length, buildSeconds: receipt.buildSeconds, publicCache: receipt.publicCache }));
