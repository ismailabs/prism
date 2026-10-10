# Phase 2 final review and integration decision

Reviewed 10 October 2026 on `codex/phase2-ledger`, base/HEAD
`72da622305754328f02ec8f5d2ca8b71a221ee17`. The original review below identified
two P1 blockers. The subsequent explicit P1 remediation request authorized local
repairs and regression verification. Both fixes now pass targeted domain,
PGlite, native PostgreSQL and actual PostgREST regressions. Final broad-gate
results and the current local acceptance decision are in
[`phase2-p1-remediation.md`](phase2-p1-remediation.md).
**Current recommendation: GO for local Phase 2 acceptance.** All requested gates
pass, including 97 unit tests, 73 Playwright tests and 341 responsive checks.
Hosted staging remains blocked by its separate approval/provider/restore gates.

The attached master prompt remains requirements/context, not hosted authorization.
Only disposable local synthetic databases were replayed for the requested tests.
No hosted migration, production-data copy, hosted mutation, Git staging/commit,
push, deployment, merge, backfill or Phase 3 work occurred during remediation.

## Original blockers — root causes and before-fix evidence

These observations describe the pre-remediation tree. B1 is repaired by exact
microsecond parsing/comparison and strict transport validation; B2 by requiring
`session_allowed() IS TRUE` at both privileged entry points (rejection uses
`IS NOT TRUE`). The original probes are retained unchanged and now pass. Actual
RPC/HTTP denial tests additionally verify no persisted writes in all five ledger
tables or legacy transactions. Historical before logs remain in ignored artifacts.

### B1 / P1 — Historical timestamps lose PostgreSQL microsecond precision

