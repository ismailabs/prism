# Phase 2 controlled staging rehearsal — proposed commands

**Status: hosted execution remains blocked and unexecuted, 10 October 2026.**
B1 (timestamp precision) and B2 (NULL guard) are repaired locally; local acceptance
is GO after all requested gates passed, with actual
SQL/HTTP regressions; see `phase2-p1-remediation.md` for full gates and local
acceptance. Independent review of the corrected tree remains required. Commands
in this document are a review packet, not permission to execute them. No approved
staging project, restore target or hosted test users have been supplied.
Production `hyhsppiitijkuvpyswce` must never be a mutation target for this plan.

## 0. Required approval and evidence before execution

Record the approver, operator, maintenance window, approved source commit/tree
hashes, staging project/ref/organization, restore project/ref, data scope, costs
and stop owner. Approve schema application, synthetic Auth users/MFA lifecycle,
synthetic finance writes and the restore exercise separately and explicitly.
No production export, clone or production credentials are needed or allowed.

Prerequisites:

1. B1/B2 repairs independently reviewed and all local gates green. Corrected
   ledger SHA-256 (uncommitted candidate):
   `0C89AD1DE837CB7ED79F9A0C0042939E1FAA05B7593A96B02A049720CAB840FE`.
   Recompute it and freeze the complete approved tree before any authorized run.
   This hash is evidence, not authorization to apply the file.
2. An isolated **synthetic-only Supabase PostgreSQL 17 staging project** with
   prerequisite schema/history already approved and verified through
   `20261009162324_protect_debt_repayment_history.sql`. If it is empty, establishing
   the prior local chain is a separate reviewed prerequisite packet. Never point
   an empty-project replay/reset at an existing financial project.
3. Schema comparison proves local prerequisite function definitions, constraints,
   policies, grants, Auth deletion overload and exact views match staging.
   Existing production history has three documented timestamp differences; no
   migration repair/normalization is part of this plan. If staging uses that
   different catalog, stop and prepare a target-specific forward manifest.
4. Managed Auth test users A and B belong only to staging, have actual current
   sessions, and A can enroll/verify MFA. Operator supplies staging-only tokens
   through private process environment; no service-role token used for client
   acceptance. No forged JWT accepted as a substitute for managed Auth tests.
5. Private schema `prism_private` is not an exposed Data API schema; public API
   configuration, default grants, function owners and transaction isolation
   recorded. Authenticated must have required private schema USAGE. Definer owner
   privileges must be narrowly reviewed; default request isolation READ COMMITTED.
6. Snapshot recovery point, retention, restore availability, encryption/access
   control and a separately approved restore target verified. Backup presence is
   not restore proof. Storage files, provider settings, keys and external services
   have independent recovery boundaries. Define RTO/RPO targets before exercise.
7. Node 24, locked dependencies, pinned Supabase CLI, PostgreSQL 17 client tools,
   a secure `prism_phase2_stage` libpq service/passfile configuration, and separate
   `prism_phase2_restore` configuration supplied by operator. Verify service hosts
   against the approved project refs privately; do not dump credentials/log URLs.

The local commands below do not take hosted URLs. Commands marked STAGING WRITE
must remain unexecuted until all approval and prerequisite gates pass.

## 1. Freeze local evidence and verify prerequisites

Run serially; this workstation has previously exhausted memory under overlapping
browser/database work. Abort on an unexpected changed file or new failure.

```powershell
git branch --show-current
git rev-parse HEAD
git status --short
git diff --check
Get-FileHash -Algorithm SHA256 -LiteralPath supabase/migrations/20261009220402_shadow_double_entry_ledger.sql
node --version
npm --version
npm run typecheck
npm run lint
npm run test -- src/domain/accounting.test.ts
node scripts/phase2-review-probes.mjs
npm run test:ledger-preview
```

Expected after repair: all commands exit 0; all five review probe cases PASS.
At the reviewed tree, probes exit **1** with four failures. Do not override that
failure, delete the probes or label it expected acceptance. The five cases are
one normal baseline, three temporal assertions and one scalar NULL guard check.
Scalar success alone cannot close B2: actual RPC denial coverage is also required.

After separate authorization for isolated local replay following the repair:

