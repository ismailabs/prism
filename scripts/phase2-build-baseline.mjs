// Reconstruct application DDL from the observed live metadata, never legacy SQL.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const path = process.argv[2];
if (!path) throw new Error('Pass the private schema-inspection.json path.');
const s = JSON.parse(await readFile(path, 'utf8'));
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const lines = ['-- Observed live application baseline, 2026-09-28. Requires Supabase auth schema/roles.', '-- For isolated replay only; existing production is already at this baseline.', 'create schema if not exists prism_private;', 'revoke all on schema prism_private from public, anon, authenticated;', 'grant usage on schema prism_private to authenticated;'];
const tables = [...new Set(s.columns.map(c => `${c.table_schema}.${c.table_name}`))];
for (const table of tables) {
  const columns = s.columns.filter(c => `${c.table_schema}.${c.table_name}` === table);
  lines.push(`create table ${table} (\n${columns.map(c => `  ${quote(c.column_name)} ${c.data_type === 'numeric' ? `numeric(${c.numeric_precision},${c.numeric_scale})` : c.data_type}${c.column_default ? ` default ${c.column_default}` : ''}${c.is_nullable === 'NO' ? ' not null' : ''}`).join(',\n')}\n);`);
}
for (const c of [...s.constraints].sort((a,b) => Number(a.definition.startsWith('FOREIGN'))-Number(b.definition.startsWith('FOREIGN')))) lines.push(`alter table ${c.table} add constraint ${quote(c.name)} ${c.definition};`);
for (const i of s.indexes) if (!s.constraints.some(c=>c.name===i.indexname)) lines.push(i.indexdef+';');
for (const f of s.functions.filter(f=>f.schema==='prism_private')) lines.push(f.definition+';');
for (const f of s.functions.filter(f=>f.schema==='public' && f.name!=='rls_auto_enable')) lines.push(f.definition+';');
for (const t of s.triggers) lines.push(t.definition+';');
for (const table of tables) lines.push(`alter table ${table} enable row level security;`, `revoke all on ${table} from public, anon, authenticated;`);
for (const p of s.policies) lines.push(`create policy ${quote(p.policyname)} on ${p.schemaname}.${p.tablename} as ${p.permissive} for ${p.cmd} to ${p.roles.map(quote).join(',')}${p.qual?` using (${p.qual})`:''}${p.with_check?` with check (${p.with_check})`:''};`);
lines.push('grant select on public.profiles to authenticated;', 'grant update(username,currency,language,theme) on public.profiles to authenticated;', 'grant select,insert,update,delete on public.categories,public.payment_methods,public.transactions to authenticated;', 'revoke all on all functions in schema prism_private from public,anon,authenticated;', 'grant execute on function prism_private.session_allowed(),prism_private.delete_own_account() to authenticated;', 'revoke all on function public.delete_own_account() from public,anon;', 'grant execute on function public.delete_own_account() to authenticated;');
await mkdir('supabase/baseline',{recursive:true});
await writeFile('supabase/baseline/phase1-observed.sql',lines.join('\n')+'\n');
console.log('Saved observed baseline DDL without user records.');