`src/domain/ledger-reconciliation.ts:31–33` normalizes source instants through
JavaScript `Date`, discarding fractional digits beyond milliseconds. The same
normalization is used for the cutoff, link equality and posting timestamps;
opening/repayment/reconciliation comparisons also use `Date.parse`.
[PostgreSQL 17 timestamps have microsecond resolution](https://www.postgresql.org/docs/17/datatype-datetime.html).

Three independent synthetic probes reproduce false acceptance:

| Input | Required | Observed |
| --- | --- | --- |
| Cutoff `2000-02-29T15:59:59.000100Z`; RM7 income at `.000900Z` | Defer the later record; February income 5000, assets 15280 | Posted as `.000Z`; income 5007, assets 15287, no deferred records, `accepted:true` |
| Linked transaction at `.000100Z`, repayment at `.000900Z` | Reject under the identical-instant link rule | No exception; `accepted:true` |
| Approved cash opening at `.000900Z`, salary at `.000100Z` | `activity_before_approved_opening`; reject | No exception; `accepted:true` |

The reconciliation oracle shares the same millisecond truncation, so an exact zero
money difference does not detect the temporal error. Repair must preserve and
compare complete instants, or explicitly reject unsupported precision rather than
silently normalize it. Cover cutoff membership, ordering, link equality, openings,
offset-equivalent instants, invalid calendar dates and frozen local dates. Compare
against PostgreSQL timestamp predicates independently. Current synthetic-only
scope limits impact; it does not make this a safe historical migration boundary.

### B2 / P1 — Privileged write guards do not fail closed on NULL session results

Both guards in
`supabase/migrations/20261009220402_shadow_double_entry_ledger.sql:139,169` use
`if u is null or not prism_private.session_allowed() then ...`.
The local dependency in
`20260928000200_initial_finance_tracker.sql:39–44` can return NULL for an owned,
current, non-anonymous session with a verified MFA factor and an absent/null
`aal` claim: `not exists(verified_factor) or auth.jwt()->>'aal'='aal2'` becomes
`false or null`. No later local migration replaces this helper.

With a non-null owner, the new rejection expression is NULL. PL/pgSQL skips that
rejection and continues in the definer, which has elevated table permissions.
RLS's NULL denial cannot substitute for the explicit check inside a definer.
[PostgreSQL documents this conditional behavior](https://www.postgresql.org/docs/17/plpgsql-control-structures.html#PLPGSQL-CONDITIONALS).
Existing confirmed self-deletion uses `not coalesce(session_allowed(),false)`.

The offline scalar SQL probe returns `session_allowed:null`. It extracts both
guards from the actual proposal file and each returns
`rejection_condition:null`, `branch:"continue"` under a NULL helper result.
This is expression-level proof plus source inspection, **not an end-to-end hosted
exploit or a claim that managed Supabase Auth normally issues missing-aal tokens**.
The new privilege boundary must require an explicit TRUE result. Add actual RPC
denial tests for missing/null/invalid aal with verified MFA, and verify zero rows
after rejection. Provider helper parity and accepted JWT claim shapes remain
staging prerequisites. Do not weaken MFA or RLS to make the tests pass.

## Complete 18-file inspection

All five tracked diffs and all thirteen new implementation files were inspected;
untracked files are not represented by ordinary `git diff --stat`. The initial
18-path SHA-256/line-count manifest is retained locally at
`artifacts/phase2/final-review-input-manifest.json`. Review additions are separate.

| File | Review result |
| --- | --- |
| `.github/workflows/ci.yml` | Adds ledger DB, offline reconciliation and viewer gates; native tests stay isolated. Existing missing failure-artifact upload and unpublished Linux CI remain evidence gaps. |
| `README.md` | Clearly describes local shadow status; readiness must now be read with B1/B2. |
| `package.json` | Four scripts, no dependency/lockfile changes; no production ledger command. |
| `scripts/real-postgres-test.mjs` | Adds ledger/native race/HTTP/exact-scale/erasure coverage; PostgreSQL 18/minimal Auth is not managed PG17 proof. |
| `supabase/migrations/README.md` | Preserves historical timestamp discrepancies and baseline boundary; Phase 1 and 2 proposals correctly separate. |
| `docs/adr/0002-shadow-ledger.md` | Nine decisions present. Exact transport is a consumer convention for raw tables; fail-closed guard defect contradicts intended session gate. |
| `docs/phase2-accounting.md` | Complete implementation handoff and reported gates; its broad acceptance does not cover the adversarial probes. |
| `docs/phase2-ledger-recovery.md` | Sound staged recovery boundaries; previously lacked exact executable rehearsal packets. Do not equate configured backups with restored evidence. |
| `scripts/ledger-db-test.mjs` | Original normal/atomic/legacy checks retained; remediation adds NULL/FALSE authorization, savepoint/commit denial snapshots, privilege/search-path checks and independent PostgreSQL microsecond oracle. |
| `scripts/ledger-dry-run.mjs` | Offline synthetic input, no provider/apply mode; overwrites one report path, so checkpoint reports must be archived separately. |
| `scripts/ledger-preview-test.mjs` | Accessible semantic selectors, explicit browser context, axe, mobile and no-external-request checks; no manual screen-reader acceptance. |
| `scripts/ledger-preview.html` | Read-only synthetic warning, native dates/currencies, expandable journals; UX issues below. |
| `scripts/ledger-preview.mjs` | Binds loopback, GET-only, no-store/CSP, validates dates/currency; fixed materialized cutoff is not displayed. |
| `src/domain/accounting.test.ts` | Fifteen original cases retained; new `ledger-boundary.test.ts` covers microseconds, strict dates, offsets, opening/link order and deterministic reruns. |
| `src/domain/accounting.ts` | Exact bigint builder, separate stocks/flows/currencies, balanced lines; DB supplies account identity/classification, not caller input. |
| `src/domain/ledger-reconciliation.ts` | Cutoff, opening, debt, link and reconciliation comparisons preserve microseconds. Unsupported input is an exception or thrown hard failure, never acceptance. |
| `supabase/migrations/20261009220402_shadow_double_entry_ledger.sql` | Additive and remotely unapplied; both guards fail closed, timestamp precision validated before cast, exact read-view timestamps emitted as canonical text. |
| `supabase/tests/ledger-history.synthetic.json` | Fully synthetic 12-event example, explicit opening snapshots and one deferred future item; no real-data evidence. |

## Accounting and security findings

| Boundary | Assessment |
| --- | --- |
| Balance / owner / currency | Positive bounded numeric values with native scale, unique ordinal/account-side, 2–64 balanced lines; composite FKs keep event/journal/account owner and currency aligned. Separate native balance sheets include retained earnings. |
| Immutability | UPDATE/DELETE triggers cover all five tables, and insertion seals prevent later journals/lines/allocations. The transaction XID seal permits assembly only in the original transaction. Superusers, DDL/TRUNCATE-capable operators and table owners are trusted operational boundaries, not protected against malicious administration. |
| Erasure | Auth-parent deletion permits cascades after the user disappears. This intentionally preserves confirmed whole-user erasure. Ordinary financial correction cannot use this exception. Provider overloads and managed Auth cascade order must be tested. |
| Atomicity / rollback | RPC exceptions abort event/journal/line/allocation writes. Deferred event completeness runs at transaction end. Migration is one BEGIN/COMMIT transaction with 5-second lock timeout; any DDL error must abort the whole transaction. |
| Idempotency | Owner/request advisory locks and unique key; same jsonb payload returns same event, different payload conflicts. Persist request identity before send; numerically equivalent but differently formatted strings are different payloads. No live caller exists yet. |
| Concurrent payment caps | Ordered account locks cover ordinary loan/card postings and normal READ COMMITTED races. Reversals lock the original event, not its account set. Adjustment/opening/reversal may produce debit liability balances; no universal historical/current liability floor is enforced. Before integration, decide corrective sequencing and require READ COMMITTED unless other isolation levels are independently qualified. |
| Reversals | One full inverse, no reversal of reversal, owner/currency/date checks; lines and allocation signs copied, not caller-specified. Chronology of related corrections is an operator policy. Refund is a separate cash/expense inverse without original purchase linkage/cap; that provenance remains deferred. |
| Session / MFA | Both privileged guards now require explicit TRUE; real local SQL/HTTP tests deny NULL and FALSE and verify zero persistent writes. Restrictive SELECT RLS also denies them. A start-of-call check does not guarantee cancellation after concurrent revocation. |
| Definers / search path | Two narrow private definers plus public invoker wrappers; empty search paths; PUBLIC/anon execution revoked; trigger helpers invoker/revoked. Authenticated can execute private write functions as required by wrappers, so every private entry must enforce identical authorization. |
| Dependencies | `auth.uid/jwt`, Auth users/sessions/MFA, `prism_private.session_allowed`, authenticated private-schema USAGE, profile trigger/timezone, cash/debt/goal tables and stable classifications. PG17 supports xid8/invoker views. Phase 1 guard is a workflow prerequisite, not a direct ledger FK dependency. |
| RLS / privileges | Five RLS tables, owner SELECT and restrictive session policies, no client INSERT/UPDATE/DELETE. Invoker views inherit base-table RLS. No FORCE RLS: expected for trusted definer owners, but grants/owners/default privileges must be measured on staging. Private schema must be absent from exposed Data API schemas. |
| Exact transport | Builders and exact views preserve decimal text; native scale 2/2/2/0. Authenticated SELECT on raw `journal_lines`/`ledger_allocations` also exposes numeric HTTP surfaces. Integrating clients must exclusively use exact views and must never parse monetary strings with Number/parseFloat. Raw REST responses are not precision-safe financial transport. |
| Multi-currency / future | One native currency per event; composite keys reject mixed legs. FX remains unsupported. RPC rejects future instants; historical translation includes exactly `instant <= cutoff`, with later microseconds deferred. |
| Legacy authority | No new caller in app hooks/routes; no changes to legacy tables/views/calculations or auto-backfill. Ledger provenance is validated for chart mappings, retained without legacy FKs; posting provenance fields themselves are not an attestation that replay semantics are correct. |

## Historical translation review

Cash openings use equity only at approved instants; zero openings need no journal.
Nonzero missing dates, activity before openings and unknown cash mappings must
remain exceptions. A debt original uses an approved opening snapshot, not guessed
origination cash; payable becomes liability, receivable becomes asset. Snapshot
dates and what the snapshot includes need owner review to prevent double counting.

Same-currency transfers conserve both amounts and do not create income/expense.
Cross-currency transfers are exceptions. Repayment-linked transactions are posted
once as full principal, preserving legacy classification. This does not prove
that fees or interest were absent: real replay must require affirmative evidence
or an exception. Explicit interest is an ordinary expense or explicit payment
split; no amortization is inferred. Principal above original is blocked.

Manual earmarks are allocation-only. Transfer-linked contributions add allocation
without repeating cash movement and verify destination amount/date. Legacy
transaction-linked goals remain ambiguous and block acceptance. Refund provenance
cannot be reconstructed from ordinary legacy income/expense fields; do not relabel
an unlinked income as refund or pretend to identify the original purchase.
Deleted-history detection requires a known-deletion inventory; remaining rows
alone cannot establish completeness. Scrubbed input/export support is absent.

Beginning, period-end and intermediate reconciliation is mandatory per owner and
native currency. The current reference comparison assumes the same fixture
timezone for history; old timezone changes cannot be reconstructed without
separate provenance. The repaired timestamp/link comparisons preserve six fractional
digits; one-microsecond boundary tests match PostgreSQL independently. This closes
the synthetic boundary defect; real historical completeness remains unproven.

## Viewer review and UX/accessibility issues

Fresh local browser inspection verified English/Malay controls, expected MYR
figures, expanded journal debit/credit detail, later date selection and invalid
period clearing. The viewer has no provider connection. The automated viewer
gate was rerun: PASS, including zero axe violations in checked desktop/mobile
states, no mobile overflow and no external requests. Screenshots are under
`artifacts/phase2/accounting-desktop.png` and `accounting-mobile-ms.png`.

| Issue | Impact / recommended follow-up |
| --- | --- |
| P2: fixed fixture cutoff absent | Choosing through 2001 still shows data materialized through February 2000, including no RM7 later fixture record. Display dataset coverage/last posted cutoff and deferred count, or bound date selection. Synthetic warning limits risk but does not explain coverage. |
| P2: report updates unannounced | No polite status/live region or busy state; screen-reader users may not know results changed. Verify with a real screen reader before product integration. |
| P3: repeated opening summaries | Three buttons have identical date/kind accessible names. Include a readable account/event label to distinguish journals. |
| P3: partial Malay localization | Event kinds, classification values and invalid-period error remain English. Use localized display labels while preserving technical IDs in optional detail. |
| P3: signed detail lacks legend | Liability/equity credits display negative under debit-minus-credit convention. Explain the convention beside the table; prefer readable synthetic account names with IDs in detail. |
| P3: journal date scope unclear | Start date affects flows, while journals show all postings through end. Label journal scope explicitly. Filter/language changes also collapse opened details and discard inspection position. |

Axe passing is scoped automated evidence, not complete accessibility acceptance.
No product UI was changed as part of this review.

## Initial review verification and evidence boundaries (before remediation)

| Check performed in this review | Result |
| --- | --- |
| Complete 18-file source/diff and both handoff/recovery documents | Inspected; original hashes recorded and preserved |
| `npm run test -- src/domain/accounting.test.ts` | PASS, 15/15 |
| `npm run test:ledger-preview` | PASS |
| `npm run lint`, `node --check scripts/phase2-review-probes.mjs`, `git diff --check` | PASS |
| `node scripts/phase2-review-probes.mjs` | Exit 1 as intended: baseline PASS, three temporal FAILs, NULL guard FAIL |
| Read-only SQL query-pack preparation | 21 statements checked in ephemeral PGlite: 6 catalog statements prepared, 15 unresolved application relations as expected; no EXECUTE, application DDL or data writes. Actual PG17 semantics/results remain untested. |
| Read-only provider identity/catalog | PRISM `hyhsppiitijkuvpyswce`, organization `zwgtqvqlmcwbjssyoysv`, PostgreSQL 17.6; Phase 2 version absent, both ledger table names absent |
| Migration application / native suite rerun / hosted Auth attacks / restore | NOT EXECUTED in this review |

PowerShell 7.6.5 supports the proposed checkpoint file commands. `psql` and
`gitleaks` are not on this host's PATH; no provisioning was performed. Approved
staging execution and commit secret scanning require verified tools first.

The probe's security case uses only scalar SELECT in an ephemeral PGlite engine;
it creates no application schema, applies no migration and writes no fixture rows.
The previous broad local gates remain reported in `phase2-accounting.md`; they
were not all rerun. Hosted catalog inspection read no financial records. The
Supabase connector ceased being callable before a live helper-definition follow-up;
B2's helper definition is verified locally, with hosted parity explicitly open.
No GitHub/Vercel state refresh or Linux CI run is claimed by this review.

## Local commit plan — proposed, not executed

The explicitly authorized local repair packet closes B1/B2 with real RPC and HTTP
regressions. Independent review can inspect the uncommitted corrected tree and
before/after evidence. Committing still requires separate authorization plus the
final gate and secret-scan checks below. Proposed groups:

1. `feat(accounting): add isolated immutable native-currency ledger` — migration,
   ADR, accounting builder/report, domain tests, ledger DB tests and synthetic JSON.
2. `feat(accounting): add offline historical reconciliation` — translator and
   dry-run script, including B1 regression repair/coverage.
3. `feat(accounting): add synthetic local viewer and verification` — three viewer
   files, native-test additions, package scripts and CI changes.
4. `docs(accounting): record remediation and controlled staging protocol` —
   README, migration README, both original handoffs, this report, staging plan,
   review probes and read-only staging validation/reconciliation SQL.

These are final-tree groups; dependent intermediate commits need not be runnable
alone. If every commit must be green, prefer one reviewed implementation commit
plus a separate review-document commit. Do not split shared tests into broken
states merely to follow these proposed titles.

Before each authorized commit: use explicit path staging (no `git add .`), inspect
`git diff --cached --stat`, `git diff --cached`, and `git diff --cached --check`;
scan the exact staged candidates/history with the available secret scanner;
   exclude `.env`, provider credentials, node_modules, artifacts, test traces and
generated builds. Verify only authorized paths are staged. Stop if HEAD or remote
base moved, foreign modifications appear, or the secret scan fails. A local
commit does not authorize push/PR or Vercel preview side effects.

An alternative single-commit packet has the following **proposed only** explicit
path commands. Use them only after repairs, final review, secret scanning and
separate local commit authorization. No command below was executed here:

```powershell
$phase2CommitPaths = @(
 '.github/workflows/ci.yml','README.md','package.json','scripts/real-postgres-test.mjs',
 'supabase/migrations/README.md','docs/adr/0002-shadow-ledger.md',
 'docs/phase2-accounting.md','docs/phase2-ledger-recovery.md',
 'scripts/ledger-db-test.mjs','scripts/ledger-dry-run.mjs',
 'scripts/ledger-preview-test.mjs','scripts/ledger-preview.html','scripts/ledger-preview.mjs',
 'src/domain/accounting.test.ts','src/domain/accounting.ts','src/domain/ledger-reconciliation.ts',
 'supabase/migrations/20261009220402_shadow_double_entry_ledger.sql',
 'supabase/tests/ledger-history.synthetic.json','docs/phase2-final-review.md',
 'docs/phase2-staging-rehearsal.md','scripts/phase2-review-probes.mjs',
 'scripts/phase2-staging-validation.sql','scripts/phase2-staging-reconciliation.sql',
 'src/domain/ledger-instant.ts','src/domain/ledger-boundary.test.ts',
 'docs/phase2-p1-remediation.md'
)
git add -- $phase2CommitPaths
git diff --cached --stat
git diff --cached --check
git diff --cached
# Stop here for independent staged-tree and secret-scan acceptance.
# ONLY after that acceptance and local commit authorization:
git commit -m 'feat(accounting): add reviewed isolated shadow ledger and rehearsal plan'
git show --stat --oneline HEAD
git status --short
```

There are 26 current candidate paths: 18 original inputs, five review/probe/query
additions, and three remediation additions. Verify the final explicit manifest
before staging, without sweeping in unrelated files. The ignored input hashes,
probe JSON, screenshots and query preparation helper are evidence, not Git candidates.

## Integration-readiness gate

- Independent review packet: prepared, with original failing evidence and corrected regressions.
- Local accounting acceptance: GO; both P1 defects repaired and all requested gates pass. See `phase2-p1-remediation.md` for complete evidence.
- Hosted staging application: blocked; no named approved target, no PG17/Auth
  rehearsal or restore proof. See `phase2-staging-rehearsal.md` for the proposed
  exact commands, query pack, expected results and recovery procedure.
- Legacy financial authority: unchanged; shadow posting integration remains absent.
- Production cutover and Phase 3: outside authorization and not ready.

Next external gate is independent review and a separately authorized, named
synthetic staging/restore rehearsal. Local technical closure does not authorize
hosted execution, publication, legacy cutover or Phase 3.