```powershell
npm run test:ledger-db
npm run ledger:dry-run
$env:PGRST_TEST_BINARY = 'C:\Users\moham\source\prism-finance-baseline\.cache\postgrest\postgrest.exe'
npm run test:postgres
```

These scripts replay application migrations only in fresh synthetic local engines;
the native harness starts PostgreSQL 18 and loopback PostgREST. Never modify them
to point to staging. Their PASS does not close managed PG17/Auth gates.
Repeat broader Phase 1 gates/CI only if repairs touch shared money/security code,
new failures appear, or the integration base changes. Retain exact outputs.

## 2. Staging identity and catalog inspection — READ ONLY

Set `$stageRef` to the separately approved value. An explicit ref is required;
never rely on an inherited linked project or on GitHub main identifying production.

```powershell
$stageRef = $env:PRISM_PHASE2_APPROVED_STAGE_REF
if ([string]::IsNullOrWhiteSpace($stageRef) -or $stageRef -eq 'hyhsppiitijkuvpyswce') {
  throw 'An approved isolated staging ref is required.'
}
npx --yes supabase@2.117.0 db push --help
psql 'service=prism_phase2_stage' -X -v ON_ERROR_STOP=1 -c "select current_database(),current_setting('server_version'),current_setting('default_transaction_isolation');"
psql 'service=prism_phase2_stage' -X -v ON_ERROR_STOP=1 -c "select version,name from supabase_migrations.schema_migrations order by version;"
psql 'service=prism_phase2_stage' -X -v ON_ERROR_STOP=1 -c "select to_regclass('public.financial_events'),to_regclass('public.ledger_accounts'),to_regprocedure('prism_private.session_allowed()'),to_regprocedure('public.delete_own_account(text)');"
```

Expected: PG17, read committed, ledger objects absent, session helper and confirmed
self-deletion wrapper present, Phase 1 guard present. Verify the libpq service
hostname **separately**; SQL database name alone does not prove project identity.
Match Dashboard/connector project name/ref/organization/host with the approval.

Save and review this catalog query through the same service (operator can put it
in an ignored private evidence SQL file and use `psql -f`):

```sql
begin transaction read only;
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),
       p.prosecdef,p.proconfig,pg_get_userbyid(p.proowner),p.proacl,
       pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','prism_private') and p.proname in
 ('session_allowed','delete_own_account','validate_link','validate_debt_edit',
  'protect_debt_repayment_history');
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public' order by tablename,policyname;
select n.nspname,c.relname,c.reloptions,c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname like 'exact_%' order by c.relname;
select conrelid::regclass,conname,pg_get_constraintdef(oid)
from pg_constraint where conrelid in
 ('public.accounts'::regclass,'public.person_debts'::regclass,
  'public.objectives'::regclass,'public.debt_repayments'::regclass,
  'public.objective_contributions'::regclass);
select n.nspname,pg_get_userbyid(d.defaclrole),d.defaclobjtype,d.defaclacl
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace;
select has_schema_privilege('authenticated','prism_private','USAGE');
commit;
```

Expected: reviewed equivalent definitions and grants; no callable obsolete
unconfirmed erasure overload; no privileged reporting view; exact text monetary
columns; consistent owner/currency links. Dashboard Data API schema list must
exclude `prism_private`. Unexpected signatures/privileges are a stop, not a reason
to relax checks or automatically repair history. Archive synthetic legacy counts
and exact checksums before application and compare afterwards while writers are
quiescent. Do not read production records for this step.

## 3. Snapshot and one-file migration proposal

Use the approved staging project's Dashboard **Database → Backups** to record
available recovery points and the approved pre-change snapshot. Record exact UTC
time, provider backup identifier, retention and restore capability. If no supported
restorable snapshot exists, stop; purchasing backup/PITR or creating a project
requires separate authorization. For a supplemental encrypted local backup of
staging only, after explicit approval:

```powershell
# STAGING READ / LOCAL SENSITIVE FILE WRITE; private directory supplied by operator.
pg_dump --dbname='service=prism_phase2_stage' --format=custom --file="$env:PRISM_PHASE2_PRIVATE_BACKUP_FILE"
pg_restore --list "$env:PRISM_PHASE2_PRIVATE_BACKUP_FILE"
Get-FileHash -LiteralPath $env:PRISM_PHASE2_PRIVATE_BACKUP_FILE -Algorithm SHA256
```

