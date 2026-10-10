import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { reconcileHistory } from '../src/domain/ledger-reconciliation.ts';
// Offline input only. No URL, key, SQL adapter or apply mode exists.
const fixturePath = process.argv[2] ?? 'supabase/tests/ledger-history.synthetic.json';
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const report = reconcileHistory(fixture);
await mkdir('artifacts/phase2', { recursive: true });
await writeFile('artifacts/phase2/reconciliation.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, comparisons: undefined, balanceSheets: undefined }, null, 2));
if (!report.accepted) process.exitCode = 1;
