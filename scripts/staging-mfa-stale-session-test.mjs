// Opt-in, bounded negative checks using explicitly labelled existing staging
// synthetic actors. No owner Google session, production URL or financial values.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';

const root = process.env.PRISM_SYNTHETIC_STAGING_FIXTURES;
assert.ok(root, 'Explicit private synthetic fixture directory is required');
const cfg = JSON.parse(await readFile(join(root, 'prism-staging-client.json'), 'utf8'));
assert.ok(cfg.projectRef === 'zwqcdfzfsudqccclficx' && cfg.url === 'https://zwqcdfzfsudqccclficx.supabase.co', 'Only isolated prism-staging is allowed');
const receipt = { at: new Date().toISOString(), projectRef: cfg.projectRef, environment: 'isolated hosted staging; existing synthetic A/B only', productionContacted: false, ownerGoogleLoginRepeated: false, financialValuesRead: false, checks: [], limitations: [] };
for (const name of ['a', 'b']) {
  const actor = JSON.parse(await readFile(join(root, `prism-staging-actor-${name}.json`), 'utf8'));
  assert.ok(/PRISM synthetic acceptance/i.test(actor.session?.user?.user_metadata?.username ?? '') && actor.userId === actor.session?.user?.id, 'Refuse an identity without explicit synthetic-fixture provenance');
  const client = createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  try {
    const refreshed = await client.auth.refreshSession({ refresh_token: actor.session.refresh_token });
    if (refreshed.error) { receipt.limitations.push({ actor: name, refreshCode: refreshed.error.code }); continue; }
    assert.ok(refreshed.data.user.id === actor.userId, 'Refresh must preserve the synthetic original identity');
    await mkdir('.cache/hosted-security', { recursive: true });
    await writeFile(resolve('.cache/hosted-security', `actor-${name}.json`), JSON.stringify({ ...actor, session: refreshed.data.session }), { mode: 0o600 });
    const state = await client.rpc('financial_access_status');
    assert.equal(state.error, null); assert.equal(state.data.allowed, false);
    const direct = await client.from('exact_accounts').select('id');
    assert.equal(direct.error, null); assert.equal(direct.data.length, 0);
    const denied = await client.from('financial_notes').insert({ user_id: actor.userId, title: 'Synthetic forbidden AAL1 write' });
    assert.equal(denied.error?.code, '42501');
    receipt.checks.push({ actor: name, originalIdentityPreserved: true, status: state.data.reason, directFinanceReadDenied: true, directFinanceWriteDenied: true });
  } finally { client.auth.stopAutoRefresh(); }
}
const anon = createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
assert.ok((await anon.rpc('financial_access_status')).error);
const response = await fetch(cfg.url + '/auth/v1/settings', { headers: { apikey: cfg.anonKey }, signal: AbortSignal.timeout(15_000) });
assert.equal(response.status, 200);
const settings = await response.json();
assert.equal(settings.mailer_autoconfirm, false);
assert.ok(settings.external.email === true && settings.external.google === true);
anon.auth.stopAutoRefresh();
receipt.confirmedEmailRequired = true;
receipt.emailAndGoogleRemainEnabled = true;
receipt.status = receipt.checks.length === 2 ? 'PASS' : 'PARTIAL';
receipt.limitations.push('Negative hosted stale-session checks do not prove fresh hosted enrollment, real CAPTCHA, mailbox delivery or positive Google MFA.');
await mkdir('artifacts/security', { recursive: true });
await writeFile('artifacts/security/hosted-stale-session-acceptance.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