Expected: exit 0, complete reviewed scope including managed Auth and grants where
permissions permit. A logical dump missing required managed objects is supplemental
only and cannot establish full Supabase recovery. Never restore with blind
`--clean`, drop Auth schemas, or omit grants as a convenient substitute.

The CLI help was checked during this review. The pinned CLI supports the following
flags; help must be rechecked if the version changes. Use the full local migration
directory only when step 0's staging history parity is established:

```powershell
# READ-ONLY PROPOSAL; do not run until target authorization is recorded.
npx --yes supabase@2.117.0 db push --project-ref $stageRef --skip-vault --dry-run
```

Expected pending set: **only the repaired**
`20261009220402_shadow_double_entry_ledger.sql`. If Phase 1 or any baseline/old
version appears, stop. No `--include-all`, history repair, baseline replay, reset,
role/seed inclusion or Vault change is allowed here. Have a second operator verify
the ref, pending list and approved file hash before the proposed application:

```powershell
# STAGING WRITE — ONLY after explicit separate approval and B1/B2 closure.
npx --yes supabase@2.117.0 db push --project-ref $stageRef --skip-vault
```

Expected: one successful atomic migration; new version recorded exactly once.
On any error, stop and inspect catalog before retrying. The file is transactional;
lock timeout or statement error must leave no partial ledger objects/version.
CLI dry-run and application both remain unexecuted by this review.

## 4. Post-application schema/security queries

```powershell
# READ ONLY, approved synthetic staging only.
psql 'service=prism_phase2_stage' -X -v ON_ERROR_STOP=1 -c "select version,name from supabase_migrations.schema_migrations where version='20261009220402';"
psql 'service=prism_phase2_stage' -X -v ON_ERROR_STOP=1 -f scripts/phase2-staging-validation.sql
```

Expected query-pack results:

- Exactly five RLS-enabled ledger tables and two `security_invoker=true` views.
- Ten ledger policies: owner SELECT + restrictive session per table.
- Exactly two new private write definers; public wrappers invoker. All new
  function search paths empty. Trigger helpers have no authenticated/anon EXECUTE;
  auth can execute the two private/public entry pairs; anon cannot.
- Authenticated SELECT only on seven tables/views; all INSERT/UPDATE/DELETE/
  TRUNCATE false. Anonymous has none. PUBLIC function grants also absent.
- Five immutable triggers, three posting-insert seals and one enabled, deferred
  completeness trigger. Review full FK definitions for owner/currency alignment.
- Both view amount columns and `exact_ledger_lines.occurred_at` are text. Timestamp
  transport must be UTC ISO text with exactly six fractional digits; never use
  a PostgreSQL driver's Date parser for authoritative comparisons. All anomaly
  queries return **zero rows**.
- Native balance-sheet differences exactly zero. Before fixtures, no financial
  totals/rows are expected. This is not a cross-user HTTP test.

Re-read actual definer guards and helper definition after migration; require a
positive TRUE authorization result. Inspect service_role/operator grants too:
they are trusted boundaries and must never be substituted for client tokens.
Recompare legacy definitions, counts and checksums with step 2: **no change**.

## 5. Managed HTTP synthetic rehearsal

Operator supplies `$env:PRISM_PHASE2_STAGE_TOKEN_A` and `_B` from real staging
sessions, and A's synthetic goal UUID through `_GOAL_A`. Do not create users/goals
on any other target. A first uses a normal current session with no MFA enrollment;
later repeat with a real verified factor and AAL2. Tokens are never printed or
stored in committed files. This reusable PowerShell snippet guards the API host:

