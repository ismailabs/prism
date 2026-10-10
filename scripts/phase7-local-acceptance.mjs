import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile, open, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
const npm = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const requested = process.argv.slice(2);
const gates = requested.length ? requested : ['typecheck', 'lint', 'test', 'build', 'test:db', 'test:platform-db', 'test:foundations-db', 'test:period-db', 'test:ledger-db', 'ledger:dry-run', 'test:ledger-review', 'test:ledger-preview', 'test:planning-db', 'test:integration-db', 'test:integration-review', 'test:goal-actions-db', 'test:actions-db', 'test:actions-native', 'test:actions-review', 'test:intelligence-db', 'test:intelligence-native', 'test:intelligence-review', 'test:postgres', 'test:restore', 'test:localization', 'test:pwa-review', 'test:release-package', 'test:e2e', 'test:pwa', 'test:responsive'];
if (process.env.PRISM_E2E_BASE_URL || process.env.PRISM_E2E_STORAGE_STATE) throw new Error('Hosted browser opt-ins forbidden in local acceptance');
const directory = `artifacts/phase7/gates-${Date.now()}`; await mkdir(directory, { recursive: true });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const files = [...new Set([...git('ls-files', '-z').split('\0'), ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0')])].filter(path => path && !path.startsWith('docs/')).sort();
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const inputs = []; for (const path of files) inputs.push({ path, sha256: hash(await readFile(path)) });
await writeFile(`${directory}/inputs.json`, JSON.stringify({ head: git('rev-parse', 'HEAD'), files: inputs }, null, 2));
const results = [];
for (const gate of gates) {
  const path = `${directory}/${gate.replaceAll(':', '-')}.log`, log = await open(path, 'w'), start = Date.now();
  const child = spawn(process.execPath, [npm, 'run', gate], { env: { ...process.env, VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'fixture-anon-key' }, stdio: ['ignore', log.fd, log.fd], windowsHide: true });
  const code = await new Promise((done, reject) => { child.once('error', reject); child.once('exit', code => done(code ?? 1)); });
  await log.close(); results.push({ command: `npm run ${gate}`, exitCode: code, seconds: (Date.now() - start) / 1000, path });
  await writeFile(`${directory}/results.json`, JSON.stringify({ environment: 'local Windows/Edge/native PostgreSQL/PGlite/PostgREST; synthetic only', results }, null, 2));
  console.log(`${code === 0 ? 'PASS' : 'FAIL'} ${gate} (${results.at(-1).seconds}s)`);
}
for (const input of inputs) if (hash(await readFile(input.path)) !== input.sha256) throw new Error(`Inputs changed during verification: ${input.path}`);
await writeFile('artifacts/phase7/latest-gates.json', JSON.stringify({ directory, inputsUnchanged: true, allPassed: results.every(result => result.exitCode === 0), results }, null, 2));
process.exitCode = results.some(result => result.exitCode !== 0) ? 1 : 0;
