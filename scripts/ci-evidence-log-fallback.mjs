import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// This job is fixture-only. Keep a required log copy of machine-readable
// evidence so the RM0 artifact storage cap cannot erase verification receipts.
for (const name of ['PRISM_E2E_BASE_URL', 'PRISM_E2E_STORAGE_STATE']) {
  assert.ok(!process.env[name], 'Hosted data must never enter CI evidence');
}
const files = [
  'artifacts/security/mandatory-mfa-db.json',
  'artifacts/integration/migration-verification.json',
  'artifacts/integration/adversarial-rollover.json',
  'artifacts/phase2/final-review-probes.json',
  'artifacts/phase2/reconciliation.json',
  'artifacts/phase5/native-verification.json',
  'artifacts/responsive-checks.json',
  'artifacts/phase7/pwa-cache-inventory.json',
  'artifacts/phase7/restore-rehearsal.json',
  'artifacts/public-launch/large-report.json',
];
const logs = (await readdir('artifacts/ci')).filter(name => /^[a-z0-9-]+\.log$/.test(name));
assert.ok(logs.includes('commit.log') && logs.includes('local-only.log'), 'Fixture-only evidence identity is required');
for (const name of logs.sort()) {
  const bytes = await readFile(`artifacts/ci/${name}`);
  console.log(JSON.stringify({ evidenceLog: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }));
}
for (const path of files) {
  let bytes;
  try { bytes = await readFile(path); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.log(JSON.stringify({ evidenceFile: path, unavailableAfterEarlierFailure: true }));
    continue;
  }
  assert.ok(bytes.length <= 1024 * 1024, 'Unexpectedly large fixture receipt');
  const receipt = JSON.parse(bytes.toString('utf8'));
  console.log(JSON.stringify({ evidenceFile: path, sha256: createHash('sha256').update(bytes).digest('hex'), receipt }));
}
console.log('Fixture receipts retained in required Actions logs; optional binary artifact storage remains separate.');