```powershell
$stageApi = "https://$stageRef.supabase.co/rest/v1"
if ($stageRef -eq 'hyhsppiitijkuvpyswce' -or
    [string]::IsNullOrWhiteSpace($env:PRISM_PHASE2_STAGE_TOKEN_A)) { throw 'Invalid rehearsal target/session.' }
$stageHeadersA = @{ Authorization="Bearer $env:PRISM_PHASE2_STAGE_TOKEN_A"; apikey=$env:PRISM_PHASE2_STAGE_PUBLIC_KEY }
$stageHeadersB = @{ Authorization="Bearer $env:PRISM_PHASE2_STAGE_TOKEN_B"; apikey=$env:PRISM_PHASE2_STAGE_PUBLIC_KEY }
function Invoke-StageRpc([string]$name,[hashtable]$body,[hashtable]$headers) {
  Invoke-RestMethod -Method Post -Uri "$stageApi/rpc/$name" -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 12 -Compress)
}
function New-StageAccount([string]$code,[string]$classification) {
  Invoke-StageRpc 'create_ledger_account' @{p=@{code=$code;classification=$classification;currency='MYR'}} $stageHeadersA
}
function New-StageLine([string]$id,[string]$side,[string]$amount) { @{account_id=$id;side=$side;amount=$amount} }
function Send-StageEvent([string]$key,[string]$kind,[object[]]$lines,[hashtable]$extra=@{}) {
  $p = @{request_key=$key;kind=$kind;currency='MYR';occurred_at='2000-02-01T00:00:00Z'}
  if ($null -ne $lines) { $p.lines=$lines }
  foreach ($field in $extra.Keys) { $p[$field]=$extra[$field] }
  Invoke-StageRpc 'post_ledger_event' @{p=$p} $stageHeadersA
}
# STAGING WRITES — separately authorized synthetic user only.
$cash = New-StageAccount 'rehearsal:cash' 'asset'
$savings = New-StageAccount 'rehearsal:savings' 'asset'
$income = New-StageAccount 'rehearsal:income' 'income'
$expense = New-StageAccount 'rehearsal:expense' 'expense'
$loan = New-StageAccount 'rehearsal:loan' 'liability'
$card = New-StageAccount 'rehearsal:card' 'liability'
$equity = New-StageAccount 'rehearsal:equity' 'equity'
$salaryLines = @((New-StageLine $cash 'debit' '5000.00'),(New-StageLine $income 'credit' '5000.00'))
$salaryId = Send-StageEvent 'stage:salary' 'salary' $salaryLines
$retryId = Send-StageEvent 'stage:salary' 'salary' $salaryLines
if ($salaryId -ne $retryId) { throw 'Retry created a second receipt.' }
$groceryId = Send-StageEvent 'stage:grocery' 'expense' @((New-StageLine $expense 'debit' '100.00'),(New-StageLine $cash 'credit' '100.00'))
$transferId = Send-StageEvent 'stage:transfer' 'transfer' @((New-StageLine $savings 'debit' '500.00'),(New-StageLine $cash 'credit' '500.00'))
$openingId = Send-StageEvent 'stage:loan-opening' 'opening' @((New-StageLine $equity 'debit' '1000.00'),(New-StageLine $loan 'credit' '1000.00'))
$paymentId = Send-StageEvent 'stage:loan-payment' 'loan_payment' @((New-StageLine $loan 'debit' '480.00'),(New-StageLine $expense 'debit' '120.00'),(New-StageLine $cash 'credit' '600.00'))
$purchaseId = Send-StageEvent 'stage:card-purchase' 'expense' @((New-StageLine $expense 'debit' '80.00'),(New-StageLine $card 'credit' '80.00'))
$settlementId = Send-StageEvent 'stage:card-settlement' 'card_settlement' @((New-StageLine $card 'debit' '80.00'),(New-StageLine $cash 'credit' '80.00'))
$earmarkId = Send-StageEvent 'stage:earmark' 'goal_earmark' $null @{goal_id=$env:PRISM_PHASE2_STAGE_GOAL_A;allocation_amount='200.00'}
$fundingId = Send-StageEvent 'stage:goal-transfer' 'goal_transfer' @((New-StageLine $savings 'debit' '100.00'),(New-StageLine $cash 'credit' '100.00')) @{goal_id=$env:PRISM_PHASE2_STAGE_GOAL_A;allocation_amount='100.00'}
$refundId = Send-StageEvent 'stage:refund' 'refund' @((New-StageLine $cash 'debit' '20.00'),(New-StageLine $expense 'credit' '20.00'))
$reverseId = Send-StageEvent 'stage:reverse-refund' 'reversal' $null @{reverses_event_id=$refundId}
Invoke-RestMethod -Method Get -Uri "$stageApi/exact_ledger_lines?event_id=eq.$salaryId&select=side,amount&order=ordinal" -Headers $stageHeadersA
Invoke-RestMethod -Method Get -Uri "$stageApi/exact_ledger_lines?event_id=eq.$salaryId&select=side,amount" -Headers $stageHeadersB
```

