// Preserve the complete Playwright catalog while releasing all runner/browser
// memory between spec files on constrained Windows hosts. No retries or relaxed
// assertions/deadlines; Linux and explicit CLI filters retain normal behavior.
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const cli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));
const arguments_ = process.argv.slice(2);
const plain = value => value.replace(/\x1b\[[0-9;]*m/g, '');
async function run(args, path, quiet = false) {
  const log = path ? createWriteStream(path) : null;
  const child = spawn(process.execPath, [cli, 'test', ...args], { windowsHide: true, env: process.env });
  let output = '';
  for (const [stream, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) stream.on('data', chunk => {
    output += chunk.toString(); log?.write(chunk); if (!quiet) destination.write(chunk);
  });
  const code = await new Promise((done, reject) => { child.once('error', reject); child.once('close', done); });
  if (log) await new Promise(done => log.end(done));
  return { code, output: plain(output) };
}

if (process.platform !== 'win32' || arguments_.length || process.env.PRISM_E2E_BASE_URL) {
  process.exitCode = (await run(arguments_)).code ?? 1;
} else {
  const directory = resolve('artifacts/calm-precision/browser-files');
  await mkdir(directory, { recursive: true });
  const inventory = await run(['--list'], resolve(directory, 'collection.log'), true);
  assert.equal(inventory.code, 0, 'Complete test collection must succeed');
  const total = inventory.output.match(/Total:\s+(\d+) tests in (\d+) files/);
  assert(total, 'An actual Playwright collection summary is required');
  const files = new Map();
  for (const line of inventory.output.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:\[[^\]]+\]\s*›\s*)?(.+?\.spec\.ts):\d+:\d+\s*›/);
    if (match) files.set(match[1], (files.get(match[1]) ?? 0) + 1);
  }
  assert.equal(files.size, Number(total[2]), 'Every collected file must be represented');
  assert.equal([...files.values()].reduce((sum, count) => sum + count, 0), Number(total[1]));
  console.log(`Windows: ${total[1]} collected tests in ${total[2]} spec files, each with a fresh Playwright process. Limits and assertions unchanged.`);
  const started = Date.now(), receipts = [];
  for (const [file, expected] of files) {
    const target = resolve('e2e', file), within = relative(resolve('e2e'), target);
    assert(!isAbsolute(within) && within !== '..' && !within.startsWith('../') && !within.startsWith('..\\'), 'Collected spec must remain in e2e');
    const log = resolve(directory, file.replaceAll(/[\\/]/g, '-') + '.log');
    const began = Date.now();
    const result = await run([relative(process.cwd(), target).replaceAll('\\', '/'), '--output', resolve(directory, file.replaceAll(/[\\/]/g, '-') + '-results')], log);
    const summary = [...result.output.matchAll(/\n\s+(\d+) passed \(/g)].at(-1);
    const passed = summary ? Number(summary[1]) : 0;
    const receipt = { file, expected, passed, code: result.code, status: result.code === 0 && passed === expected ? 'PASS' : 'FAIL', seconds: (Date.now() - began) / 1000, log: relative(process.cwd(), log).replaceAll('\\', '/') };
    receipts.push(receipt);
    await writeFile(resolve(directory, 'receipts.json'), JSON.stringify({ collectedTests: Number(total[1]), collectedFiles: files.size, files: receipts }, null, 2) + '\n');
    console.log(JSON.stringify(receipt));
  }
  const failed = receipts.filter(receipt => receipt.status !== 'PASS');
  const passed = receipts.reduce((sum, receipt) => sum + receipt.passed, 0);
  if (failed.length) {
    console.error(`${failed.length} spec files failed; ${passed}/${total[1]} tests passed. All file exits and logs retained.`);
    process.exitCode = 1;
  } else {
    assert.equal(passed, Number(total[1]));
    console.log(`\n  ${passed} passed (${((Date.now() - started) / 60000).toFixed(1)}m) — complete catalog, ${files.size} fresh processes`);
  }
}
