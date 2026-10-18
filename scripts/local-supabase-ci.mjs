// Disposable local-stack lifecycle. Never links, restores, or contacts a hosted project.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, readdir, copyFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const execute = promisify(execFile);
const root = resolve('.cache/public-launch-supabase-ci');
const project = 'prism-public-launch-synthetic';
const network = 'prism-public-launch-loopback';
const mode = process.argv[2];
assert.ok(['prepare', 'start', 'stop'].includes(mode), 'Choose a local-stack lifecycle action');
assert.ok(root.startsWith(resolve('.cache') + '/'), 'Lifecycle directory must be inside the ignored cache');
assert.equal(process.platform, 'linux', 'This CI lifecycle requires a disposable Linux runner');
assert.ok(!process.env.PRISM_E2E_BASE_URL && !process.env.PRISM_E2E_STORAGE_STATE, 'Hosted test options are forbidden');
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(SUPABASE_|VITE_SUPABASE_|OPENAI_|RESEND_)/.test(name)));
const cli = async args => {
  try { return await execute('supabase', [...args, '--workdir', root], { env, maxBuffer: 8 * 1024 * 1024, timeout: 600_000 }); }
  catch (error) {
    await mkdir(root, { recursive: true });
    // Raw CLI output can contain local keys. It is never uploaded or printed.
    await writeFile(join(root, `private-${mode}-error.log`), String(error.stdout ?? '') + String(error.stderr ?? ''), { mode: 0o600 });
    throw new Error(`Local Supabase ${mode} command failed (exit ${error.code ?? 'unknown'}); private diagnostics retained outside the artifact allowlist`);
  }
};