Expected A read: two strings `5000.00`, debit and credit. B read: empty array.
Smoke user totals: **11 events, 10 journals, 21 lines, 2 allocations**; MYR cash
3620, savings 600, assets 4220, liability 520, equity/net worth 3700, income 5000,
expenses 300, profit 4700, allocation total 300. Each event freezes A's profile
timezone/date. Raw signed liability is -520. Legacy transaction count unchanged.
These totals assume no other postings on this dedicated smoke user.

Run the query pack again, then inspect genuine period flows:

```sql
select e.user_id,e.currency,a.classification,
       sum(case when l.side='debit' then l.amount else -l.amount end)::text as signed
from public.journal_lines l join public.journals j on j.id=l.journal_id
join public.financial_events e on e.id=j.event_id
join public.ledger_accounts a on a.id=l.account_id
where e.financial_date between '2000-02-01' and '2000-02-29'
and a.classification in ('income','expense')
group by e.user_id,e.currency,a.classification;
select user_id,currency,sum(amount*direction)::text as allocated
from public.ledger_allocations group by user_id,currency;
```

Expected income signed -5000 and expense +300 for smoke user; no transfer,
principal or earmark spending. Repeat separate synthetic owners/currencies for
USD/EUR/JPY, with `90071992547409.93` and JPY `9007199254740993`: HTTP amounts must
be strings, exactly unchanged. Never sum native currencies together.

## 6. Negative, atomicity, concurrency and Auth matrix

Reuse the same explicit payloads/tokens and save sanitized status/code/count
evidence. Do not use the service role for client cases. Before/after counts must
cover events, journals, lines and allocations. No failed operation may add rows.

| Test | Exact expectation |
| --- | --- |
| Same `stage:salary` key, replace both amounts with `5001.00` | HTTP 409 / 23505; original ID and all rows unchanged |
| New key, debit 10 / credit 9 | Error; no receipt or child rows |
| Amount as JSON number, MYR `1.001`, JPY `1.01`, zero/negative, mixed currency account, foreign-owner account/goal | Error; zero new rows |
| Date `2999-01-01T00:00:00Z`, date without offset | Error; no posted future record |
| Seven fractional digits (including all zeros), invalid calendar date, leap second, `24:00`, offset beyond `15:59` | Error before timestamp rounding; no new rows |
| Valid owned event at `2000-02-29T23:59:59.000099+08:00` | Read exact view timestamp `2000-02-29T15:59:59.000099Z`; retry returns same ID |
| Missing/invalid account, 65 lines, same-asset transfer, allocation unequal to goal funding | Error; no new rows |
| Loan principal 521 after smoke fixture, card payment 1 after full settlement | Error / cap; loan remains 520, card 0 |
| Direct authenticated INSERT/UPDATE/DELETE on ledger tables | 403 permission denial; no mutation |
| Anonymous requests, B reading A event, B posting A account IDs | Anon 401/403, B SELECT 200 `[]`, B posting error, zero new rows |
| Revoked/expired session; wrong-owner session; anonymous sign-in | Denied RPC; no private rows. HTTP gateway may reject earlier than SQL. |
| A with verified MFA factor and AAL1; missing/null/invalid aal white-box context | Denied RPC and SELECT; zero rows. Managed AAL2 succeeds. |
| Repeat full reversal, changed reverse key, reverse a reversal | Same-key returns ID; second inverse/double inverse rejects; original trail intact |
| Reverse earmark and goal-transfer | Allocation reverses sign; goal-transfer also reverses cash legs; no spending |
| Ordinary privileged UPDATE/DELETE; add line in a later transaction | Immutable/seal errors. Privileged DDL/TRUNCATE are outside these protections. |
| Incomplete event in explicit synthetic transaction | Deferred completeness rejects COMMIT; rollback leaves zero event/children |
| Deliberately abort after a successful RPC before COMMIT, then retry same key | Rollback removes receipt; retry produces exactly one committed posting |

