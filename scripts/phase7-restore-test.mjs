// Full cold physical snapshot/restore on a disposable native cluster, synthetic only.
// This does not establish managed PostgreSQL 17/PITR or cross-version compatibility.
import EmbeddedPostgres from 'embedded-postgres';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, mkdir, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { exerciseLedger, exerciseLedgerBoundaries } from './ledger-db-test.mjs';
const directory = await mkdtemp(join(tmpdir(), 'prism-phase7-restore-'));
const sourceDir = join(directory, 'source'), backupDir = join(directory, 'backup'), restoreDir = join(directory, 'restored');
const port = await new Promise(done => { const listener = createServer(); listener.listen(0, '127.0.0.1', () => { const port = listener.address().port; listener.close(() => done(port)); }); });
const password = randomUUID();
function cluster(databaseDir) {
  const server = new EmbeddedPostgres({ databaseDir, user: 'postgres', password, port, persistent: true, onLog: () => {}, onError: () => {} });
  if (process.platform === 'win32') server.stop = async () => {
    if (!server.process) return;
    if (server.process.exitCode === null) await new Promise((done, reject) => {
      const stop = spawn(resolve('node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe'), ['-D', databaseDir, '-m', 'fast', '-w', 'stop'], { stdio: 'ignore', windowsHide: true });
      stop.on('error', reject); stop.on('exit', code => code === 0 ? done() : reject(new Error('Fixture shutdown failed')));
    }); server.process = undefined;
  };
  return server;
}
async function snapshot(client) {
  await client.query('reset role');
  const tables = (await client.query("select schemaname,tablename from pg_tables where schemaname in ('public','auth','prism_private') order by 1,2")).rows;
  const rows = [];
  for (const table of tables) {
    const quote = identifier => `"${identifier.replaceAll('"', '""')}"`;
    // Keep numeric and timestamp text exactly; never parse financial JSON into numbers.
    const values = (await client.query(`select row_to_json(t)::text as exact from ${quote(table.schemaname)}.${quote(table.tablename)} t order by row_to_json(t)::text`)).rows.map(row => row.exact);
    rows.push({ schema: table.schemaname, table: table.tablename, count: values.length, sha256: createHash('sha256').update(JSON.stringify(values)).digest('hex') });
  }
  return rows;
}
let source = cluster(sourceDir), restored, client;
try {
  await source.initialise(); await source.start(); client = source.getPgClient('postgres', '127.0.0.1'); await client.connect();
  const bootstrap = await readFile('supabase/tests/auth-fixture.sql', 'utf8'); await client.query(bootstrap);
  const migrations = (await readdir('supabase/migrations')).filter(path => path.endsWith('.sql')).sort(); assert.equal(migrations.length, 19);
  for (const path of migrations) await client.query(await readFile(`supabase/migrations/${path}`, 'utf8'));
  const db = { exec: sql => client.query(sql), query: (sql, args) => client.query(sql, args) };
  await exerciseLedger(db); const before = await snapshot(client);
  assert(before.some(table => table.table === 'journals' && table.count > 0));
  await client.end(); client = null; await source.stop();
  await cp(sourceDir, backupDir, { recursive: true, errorOnExist: true, force: false });
  await source.start(); client = source.getPgClient('postgres', '127.0.0.1'); await client.connect();
  await client.query('delete from auth.users'); const destroyed = await snapshot(client);
  assert.notDeepEqual(destroyed, before, 'Synthetic erasure must change the source after backup');
  await client.end(); client = null; await source.stop();
  await cp(backupDir, restoreDir, { recursive: true, errorOnExist: true, force: false });
  restored = cluster(restoreDir); await restored.start(); client = restored.getPgClient('postgres', '127.0.0.1'); await client.connect();
  const after = await snapshot(client); assert.deepEqual(after, before, 'All public/Auth/private financial rows must restore exactly');
  await exerciseLedgerBoundaries({ exec: sql => client.query(sql), query: (sql, args) => client.query(sql, args) });
  await mkdir('artifacts/phase7', { recursive: true });
  await writeFile('artifacts/phase7/restore-rehearsal.json', JSON.stringify({ status: 'PASS', method: 'Clean shutdown; cold cluster snapshot; synthetic source erasure; restore to a separate fresh directory; exact full-table comparison and restored authorization probes', environment: 'disposable native PostgreSQL 18; loopback only', migrations: migrations.length, tables: before, hostedRestore: 'not tested', crossVersionRestore: 'not tested' }, null, 2));
  console.log(`PASS cold snapshot/restore: all ${before.length} public/Auth/private tables, ${migrations.length} migrations, exact financial text and restored owner/session/MFA boundaries`);
} finally { if (client) await client.end(); if (restored) await restored.stop(); await source.stop(); }
