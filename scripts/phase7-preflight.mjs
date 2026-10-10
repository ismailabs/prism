import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const required = '07901a6dabfa4696be25468f6de687c7619d171d';
assert.equal(git('rev-parse', 'HEAD'), required);
assert.equal(git('rev-parse', 'codex/phase6-analytics'), required);
assert.equal(git('status', '--porcelain', '--untracked-files=no'), '');
const commits = ['72da622305754328f02ec8f5d2ca8b71a221ee17', '78505b5bacc17a1b41c7b96c56e33c2d964e2a89', '7a92a4174455750869133dc6dc65828da08bcae0', '8290906deefd68f59e86e3e19f521e4882769bd5', '3eb8ee4572d84b458426e8a3a0e8f92f0d0fad74'];
for (const commit of commits) git('merge-base', '--is-ancestor', commit, required);
const integration = JSON.parse(await readFile('docs/phases1-4-committed-inventory.json', 'utf8'));
let integratedBlobs = 0;
for (const file of integration.files) if (file.gitBlob) {
  assert.equal(git('rev-parse', `7a92a4174455750869133dc6dc65828da08bcae0:${file.path}`), file.gitBlob, file.path);
  integratedBlobs++;
}
const sha = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex').toLowerCase();
let phase6Inputs = 0;
const manifest = JSON.parse(await readFile('docs/phase6-changed-files.json', 'utf8'));
for (const file of manifest.files) if (file.normalizedSha256 && !file.path.startsWith('docs/')) {
  assert.equal(sha(await readFile(file.path, 'utf8')), file.normalizedSha256.toLowerCase(), file.path);
  phase6Inputs++;
}
assert.equal(createHash('sha256').update(await readFile('package-lock.json')).digest('hex'), manifest.lockSha256);
const migrations = [];
for (const path of (await readdir('supabase/migrations')).filter(x => x.endsWith('.sql')).sort()) {
  const text = await readFile(`supabase/migrations/${path}`, 'utf8');
  assert.equal(sha(text), sha(git('show', `${required}:supabase/migrations/${path}`) + '\n'), path);
  migrations.push({ path, normalizedSha256: sha(text) });
}
assert.equal(migrations.length, 17);
const receipt = { required, actual: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), worktree: process.cwd(), cleanTrackedBeforeImplementation: true, initialUntracked: git('ls-files', '--others', '--exclude-standard'), commits, integrationProvenance: 'Phases 2–4 are content-integrated; accepted implementation Git blobs checked at their integration commit.', integratedBlobs, phase6Inputs, migrations, lockSha256: manifest.lockSha256, hostedActions: 'none' };
await mkdir('artifacts/phase7', { recursive: true });
await writeFile('artifacts/phase7/preflight.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ status: 'PASS', integratedBlobs, phase6Inputs, migrations: migrations.length, head: receipt.actual }));