To perform B2 white-box testing, an approved privileged staging SQL operator can
simulate claims in a transaction, using A's **actual** owner/session and verified
factor, and roll back. This is a function-boundary test, not a forged-token HTTP
test. Store the following in an ignored private SQL file; pass owner/session
variables privately with psql. Expected SQLSTATE 42501 and no persisted account:

```sql
begin;
select set_config('request.jwt.claims',jsonb_build_object(
 'sub',:'owner','session_id',:'session','role','authenticated','is_anonymous',false
)::text,true);
set local role authenticated;
select public.create_ledger_account('{"code":"stage:null-aal","classification":"asset","currency":"MYR"}'::jsonb);
rollback;
```

Also test posting with a new request key and valid owned line IDs under that
context. Explicit null aal must behave identically. ON_ERROR_STOP/connection close
must roll back after the expected rejection. Inspect zero matching rows as admin.

For real concurrency, use **two independent psql connections**, never two calls
on one client. Set staging-synthetic claims in each, with actual owned sessions;
`SET LOCAL ROLE authenticated` inside each transaction. Session A:

```sql
begin;
-- set_config(actual owned claims,true), set local role authenticated
select public.post_ledger_event(:'exact_same_payload'::jsonb);
-- Leave transaction open until B is observed waiting; then COMMIT.
```

Session B sends the same payload/key. Admin confirms a Lock wait in
`pg_stat_activity` for B's known PID before A commits. B must return A's ID; count
one. Repeat with changed payload (409/23505), two distinct reversal keys (one
inverse), and two distinct loan-payment keys of 400 against remaining 520 (one
payment, second cap error). Do not use arbitrary sleeps as proof of a race.
After the cap race, remaining principal is 120. Keep these race fixtures on a
separate user or record that smoke totals have changed.

Verify current-session revocation, actual MFA enrollment/challenge/AAL2 and the
confirmed self-erasure RPC using a **separate disposable staging test user**.
Wrong confirmation must fail; verified AAL2 + `confirmation:'DELETE'` removes
Auth user and all five ledger tables' rows. This deletes the user permanently and
requires the specific synthetic-user deletion authorization. Record the erasure
overload/signature used and verify no cross-user changes.

## 7. Historical synthetic rehearsal and reconciliation thresholds

Use a separate owner from the HTTP smoke fixture. The current translator has no
hosted adapter/apply mode: **do not point `exerciseHistoricalLedger` or `replay`
at staging**. An approved staging fixture loader must use managed Auth-owned user
IDs, insert the committed synthetic legacy rows only, obtain approved opening
instants, map chart IDs through RPC, and post translated payloads in sorted order.
Review that loader as a separate small packet before any hosted use. Its absence
is an explicit rehearsal prerequisite, not permission to invent a production
exporter or use service-role writes as client qualification.

The same fixture can be checked offline at exact checkpoints without database
application. Archive each report; the CLI's default artifact path overwrites:

```powershell
$checkpointTimes = @('2000-01-01T00:00:00Z','2000-02-02T00:00:00Z','2000-02-04T00:00:00Z','2000-02-06T00:00:00Z','2000-02-29T15:59:59Z')
$checkpointNumber = 0
foreach ($checkpoint in $checkpointTimes) {
  $checkpointNumber++
  $fixture = Get-Content -Raw supabase/tests/ledger-history.synthetic.json | ConvertFrom-Json
  $fixture.cutoff = $checkpoint
  $fixturePath = "artifacts/phase2/checkpoint-$checkpointNumber.synthetic.json"
  $fixture | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8NoBOM -LiteralPath $fixturePath
  node scripts/ledger-dry-run.mjs $fixturePath
  if ($LASTEXITCODE -ne 0) { throw "Checkpoint $checkpointNumber rejected." }
  Copy-Item -LiteralPath artifacts/phase2/reconciliation.json -Destination "artifacts/phase2/checkpoint-$checkpointNumber.report.json"
}
```

Expected February final fixture: 16 chart accounts, 12 events, zero exceptions,
one deferred future record, MYR assets 15280 / liabilities 1500 / equity 13780 /
income 5000 / expenses 220 / profit 4780 / goal funding 600. Every comparison
difference and native equation difference must be exactly zero. Replay identical
payloads twice through RPC: no extra rows. Other native currencies remain zero.

