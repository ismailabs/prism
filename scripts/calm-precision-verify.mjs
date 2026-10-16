// Local-only verification. Each receipt records the real exit code and timing.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { resolve, dirname } from 'node:path';

const group = process.argv[2] ?? 'core';
const groups = {
  core: ['typecheck', 'lint', 'test', 'build', 'test:localization'],
  database: ['test:db', 'test:platform-db', 'test:foundations-db', 'test:period-db', 'test:ledger-db', 'ledger:dry-run', 'test:ledger-review', 'test:planning-db', 'test:goal-actions-db', 'test:actions-db', 'test:integration-db', 'test:integration-review', 'test:deletion-security', 'test:intelligence-db', 'test:intelligence-review', 'test:actions-review'],
  native: ['test:postgres', 'test:actions-native', 'test:intelligence-native'],
  browser: ['test:e2e', 'test:auth-security', 'test:ledger-preview', 'test:pwa', 'test:responsive'],
  safety: ['test:pwa-review', 'test:restore', 'test:release-package'],
};
if (!(group in groups)) throw new Error(`Unknown verification group: ${group}`);
if (process.env.PRISM_E2E_BASE_URL || process.env.PRISM_E2E_STORAGE_STATE) throw new Error('Hosted browser configuration is forbidden for this local-only runner.');
const directory = resolve('artifacts/calm-precision', group);
await mkdir(directory, { recursive: true });
const env = { ...process.env, VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'fixture-anon-key' };
const receipts = [];
for (const name of groups[group]) {
  const started = Date.now();
  const log = createWriteStream(resolve(directory, `${name.replaceAll(':', '-')}.log`));
  const npmCli = process.env.npm_execpath ?? resolve(dirname(process.execPath), process.platform === 'win32' ? 'node_modules/npm/bin/npm-cli.js' : '../lib/node_modules/npm/bin/npm-cli.js');
  // Keep a core verification build separate from any running browser bundle.
  const args = name === 'build' ? ['run', name, '--', '--outDir', 'artifacts/calm-precision/build'] : ['run', name];
  const child = spawn(process.execPath, [npmCli, ...args], { env, windowsHide: true });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const code = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', done); });
  await new Promise(done => log.end(done));
  const receipt = { command: `npm run ${name}`, code, status: code === 0 ? 'PASS' : 'FAIL', seconds: (Date.now() - started) / 1000 };
  receipts.push(receipt);
  console.log(JSON.stringify(receipt));
  await writeFile(resolve(directory, 'receipts.json'), JSON.stringify(receipts, null, 2) + '\n');
}
if (receipts.some(receipt => receipt.code !== 0)) process.exitCode = 1;