if (mode === 'prepare') {
  await mkdir(root, { recursive: true });
  let alreadyInitialized = false;
  try { await access(join(root, 'supabase/config.toml')); alreadyInitialized = true; } catch { /* Fresh runner. */ }
  assert.equal(alreadyInitialized, false, 'Do not reuse any existing local Supabase database');
  await cli(['init', '--yes']);
  let config = await readFile(join(root, 'supabase/config.toml'), 'utf8');
  config = config.replace(/^project_id = .+$/m, `project_id = "${project}"`);
  const set = (section, key, value) => {
    const escaped = section.replaceAll('.', '\\.');
    const sectionPattern = new RegExp(`(\\[${escaped}\\]\\n)([\\s\\S]*?)(?=\\n\\[|$)`);
    assert.ok(sectionPattern.test(config), `Expected CLI configuration section ${section}`);
    config = config.replace(sectionPattern, (all, heading, body) => {
      const field = new RegExp(`^${key} = .+$`, 'm');
      assert.ok(field.test(body), `Expected CLI configuration field ${section}.${key}`);
      return heading + body.replace(field, `${key} = ${value}`);
    });
  };
  set('db', 'major_version', '17');
  set('db.seed', 'enabled', 'false');
  set('auth', 'site_url', '"http://127.0.0.1:5173"');
  set('auth', 'additional_redirect_urls', '["http://127.0.0.1:5173/?recovery=1"]');
  set('auth', 'minimum_password_length', '16');
  set('auth', 'password_requirements', '"lower_upper_letters_digits_symbols"');
  set('auth.rate_limit', 'email_sent', '100');
  set('auth.email', 'enable_confirmations', 'true');
  set('auth.email', 'secure_password_change', 'true');
  set('auth.email', 'max_frequency', '"1s"');
  set('auth.email', 'otp_expiry', '60');
  set('auth.mfa.totp', 'enroll_enabled', 'true');
  set('auth.mfa.totp', 'verify_enabled', 'true');
  config += '\n[auth.hook.custom_access_token]\nenabled = true\nuri = "pg-functions://postgres/prism_private/mfa_access_token_hook"\n';
  await writeFile(join(root, 'supabase/config.toml'), config);
  const files = (await readdir('supabase/migrations')).filter(name => /^\d{14}_[a-z0-9_]+\.sql$/.test(name)).sort();
  assert.equal(files.length, 19, 'Review any change to the migration chain before running this local stack');
  await mkdir(join(root, 'supabase/migrations'), { recursive: true });
  const chain = [];
  for (const name of files) {
    const content = await readFile(join('supabase/migrations', name));
    await copyFile(join('supabase/migrations', name), join(root, 'supabase/migrations', name));
    chain.push({ name, sha256: createHash('sha256').update(content).digest('hex') });
  }
  await mkdir('artifacts/public-launch', { recursive: true });
  await writeFile('artifacts/public-launch/local-supabase-chain.json', JSON.stringify({ project, hostedVerified: false, syntheticOnly: true, chain }, null, 2) + '\n');
  console.log(`Prepared isolated local Supabase project with ${files.length} reviewed schema migrations; no Auth fixture or customer seed copied.`);
} else {
  const config = await readFile(join(root, 'supabase/config.toml'), 'utf8');
  assert.ok(config.includes(`project_id = "${project}"`), 'Refuse lifecycle operations on a different project');
  try { await access(join(root, 'supabase/.temp/project-ref')); throw new Error('A hosted project link is forbidden'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (mode === 'stop') {
    await cli(['stop', '--no-backup']);
    console.log('Stopped only the disposable synthetic local Supabase project.');
  } else {
    await execute('docker', ['network', 'create', '--driver', 'bridge', '--opt', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', network], { env });
    await cli(['start', '--network-id', network, '--exclude', 'realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
    const containerIds = (await execute('docker', ['ps', '--filter', `label=com.supabase.cli.project=${project}`, '--format', '{{.ID}}'], { env })).stdout.trim().split('\n').filter(Boolean);
    assert.ok(containerIds.length >= 4, 'Actual local Supabase service containers must exist');
    const inspected = JSON.parse((await execute('docker', ['inspect', ...containerIds], { env, maxBuffer: 8 * 1024 * 1024 })).stdout);
    let bindings = 0;
    for (const container of inspected) {
      for (const values of Object.values(container.NetworkSettings.Ports ?? {})) {
        for (const binding of values ?? []) {
          assert.ok(['127.0.0.1', '::1'].includes(binding.HostIp), 'Every local Supabase published port must bind only to loopback');
          bindings++;
        }
      }
    }
    assert.ok(bindings >= 3, 'API, database and local SMTP sink must have verified loopback bindings');
    const status = JSON.parse((await cli(['status', '--output', 'json'])).stdout);
    assert.equal(new URL(status.API_URL).origin, 'http://127.0.0.1:54321', 'Refuse a non-local API');
    // Persist only the intended local anon/publishable key, never service-role or database credentials.
    const dbContainer=inspected.find(container=>container.Name===`/supabase_db_${project}`)?.Name.slice(1);
    assert.ok(dbContainer,'The inspected isolated database container is required for synthetic financial fixture preparation');
    await writeFile(join(root, 'client.json'), JSON.stringify({ api: status.API_URL, key: status.ANON_KEY ?? status.PUBLISHABLE_KEY, mail: 'http://127.0.0.1:54324',dbContainer }), { mode: 0o600 });
    const services = inspected.map(container => ({ name: container.Name.replace(/^\//, ''), image: container.Config.Image }));
    await writeFile('artifacts/public-launch/local-supabase-runtime.json', JSON.stringify({ observedAtUTC: new Date().toISOString(), cliVersion: (await execute('supabase', ['--version'], { env })).stdout.trim(), project, environment: 'isolated local Supabase containers on disposable Linux CI runner', hostedVerified: false, syntheticOnly: true, bindings, loopbackOnly: true, services }, null, 2) + '\n');
    console.log(`Started ${services.length} actual local Supabase services; all ${bindings} published port bindings are loopback-only. Keys and payloads are excluded from logs/artifacts.`);
  }
}