On staging, run the supplied **independent SQL** against the same cutoff (not JS Date):

```powershell
# Approved staging legacy-history fixture owner, distinct from the HTTP smoke user.
$historyOwner = $env:PRISM_PHASE2_STAGE_HISTORY_OWNER
if ([string]::IsNullOrWhiteSpace($historyOwner)) { throw 'Synthetic history owner is required.' }
foreach ($checkpoint in $checkpointTimes) {
  psql 'service=prism_phase2_stage' -X -v ON_ERROR_STOP=1 -v "owner=$historyOwner" -v "cutoff=$checkpoint" -f scripts/phase2-staging-reconciliation.sql
  if ($LASTEXITCODE -ne 0) { throw 'Independent SQL oracle failed.' }
}
```

The read-only script first returns `cutoff_shape_valid=1` and
`cutoff_range_valid=1`; unsupported precision/range or invalid calendar input must
produce a hard error under ON_ERROR_STOP before comparisons. No operator may
round/truncate a failing cutoff to make it pass. Every `mapped` value must be TRUE;
every difference exactly zero; anomaly sets empty. This script prints comparison
evidence but does not automatically convert
a nonzero difference into a process failure; the reviewer must enforce that gate.
It uses a consistent read-only repeatable-read snapshot, without financial writes.
Compare
owner/currency-scoped: cash = opening + ordinary/linked transaction cash legs +
transfer destination − source + manual repayment direction; debt = original −
effective principal; goal = effective contributions; period flows exclude linked
principal/contributions. Use the independent formulas already inspected in
`scripts/ledger-db-test.mjs:exerciseHistoricalLedger`; the supplied query pack
parameterizes only owner/cutoff and runs no Auth-fixture or migration replay. Frozen dates/timezones must
also match PostgreSQL. For B1 regression use microsecond predicates in SQL:

```sql
select '2000-02-29T15:59:59.000900Z'::timestamptz >
       '2000-02-29T15:59:59.000100Z'::timestamptz as after_cutoff,
       '2000-02-03T00:00:00.000100Z'::timestamptz =
       '2000-02-03T00:00:00.000900Z'::timestamptz as same_link_instant;
```

The transport contract accepts Gregorian local/UTC years 0001 through 9999,
explicit `Z` or `±HH:MM` (at most `15:59`), seconds 00–59 and zero to six
fractional digits. More digits, invalid dates, leap seconds, 24:00, non-finite,
implicit-zone or out-of-range UTC instants/financial calendar dates block acceptance. Do not pre-round
or pre-truncate source exports to fit the contract. Normalize valid inputs to
UTC with six digits. Membership is inclusive `occurred_at <= cutoff`; defer
strictly later records. Opening availability is inclusive; activity strictly
before an approved opening is an exception. Linked instants must match exactly.

Load synthetic boundary rows with amounts 2.00, 3.00 and 7.00 at `.000099Z`,
`.000100Z` and `.000101Z`, cutoff `.000100Z`. The independent PostgreSQL legacy
sum must be 5.00/count 2, translated income 5.00/events 2, deferred count 1,
and all reconciliation differences zero. Repeat with the exact row represented
as `23:59:59.000100+08:00`; reverse source ordering and rerun identical keys.
Expected UTC timestamps/order/receipts and counts must be identical. Current
local `exerciseLedgerBoundaries` covers this on disposable adapters; it is not
a hosted loader. Keep the separately reviewed staging loader prerequisite.

For both write RPCs test SQL helper TRUE, FALSE and NULL. With a verified factor,
omit aal and then use explicit null, aal1 and invalid assurance; omit the session,
use a nonexistent session and another owner's session. Only explicit TRUE may
write. For each denied attempt compare all five ledger table counts, matching
request keys/account codes, and legacy transaction counts before/after, including
after rollback to a savepoint followed by COMMIT. Expect 42501 for valid-shaped
unauthorized contexts; malformed claim UUIDs may fail earlier with an invalid
input error and must also leave no writes. Managed HTTP authentication can reject
before SQL. Keep these provider tests distinct from local signed fixture JWT tests.

