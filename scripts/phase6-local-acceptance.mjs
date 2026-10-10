import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile, open, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
const npm = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const requested = process.argv.slice(2);
const gates = requested.length ? requested : [
  'typecheck','lint','test','build','test:intelligence-db','test:intelligence-native','test:intelligence-review',
  'test:db','test:platform-db','test:foundations-db','test:period-db','test:ledger-db','ledger:dry-run','test:ledger-review',
  'test:planning-db','test:integration-review','test:goal-actions-db','test:actions-db','test:actions-native',
  'test:integration-db','test:postgres','test:ledger-preview','test:actions-review','test:e2e','test:responsive',
];
await mkdir('artifacts/phase6/gates',{recursive:true});
const files = [...new Set([...execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0'),
  ...execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0')])].filter(f=>f && !f.startsWith('docs/')).sort();
const inputs=[];
for(const path of files)inputs.push({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')});
await writeFile(`artifacts/phase6/verification-inputs-${requested.length?'remediation':'initial'}.json`,JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:inputs},null,2));
const results = [];
for (const gate of gates) {
  const path = `artifacts/phase6/gates/${gate.replaceAll(':','-')}.log`, log = await open(path,'w'), start = Date.now();
  const child = spawn(process.execPath,[npm,'run',gate],{stdio:['ignore',log.fd,log.fd],windowsHide:true});
  const code = await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',code=>done(code??1));});
  await log.close();results.push({command:`npm run ${gate}`,exitCode:code,seconds:(Date.now()-start)/1000,path});
  await writeFile(`artifacts/phase6/${requested.length?'remediation-results':'acceptance-results'}.json`,JSON.stringify({environment:'local Windows; synthetic isolated fixtures only',results},null,2));
  console.log(`${code===0?'PASS':'FAIL'} ${gate} (${results.at(-1).seconds}s)`);
}
process.exitCode = results.some(r=>r.exitCode!==0)?1:0;