Expected TRUE/FALSE. Loader must defer the later record and block mismatched
links/pre-opening activity. No reconciliation tolerance is allowed for dates,
ownership, currency, duplicate IDs or missing history. Exception count must be
zero for accepted history; deferred items require a reviewed inventory, never
posting early. Real principal/interest assumptions, opening snapshots, unknown
accounts, legacy refund provenance and deletions need explicit evidence/owner
decisions. This synthetic exercise cannot authorize real-data migration.

## 8. Failure conditions and recovery

Stop immediately on wrong/unknown target, B1/B2 regression, schema drift, old
migrations in pending list, backup failure, unsupported restore, failed Auth/MFA
isolation, nonzero native difference, partial posting, duplicate request receipts,
lost immutable history, unexpected outbound request or changed legacy authority.
Preserve timestamps, request keys, sanitized SQLSTATE/statuses and exact counts.
Do not publish financial records/tokens in CI output. Notify only the responsible
operator through the approved task workflow; no external messages are authorized.

| Failure stage | Exact recovery action |
| --- | --- |
| Before application | Stop. No DB recovery needed. Preserve manifest/proposal; resolve prerequisites. |
| Migration transaction error | Disconnect failed transaction or ROLLBACK; requery object/version catalog and legacy checksums. Require absence of partial ledger/version. Never retry blindly. |
| Schema applied, no postings | Disable any approved rehearsal callers; keep inert additive schema. Review a later forward correction/removal separately; do not drop tables as routine rollback. |
| Synthetic shadow postings | Stop test callers, preserve immutable receipts and source fixture. Repair locally and re-review; replay stable keys or use explicit inverse corrections. No ledger row edits/deletions. |
| Restore exercise | Restore the **staging snapshot only** to the separately approved restore target via supported Supabase restore-to-new-project workflow; never select production or overwrite source. Record source backup ID/UTC recovery point, destination ref, start/end time and restored catalog. |
| Any future real authoritative writes | Freeze affected writes; inventory all accepted commands after recovery point. Approved forward fix or restore + exact-once durable replay, then full checkpoint reconciliation before reopening. Vercel rollback alone is insufficient. |

The provider restore procedure is: open approved staging **Database → Backups**,
select the recorded recovery point, choose **Restore to a new project**, verify
the separately approved destination/organization/settings/cost, and perform the
provider's final confirmation only with that separate authorization. Availability
and exact provider UI/options must be confirmed for the approved target. No
unbounded restore API/SQL command is provided while that target is unknown.
Do not restore production data or enable paid PITR as part of this preparation.

After restore, run the same read-only query pack against `prism_phase2_restore`,
compare migration versions, native counts/checksums and receipt IDs, then execute
approved retry/Auth/MFA/cross-user/erasure/period tests on restored synthetic
users. Verify separately any Storage/configuration/secrets excluded from database
backup. Record actual RTO and the last recovered accepted command; compute RPO
from known command history, not backup marketing. Zero missing/duplicate accepted
commands and zero reconciliation differences are required. A restored engine
without working managed Auth/API is not completed recovery evidence.

## 9. Rehearsal sign-off and integration exit criteria

Operator and independent reviewer sign only after: B1/B2 closed; exact approved
file applied once; PG17/managed Auth/MFA tests passed; all owner/currency/checkpoint
comparisons zero; expected errors atomic; immutable/retry/race behavior verified;
restore proven against the approved recovery targets; legacy rows/views and
authority unchanged; remaining UX items explicitly tracked. Attach sanitized
commands/results, hashes, fixtures, catalog snapshots and restore timings.

This still does not approve live shadow integration. Before that, design one
durable atomic legacy+shadow command or reviewed replay/outbox boundary. Two
unrelated browser writes are insufficient. Production migration, read/write
authority cutover, publication/deployment and Phase 3 require new authorization.

Platform references checked for this plan:
[Supabase functions](https://supabase.com/docs/guides/database/functions),
[RLS/invoker views](https://supabase.com/docs/guides/database/postgres/row-level-security),
[database backup boundaries](https://supabase.com/docs/guides/platform/backups),
[restore to a new project](https://supabase.com/docs/guides/platform/clone-project).
