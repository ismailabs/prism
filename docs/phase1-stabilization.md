# Phase 1: financial foundation and stabilization

The user has **accepted local Phase 1 stabilization under the documented fixture
conditions**. The five affected cases pass three repetitions (15/15), and
two independent fresh-build full suites pass 73/73 in 7.0 and 7.1 minutes, with
zero retries. Relevant static/unit/responsive/build checks pass. Historical failed
checkpoints below are retained. The final integration review below recommends
approval for local source commits only. Push/PR, remote verification side effects,
migration application, release and Phase 2 remain separately gated.

## Scope and entry evidence — 9 October 2026

Started from a clean detached HEAD at `819ddef0e8a3b9aad07475ff495152e4d2ea9156`;
local work is on `codex/phase1-stabilization`. No applicable `AGENTS.md` was found
in the checkout or its ancestors. Node 24.19.0 / npm 11.17.0; dependency versions
remain those in the lockfile. Only `.env.example` exists; variable names are
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `EXCHANGE_RATE_API_KEY`.

The origin still names `ismailabs/prism-finance-tracker`; GitHub reports it moved
to `ismailabs/prism`. Read-only verification of `main` confirms the starting SHA.
Vercel project `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr` reports production deployment
`dpl_5tKmFadGtfrFRfaoL88dtmJruBSJ` at parent commit
`e46822f5d04c8d5c3d93419c27b3a2214621c814`, branch
`codex/financial-foundations`. Main and production are different builds.
Custom-domain browser acceptance is not established by this metadata.

GitHub run `37255165638`, job `111590559461`: 68 E2E tests passed; the only failure
was `e2e/enhancements.spec.ts:442`, “new surfaces, palette, and drawer pass WCAG AA
accessibility scans”. Axe observed analytics secondary text at `#77837c` against
`#17221e` (4.14:1). Responsive and build were skipped in that run. This is historical
CI evidence; current local results are recorded below separately.

## Keep / Repair / Add / Defer

| Decision | Scope |
| --- | --- |
| Keep | React/Vite, exact decimal transport and bigint arithmetic, owner/session/MFA RLS, unassigned historical transactions, explicit recurrence, historical native amounts/FX, English/Malay. |
| Repair | Establish the causal E2E failure and restore baseline gates first. Then protect financial history through a narrow, tested local packet. |
| Add | Targeted integrity/authorization fixtures and a source-to-projection/readiness matrix. |
| Defer | Balanced ledger, backfills, splits/refunds/reversals, unattended posting, release alignment, password settings and external writes. |

Acceptance requires the original failure explained and fixed or reproducibly
blocked, exact native money, conserved transfers, excluded principal/earmarks and
future records, isolated RLS/session/MFA evidence, every applicable gate reported,
and no remote mutations. A green local baseline alone does not approve Phase 2.

## Canonical sources and Phase 2 mapping

Writes pass through signed-in React forms, bounded native-money validation (positive
event amounts; signed/zero opening balances),
`useFinanceData` / `usePlatformData` / `usePlanningData`, then PostgreSQL constraints,
composite foreign keys and owner plus restrictive session RLS. Reads use `exact_*`
security-invoker views or reporting RPCs, never raw numeric JSON for money arithmetic.
Recent transactions are limited to 50; account balances and linked progress use
server projections, so that recent feed is not an authoritative history source.

| Canonical source | Current projection and exception | Phase 2 mapping question |
| --- | --- | --- |
| `accounts.opening_balance` | Exact cash balance includes assigned transactions, both transfer legs and unlinked account-funded repayments through now. No opening-balance event/date. | How will opening equity and cutover reconciliation be represented without fabricating historical postings? |
| `transactions` | Native income/expense; `exact_transactions` classifies legacy links. Unassigned rows stay unassigned. | Which accounts, refund/split semantics and posted correction rules are owner-approved? |
| `transfers` | One row, two original native amounts; composite owner/currency FKs, same-currency conservation. Delete removes both effects; editing changes the event in place. | Which FX clearing/fee accounts and immutable reversal events are required? |
| `objective_contributions` | Earmarks affect progress, not cash. Transfer links must match destination; legacy transaction links classify the whole expense as allocation. | Are historical links full allocations or amounts containing fees? Allocation-only and physical funding must remain distinct. |
| `person_debts` / `debt_repayments` | Original principal plus repayment progress. `i_owe` debits account cash, `owed_to_me` credits it. Unassigned repayments only change principal. Interest is a separate ordinary transaction. | How to reconcile original loans/receivables with cash origination, interest and posted reversal history? |
| `monthly_budgets` | Plans compared with posted ordinary native expenses; principal and allocations excluded. | Keep plan/projection rows separate from actual journal events. |
| `recurring_rules` | Explicit confirmation only; rule lock, anchored calendar occurrence and unique occurrence index. | Preserve retry identity after posting; no unattended writes in this phase. |
| CSV `import_key` | Atomic bounded batch, profile lock, per-row batch/index uniqueness and optional semantic duplicate skip. | Same-key changed payload/row order and deleted imported rows need durable request identity; there is no payload hash or permanent batch receipt. |
| Reporting views | Posted ordinary totals through now; timezone-local days; decimal strings; FX only labelled estimates. | Derive/rebuild from approved postings without changing historical native amounts. |

The app has no complete balanced general ledger. It cannot currently prove
Assets = Liabilities + Equity for a full balance sheet: accounts describe cash,
while original debt origination and equity are not balanced events. A credit-card
payment method is a label, not a liability account. Card settlements, loan interest
splits, investments/valuation, refunds and immutable posted reversals need explicit
design and reconciliation. Do not force these into ordinary expenses.

Direct transaction/transfer edits and removals, contribution removals and original
debt amount edits are existing mutable-record behavior. Deleting a legacy link can
reclassify its transaction as ordinary and change analytics. This phase must not
claim immutable accounting history or silently backfill those cases.

Manual create operations do not expose a durable request idempotency key/receipt;
pending buttons and optimistic settlement do not prove exactly-once posting after
a committed response is lost. The verified retry identities belong to import
batch/index and recurrence rule/index, not every CRUD action. Phase 2 posting
design must specify stable identities, payload conflicts and lost-response retry
behavior for transactions, transfers, contributions and repayments as well.

### Traced implementation boundaries

| Path | Validation/write boundary | Projection/read boundary |
| --- | --- | --- |
| Accounts / transfers / debt / targets | `src/components/financial/{Accounts,Transfers,Debts,Objectives}.tsx`, `shared.ts`; `usePlatformData.ts` typed repositories; `validate_finance_link`, transfer/debt validators and composite FKs | Exact entity views; `src/domain/progress.ts`; `Overview.tsx`; no second mutable balance counter |
| Transactions / categories / payment labels | Existing transaction/list forms; `useFinanceData.ts` queued optimistic settlement, ID-only writes then exact rereads; owner/session RLS | `transactionTransport`, paginated `transaction_page`, exact recent feed; late cancelled responses cannot restore a cleared owner cache |
| CSV / recurrence / budgets | Existing `Plans` flow, `src/domain/{csv,dates}.ts`, `usePlanningData.ts`; atomic import/profile lock, occurrence/rule lock and unique identities | Exact rules/budgets; server ordinary spending; recurrence confirmation never runs unattended |
| Analytics / export | `useFinancialReports.ts`, finance daily/net-flow views and transaction-page RPC; bounded pages/export filters | Currency-separated exact totals, saved IANA financial dates, labelled FX presentation estimates |

`supabase/reference` contains an older financial-event proposal; the tracked
`scripts/phase2-db-test.mjs` still refers to moved, nonexistent paths and is not an
active package/CI gate. It does not demonstrate an installed journal. Preserve it
as historical reference pending a separately scoped cleanup; the active migration
sequence and deployed catalog control this phase.

The React review found these changes are derived render values and existing
mutation handlers: no new effect chain, duplicated state, storage, subscription,
memoization or network waterfall. The debt dialog uses its existing focus/keyboard
contract, a readable alert and disabled destructive action. English/Malay safety
copy is present; provider errors retain diagnostic English as before.

### Local fixture contract

Browser tests use `https://fixture.supabase.co` and a non-provider fixture key,
intercepted HTTP responses and synthetic owners; no `.env.local` is needed. The
normal Playwright config excludes the opt-in deployed-site spec, which requires
explicit external configuration. Do not set `PRISM_E2E_BASE_URL` or point fixture
tests at the production project. Full migration replay uses in-process PGlite and
native PostgreSQL 18.4 with minimal synthetic Auth tables; PostgREST 16.4 binds only
loopback with a per-run local signing secret. These are not managed Supabase Auth
or production PostgreSQL 17 acceptance. Native clusters are shut down with
`pg_ctl` and synthetic temp data is retained locally by the existing runner.

Unit coverage retains DST gaps/ambiguity, anchored month clamping, currency-separated
analytics, optimistic rollback/deletion order and late cancelled owner-cache reads.
DB coverage retains atomic invalid CSV rollback, same batch/index retry, duplicate
skip, exact cross-currency original transfer amounts, account-reference restrictions,
linked event exclusivity and concurrent repayment caps. This phase adds concurrent
import/occurrence retries and parent-debt deletion waiting for a committed repayment.
Refunds, splits and immutable reversals remain unsupported; deleting an individual
repayment still changes cash and deleting a linked relationship can change analytics.

## Ownership and read-only production inspection

Catalog inspection of `hyhsppiitijkuvpyswce` found all 13 public application tables
with RLS, owner policies and restrictive session policies. Reporting/exact views
use `security_invoker=true`; anonymous SELECT is revoked. `session_allowed()` checks
Auth-owned user/session identity, session expiry, anonymous-sign-in denial and
verified factors versus AAL2. No user-editable metadata authorizes financial access.
Public financial RPCs are invokers with empty search paths; privileged identity
helpers stay in the private schema. Trigger helpers have no client EXECUTE grant.
The platform's public `rls_auto_enable` definer is not client-executable.

`prism_private.report_reservations` has RLS, no policies, and neither anon nor
authenticated SELECT. That advisor alone is not evidence of an exposed table.
The remote private no-argument self-delete overload is historical drift from local
replay; its public wrapper is absent. Any release rehearsal must compare this and
the existing Auth deletion path rather than treating a fresh replay as production.

Leaked-password protection is still disabled ([Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).
Fourteen unused-index notices remain informational ([advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index));
no indexes or Auth settings were changed. Grants and policies must be considered
together ([RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)).
Catalog inspection does not prove cross-user behavior; isolated fixtures are the
behavioral evidence below. No production records were read into tests.

Remote applied versions match the historical migration README, including local /
remote differences `20260928043611` / `20260928081917`, `20260928082016` /
`20260928082111`, `20261001033902` / `20261001035741`, and an untracked old baseline.
Never repair those timestamps or replay the baseline on production.

## Verification and handoff

Tests use synthetic local fixtures; no production keys were retrieved and no live
account or financial writes occurred. The initial handoff had passing
type/lint/unit/DB/native/responsive/build gates but five full E2E failures. The
continuation below supersedes that browser checkpoint with two full passes;
focused passes alone were not used to accept the gate.

Baseline packet cause and repair: the analytics entrance animated opacity from zero
to one. Pausing the original animation at 45 ms deterministically fails axe (2.28:1
for secondary text); the CI scan sampled a later partial opacity (4.14:1). Analytics
metrics now retain opacity while translating; reduced-motion support and the full
WCAG scan remain. The original unmodified scan passed locally once (1.7 minutes),
which alone would not have explained or repaired the intermittent failure.

Two local rerun interruptions are distinct from that CI defect: overlapping browser
suites exhausted this 4 GB host (responsive stopped and queued for a serial rerun),
and unpacking the native test binary during Vite watch caused Windows `EBUSY`, then
connection-refused test failures. Generated `.cache`, `artifacts`, `test-results`
directories are now ignored by Vite watch. A subsequent color-identity case caught
Analytics still loading at its 5-second assertion; its route-specific readiness
allowance now matches the existing 20-second checks, retaining every assertion.

`npm ci` passed (410 packages). `npm audit --omit=dev --json` reports zero runtime
dependency advisories. Full audit reports 8 dev/build advisories (6 high, 2 moderate)
in the Tailwind/build tool dependency tree; a forced Tailwind major upgrade is a
separate reviewable packet, not part of this financial repair. This is a package
advisory snapshot, not a security certification.

### Implemented packets and exact changed files

| Packet | Files | Result |
| --- | --- | --- |
| 1A causal baseline repair | `src/styles.css`, `e2e/enhancements.spec.ts` | Full-opacity analytics metrics plus an axe check paused inside the entrance animation; original WCAG scan retained. |
| 1A local QA stability | `vite.config.ts`, `e2e/periods-colors.spec.ts`, `e2e/enhancements.spec.ts`, `e2e/focused-upgrade.spec.ts` | Ignore generated executable/report paths; wait for route readiness and actual DELETE requests; explicit swipe duration and 700 ms rejection; complete-workflow deadlines for multi-context/theme and eight-scan cases. Every original assertion retained. |
| 1B/1C exact read boundary | `src/domain/transport.ts`, `src/hooks/useFinanceData.ts`, `src/domain/upgrade.test.ts` | Recent/create/update rereads share checked transport; positive bounded native amounts required, all four currencies exercised. |
| 1C debt history | `src/components/financial/Debts.tsx`, `src/components/financial/copy.ts`, `src/hooks/usePlatformData.ts`, `supabase/migrations/20261009162324_protect_debt_repayment_history.sql` | Cache-aware disabled English/Malay confirmation, server preflight, unapplied invoker guard with no data changes; whole-account erasure preserved. |
| 1C present progress | `src/components/financial/Overview.tsx`, `src/App.test.tsx` | Recent progress excludes entries after each query's refresh timestamp. Existing write/focus/reconnect refetch advances that cutoff; no new timer. |
| 1C independent regressions | `e2e/fixtures.ts`, `e2e/focused-upgrade.spec.ts`, `scripts/phase1-integrity-test.mjs`, `scripts/foundations-db-test.mjs`, `scripts/real-postgres-test.mjs` | Narrow fixture ID/debt filters and pagination; owner/session/MFA/amount/future/cash/budget fixtures; real concurrency and HTTP assertions. |
| 1D readiness/handoff | `README.md`, `supabase/migrations/README.md`, `docs/phase1-stabilization.md` | Current model/deletion semantics, provider drift, test boundaries, forward proposal/rollback and Phase 2 gates. |

The frontend preflight alone has an INSERT/DELETE race. Full protection requires
the proposed trigger after an approved release; no claim is made that production
now has this safeguard. Individual transaction/transfer/repayment removal is not
changed into an immutable reversal. No schema types regeneration is needed: this
proposal changes no public columns or client-callable RPC signatures.

### Verification matrix — local final code, 10 October 2026

| Command / evidence | Result | Environment / scope |
| --- | --- | --- |
| `npm ci` | PASS | Locked dependencies, Node 24.19.0 / npm 11.17.0. |
| `npm run typecheck` | PASS | Final TypeScript changes. |
| `npm run lint` | PASS | React hook/purity rules retained; an initial direct render clock call was corrected to query-snapshot cutoffs. |
| `npm run test` | PASS, 76 tests / 7 files | Exact native bounds, posted progress, existing optimistic/date/cache/analytics behavior. |
| `npm run test:db` | PASS | PGlite foundational migration/CRUD/RLS/MFA fixtures. |
| `npm run test:platform-db` | PASS | PGlite historical platform migration subset; preserves earlier cascade and explicit self-erasure contracts. Not evidence of the new guard. |
| `npm run test:foundations-db` | PASS | Full PGlite replay including new guard; new isolated amount, cash, budget, ownership and session cases. |
| `npm run test:period-db` | PASS | Full replay; exact local-date reporting, future progress and permission denial. |
| `npm run test:postgres` | PASS | Native PostgreSQL 18.4, independent connections/observed locks and loopback PostgREST 16.4. New debt race, concurrent import/occurrence retry, four-currency HTTP and whole-account erase all pass. |
| `npm run test:e2e -- e2e/focused-upgrade.spec.ts --reporter=line`; corrected case rerun `e2e/focused-upgrade.spec.ts:55` | PASS across 5 initial cases + corrected case | Both languages, stale-cache history denial, empty-debt/account/target mutations and confirmed account RPC. Initial mutation count was read before preflight finished; now wait for each expected DELETE, retaining the count assertion. |
| First `npm run test:e2e -- --reporter=line` | 68 PASS / 5 FAIL (33.4 minutes), before final fixture repairs | Two cumulative 60-second workflow deadlines, one 120-second multi-scan deadline, raw-CDP swipe and metrics still loading at 5 seconds. See exact failures below. No opted-in deployed spec. |
| Five-case timing recheck | 2 PASS / 3 FAIL (8.3 minutes) | Profile-default and controlled fast/700 ms swipe pass. Metrics reaches axe but exceeds 60 seconds; full WCAG card readiness and transaction color badge still exceed 5 seconds. Not a green E2E gate. |
| Final three-case recheck, `--grep 'category color\|analytics text retains\|new surfaces, palette'` | PASS, 3 cases (3.7 minutes) | Paused contrast, original eight-scan WCAG and full color identity workflow; every original assertion retained. Combined with the earlier two passes, all five failed cases are verified after repairs. |
| Initial clean `npm run test:e2e -- --reporter=line`, before continuation | FAIL: 68 PASS / 5 FAIL (47.7 minutes), exit 1 | Both contrast/WCAG tests and new debt safeguards pass. Failures: timezone finance readiness (5 seconds), category workflow (180 seconds), personalization navigation (60 seconds), en/dark/414 layout evaluation (60 seconds), ms/light/390 screenshot (60 seconds). Default fixture suite, one worker; no new skips/retries. |
| Continuation: affected five, diagnostic config with trace on, `--repeat-each=3` | PASS, 15/15 (4.7 minutes) | Fresh fixture bundle, original assertions/deadlines; all retry indices 0. |
| Continuation: full default config, optional timing reporter, two invocations | PASS, 73/73 twice (7.0 / 7.1 minutes), exits 0 | Fresh build/server/browser lifecycle each run; all 146 retry indices 0, no new skips. Includes original WCAG, paused contrast, finance/Auth and every viewport case. |
| `npm run test:responsive` | PASS, 341 checks / no browser errors | Final source; English/light and Malay/dark across 320–1440 px, dialog and short-screen cases. |
| `npm run build` | PASS | Final source; entry 496.49 KB (gzip 144.47 KB). No production deployment. |
| `npx eslint e2e/enhancements.spec.ts e2e/periods-colors.spec.ts e2e/focused-upgrade.spec.ts` | PASS on final files | Targeted browser lint; source lint already passed. |
| `git diff --check` | PASS on final handoff | No whitespace errors; Windows LF/CRLF notices are informational. |

The first native run caught the fixture's overly strict zero representation
(`0.00` versus native aggregate `0`); its assertion now accepts exact zero text at
either scale. It changed no monetary computation. The corrected native run passed.
Ignored local logs are `phase1-{typecheck,lint,test,test-db,test-platform-db,
test-foundations-db,test-period-db,native}.log`; browser/build logs follow below.
Historical CI remains failed; no remote run, push or deployment was triggered.

The first full financial-packet run is retained in `phase1-final-test-e2e.log`:
profile-default reached its later settings navigation at the 60-second deadline;
category-color reached Transactions after theme checks at 60 seconds; the eight
axe scans exceeded their 120-second total during `analyze()`. Metrics regression's
error context shows “Memuatkan kewangan anda…” rather than metrics at its 5-second
readiness check. Swipe did not open after raw CDP events. This host has 3,927,032 KB
total RAM; free RAM was 126,352 KB during the run and 15,232 KB at completion. No
task-owned Node/PostgreSQL/PostgREST process remained after shutdown.

Repairs are limited to fixtures: mark the two complete multi-navigation workflows
slow (180-second totals), give the eight-scan case 240 seconds, wait 20 seconds for
metrics data, and control swipe `Date` time at 200 ms while additionally verifying
the 700 ms rejection boundary. No timeout retries, skipped assertions or product
gesture-threshold changes. CDP latency entering the 700 ms gate is an inference
from the raw input calls and product code, not a measured duration from the failed
run. The clock fixture removes that ambiguity and exercises both duration cases.
[Playwright clock reference](https://playwright.dev/docs/api/class-clock#clock-set-fixed-time)
confirms fixed `Date` values keep timers running; animations still run normally.

The later three-case recheck additionally waits for actual transaction badges and
the WCAG card (20 seconds), preserving color/accessibility values, and permits
120 seconds for the paused axe case. It passes in 3.7 minutes. The transaction
failure snapshot showed a zero/empty fallback while Accounts still loaded;
`Transactions.tsx` currently renders `result.data?.rows ?? []` during that pending
state. The test now waits for the expected row; no stored records vanished. Clearer
pending-versus-empty UX can be a separate packet after baseline acceptance.
Logs: `phase1-timing-recheck.log`, `phase1-accessibility-recheck.log`,
`phase1-browser-lint.log`, `phase1-final-test-responsive.log`, `phase1-final-build.log`.
The initial clean full suite is retained in `phase1-clean-test-e2e.log` and exited 1:
68 passed / 5 failed in 47.7 minutes. Exact failures at that checkpoint:

| Location / case | Observed failure |
| --- | --- |
| `e2e/foundations.spec.ts:7`, timezone boundary | `Tracked net flow` absent at the 5-second readiness check; snapshot already shows September 2026 / `2026-09` but the finance panel is still loading. |
| `e2e/periods-colors.spec.ts:61`, category identity | 180-second workflow deadline at later Add category click, after chart/theme/transaction badge checks. The complete focused workflow previously passed. |
| `e2e/enhancements.spec.ts:240`, personalization | 60-second workflow deadline during later Overview navigation. |
| `e2e/enhancements.spec.ts:392`, en/dark/414 | 60-second deadline during overflow `page.evaluate`; no false overflow result was returned. |
| `e2e/enhancements.spec.ts:392`, ms/light/390 | 60-second deadline during screenshot after fonts loaded. |

Memory pressure is a plausible contributor, not a proven common root cause. No
additional blanket deadline increases or product changes were made to mask these
failures at that checkpoint. The original historical contrast defect passed, but
the full browser baseline was not accepted then. The user-authorized continuation
below recovers the baseline without ledger schema or release work. That initial
checkpoint contained 21 packet files (18 tracked edits and three additions).
The final tree contains 25 files (19 tracked edits and six additions), including
the continuation file list below, on `codex/phase1-stabilization`; no commits/pushes.

### Browser stabilization continuation — 10 October 2026

The earlier 68/73 clean-run checkpoint above is retained as historical evidence.
This continuation changes the browser harness and diagnostics only; no additional
application, financial SQL, dependency, authorization or security code changed.

**Diagnosis.** The old config started Vite development mode and permitted reuse
of an existing server. Fixture HTTP routing disables browser HTTP caching
([Playwright routing reference](https://playwright.dev/docs/api/class-page#page-route)).
Consequently every full navigation/reload downloaded and evaluated the unbundled
development graph. The reproduced personalization failure has 487 local requests
across five page loads, including 5.1 MB Lucide and 2.3 MB Zod development modules.
Navigation/reload calls take 3.1–5.0 seconds; the final `.snapshot` 5-second
visibility assertion fails. Its later failure screenshot already contains the
rendered snapshot. Mocked financial requests returned 200; this evidence shows
late loading, not a wrong amount or rejected financial write.

The old config did not record traces/failure screenshots, so the exact scheduler
stall at each of the original five deadlines cannot be reconstructed. The five
error contexts, original log, existing successful screenshots and new action,
network, console and screenshot artifacts were inspected. Do not present an
unmeasured original CPU/memory cause as proven. The controlled experiment recovers
the same readiness failure and demonstrates a reproducible harness cost.

| Original failure | Classification and exact observed boundary |
| --- | --- |
| Timezone, `foundations.spec.ts:7` | Finance readiness after a full load; expected September/month value was already correct. Passed unchanged in controlled dev and bundle runs. No reproduced timezone computation defect. |
| Category color, `periods-colors.spec.ts:61` | Cumulative 180-second deadline at a later action, after color/theme checks. Controlled dev completes in 94.3 seconds; pre-fix bundle completes in 33.7 seconds. No changed color assertion. |
| Personalization, `enhancements.spec.ts:240` | Original 60-second navigation deadline; controlled dev instead reproduces the final 5-second snapshot-readiness failure in a 44.7-second case. Later screenshot shows the requested snapshot. Bundle passes unchanged in 15.8 seconds before other fixture fixes. |
| en/dark/414 layout | Original 60-second deadline during `page.evaluate`; it never returned an overflowing width. Same evaluate/assertions pass in controlled dev and bundle. Historical stall is unobservable beyond the saved deadline/snapshot. |
| ms/light/390 screenshot | Original 60-second deadline during screenshot after fonts loaded. Same full-page captures pass in controlled dev and bundle. Historical stall is unobservable beyond the saved deadline/snapshot. |

**Measured conditions and experiment.** Windows 10.0.26300.9550, Node 24.19.0, Playwright 1.63.0,
headless installed Edge, four logical CPUs, 3,835 MiB physical memory, one worker,
one suite at a time; existing desktop apps left open. No process was killed, RAM
allocated artificially, CPU affinity changed, or machine/provider setting changed.
Read-only Windows counters sample CPU, available memory, hard page-fault input,
page-read operations and committed memory approximately every five seconds, plus
aggregate Node/Edge working sets. Values below cover test begin through run end,
not the preceding build. Whole-host counters do not attribute every stall to the
test or distinguish page-file reads from mapped-file hard faults.

| Experiment, no test/assertion changes | Result | Sampled resource evidence |
| --- | --- | --- |
| Original dev harness, all five, trace on | 4 PASS / 1 FAIL, 3.5 minutes | Available memory min/median 336/435 MiB; CPU median/p95 93.8/100%; hard-fault pages input median/p95 9,523/73,559 per second; 37 samples. |
| Same fixture app as a fresh build, all five, trace on | 5 PASS, 1.4 minutes | Available memory min/median 391/491 MiB; CPU median/p95 99.6/100%; pages input median/p95 8,983/35,008 per second. High pressure persists: RAM alone is not a sufficient explanation. |
| Return to dev, personalization + timezone twice | 4 PASS, 1.5 minutes | Personalization 27.0/22.3 seconds. Confirms variable readiness rather than a deterministic calculation/authorization failure. |
| Final bundle harness and isolated WebSockets, all five three times | 15 PASS, 4.7 minutes, retry index 0 throughout | Available memory min/median 331/429 MiB; CPU median/p95 98.4/100%; 5-second samples still show hard-fault activity. Full traces retained for all 15 cases. |
| Final full default suite, first fresh build | 73 PASS, 7.0 minutes, exit 0 | 75 samples; available memory min/median 380/447 MiB; CPU median/p95 100/100%; pages input median/p95 4,384/24,012 per second. |
| Final full default suite, second fresh build | 73 PASS, 7.1 minutes, exit 0 | 75 samples; available memory min/median 379/427 MiB; CPU median/p95 100/100%; pages input median/p95 5,639/59,567 per second. |

The build-only comparison reduced personalization local resources from 487 to 81
and category-workflow resources from 723 to 133. It passed before the WebSocket
fixture correction, isolating the bundle's benefit from that second change. This
supports reducing the harness workload, not inventing a production optimization or
claiming a precise RAM threshold. Repeated final-code and full-suite results follow.

Final repeated durations (seconds): personalization 11.0/9.6/12.9; timezone
6.0/14.3/5.4; category identity 74.8/42.0/27.9; en/dark/414 layout
3.4/3.3/3.9; ms/light/390 layout/screenshots 3.9/5.4/4.1. These are synthetic
workflow timings, not field performance or Web Vitals. No new application defect
was established in these five cases. The original opacity defect remains fixed.
The 15 retained traces show no Realtime DNS errors after the socket fixture fix.
Remaining console errors are nine local rates-API 404s in the three timezone runs
and three deliberately mocked category DELETE 409s. Native-currency reporting
continues through the explicit rates-unavailable state; preview does not execute
Vercel serverless functions. Those errors were inspected, not suppressed.

**Minimal fixes and exact continuation files.**

| File | Change |
| --- | --- |
| `scripts/e2e-server.mjs` | Build current source with fixed synthetic public-provider configuration, require successful build exit, then preview the bundle on loopback/strict port. Fresh build each invocation; no stale dist reuse. |
| `playwright.config.ts` | Use that local server, reject an already-listening server, retain traces and screenshots on failures. Workers, tests, deadlines and retries are unchanged. |
| `e2e/fixtures.ts` | Route synthetic Realtime WebSockets and acknowledge join/leave/heartbeat using the installed client's protocol. The dev trace recorded repeated fixture-host DNS failures; HTTP interception did not cover them. This fixture makes no server connection and emits no database changes. |
| `scripts/browser-diagnostic-reporter.ts` | Optional action/assertion/test timings, available RAM and retry index; no request headers/bodies or environment values. |
| `scripts/measure-browser-resources.ps1` | Read-only Windows resource sampler; exits when the caller creates its stop marker. |
| `docs/phase1-stabilization.md` | This diagnosis, measured evidence, reproducible commands and acceptance recommendation. |

There are no test assertion removals, retries, new skips, gesture changes, or
timeout increases in this continuation. The inherited opt-in deployed-site spec
remains excluded. [Vite preview](https://vite.dev/guide/static-deploy#testing-the-app-locally)
serves a local build; it is not a Vercel/serverless acceptance test. The mocked
Realtime handshake proves fixture isolation, not live subscriptions or provider
authorization. Financial computations, RLS/session/MFA and SQL remain unchanged.

**Artifacts and reproduction.** Original artifacts are preserved under
`.cache/phase1-diagnostics/prior`. Controlled runs are `dev-before`,
`preview-before`, `dev-confirm`, `bundle-repeat`, each with log, trace ZIPs and
`steps.ndjson`; `resources.ndjson` records the aligned counter stream. These are
ignored local artifacts containing synthetic data only. Traces were inspected
with the installed `npx playwright trace open/actions/requests/console` commands
and ZIP/JSON summaries; [Playwright trace reference](https://playwright.dev/docs/trace-viewer).

For a future controlled local rerun, use two terminals in this checkout. Confirm
port 5173 is free and no `PRISM_E2E_BASE_URL`, `PRISM_E2E_STORAGE_STATE` or alternate
Supabase fixture override is set. Do not point these commands at a live provider.
Create `artifacts` if absent, then start the read-only sampler in terminal 1:

```powershell
New-Item -ItemType Directory -Force artifacts | Out-Null
powershell.exe -NoProfile -File scripts/measure-browser-resources.ps1 `
  -OutputFile artifacts/browser-resources.ndjson `
  -StopFile artifacts/browser-resources.stop
```

Use a new output/stop filename if the marker already exists. In terminal 2:

```powershell
npm run test:e2e -- --grep 'default reporting month|category color create|personalization persists|en/dark/414px|ms/light/390px' --repeat-each=3 --trace on
npm run test:e2e -- --reporter=line,./scripts/browser-diagnostic-reporter.ts
Set-Content -LiteralPath artifacts/browser-resources.stop -Value done
```

The reporter is optional and the default failure artifacts are always retained.
The full runs use the checked-in config; the diagnostic comparison config only
selected dev/preview servers and trace output, without changing deadlines.
In this run, `PRISM_BROWSER_DIAGNOSTICS` selected separate local timing files
`.cache/phase1-diagnostics/full-{1,2}/steps.ndjson`; logs are `full-{1,2}.log`.
Summary JSONs retain aligned sample distributions. Both resource samplers exited
normally after their stop markers; no diagnostic/background server is left running.

| Final continuation check | Result / evidence |
| --- | --- |
| `npm run typecheck` | PASS, `check-typecheck.log`. |
| `npm run lint` | PASS, `check-lint.log`. |
| `npm run test` | PASS, 76 tests / 7 files, `check-test.log`. |
| Browser/config/reporter standalone strict typecheck | PASS with repository-compatible ES2022/DOM libraries, `check-browser-types-corrected.log`. First command accidentally omitted that library setting and reported the existing array `.at()` call; no source fix or assertion change was needed. |
| `node --check scripts/e2e-server.mjs` | PASS. |
| `npm run test:responsive` | PASS, 341 checks / no browser errors, `check-test-responsive.log`. This independent existing harness still uses development module mocks; it was not changed into the bundle E2E harness. |
| `npm run build` | PASS, `check-build.log`; fixture public environment, entry 496.49 KB / gzip 144.46 KB. |
| All DB/native gates | Earlier Phase 1 passes retained, not rerun in this continuation: no financial/application/database code changed. Synthetic/native/provider limitations above still apply. |

Check logs reside in `.cache/phase1-diagnostics`. The first combined check runner
exited 1 solely for the misconfigured supplementary typecheck; every npm gate
passed, and the corrected standalone command exited 0. This is recorded rather
than presenting that runner itself as a clean exit.

**Final recommendation:** accept the local Phase 1 implementation/fixture baseline.
The root cause established for the reproduced readiness failure is costly uncached
development loading under measured pressure; Realtime DNS attempts were a separate
fixture isolation defect. The other historical deadline stalls cannot be uniquely
attributed without their missing traces, but every unchanged case now passes three
times and in two complete runs. No new financial/security defect was established.
Remote CI, Linux Chromium, live rates/Realtime/Auth, production PostgreSQL 17 and
physical-device/field performance are not proven by these Windows fixture runs.
The proposed debt guard is still unapplied; no production protection claim follows
from local acceptance. Phase 2 and all external actions retain their approval gates.

### Migration / release review plan

The new migration is an **unapplied file**. It changes no stored monetary data,
timestamps, relationships, RLS policies or client grants. It adds a private
empty-search-path invoker trigger and revokes its standalone client execution.
DELETE locks the debt parent, while repayment insertion locks the same parent;
native READ COMMITTED tests prove the later history check sees the committed
repayment. Administrative/confirmed whole-Auth-account erasure retains the
existing privileged contract. Service/admin deletion is outside this client guard.

Before any approved external application: reconcile historical version differences
and the private remote self-delete overload; record schema/provider version and
restore capability; rehearse the single forward addition on an authorized staging
copy with synthetic or appropriately controlled data. Exercise existing-history
deletion denial, empty-debt deletion, concurrent insert/delete, session/AAL denial
and confirmed whole-account erasure. Compare row counts/native totals before and
after; trigger creation must change none. Review backups/restore separately before
production. Review final GitHub CI and align the intended Vercel SHA only after an
approved source release. Do not use migration reset or timestamp repair.

Rollback is a separately reviewed forward transaction dropping the new trigger
and function, as specified in the migration README. This proposal has no data
transformation to reverse. Removing the guard permits history deletion again;
later erased records require a verified restore/reconciliation plan, not rollback
SQL. Local frontend changes can be reverted independently. None of these release,
staging, Auth, domain or migration actions have been performed.

### Acceptance and Phase 2 gate

| Phase 1 criterion | Status | Evidence / limit |
| --- | --- | --- |
| Exact original CI failure explained and causal repair | PASS | Original job log plus failing paused-opacity fixture; fixed paused contrast and original WCAG scan pass in focused and final clean runs. |
| Exact native transport, four currencies | PASS | Positive/bounded transaction schema, native/PostgREST decimal strings and zero/negative/overflow/precision denial. No authoritative currency float introduced. |
| Cash conservation; principal/earmark/budget/future separation | PASS | Full replay and native fixtures plus existing timezone/DST tests; Recent progress fixture excludes future dates. |
| Cross-user/session/MFA denial | PASS locally | Synthetic Auth schemas, native owner sessions, invoker HTTP anonymous denial; provider OAuth/email/recovery delivery not tested live. |
| All applicable repository gates | PASS locally | Type/lint/76 unit/341 responsive/build checks pass; full E2E 73/73 twice, affected cases 15/15. Earlier unchanged DB/native passes retained, with fixture/provider boundaries explicit. |
| No external writes | PASS | Metadata/catalog/advisors/migration inspection only; no push/PR/deploy, remote data or setting changes. |
| Actual model and Phase 2 matrix delivered | PASS | Canonical source/projection matrix above; historical exceptions retained. |

Phase 2 ledger implementation is **NO-GO pending reconciliation design**. Passing
local Phase 1 checks cannot supply missing origination/equity, card liability,
historical fees, transaction-to-link allocation semantics, or cutover mappings.
There is no new ledger/backfill here and no full balance-sheet identity claim.

Verification recovery is complete locally: affected cases pass three times and
two fresh-build full default suites pass. For any new failure, retain its trace,
sample resources and investigate the exact stage rather than assuming RAM pressure
or extending deadlines. Remote CI and release rehearsal remain separate gates.

The current authorized next packet is the Git integration readiness review below.
The following historical mapping/reconciliation specification remains deferred:
covering opening equity, unassigned rows, debt origination/interest, bundled legacy
fees, native FX and mutable-record corrections; pair it with a decision on durable
import identity (changed payload/order and deletion receipts). Owner approval of
those semantics is required before ledger/backfill implementation. Follow-up
transaction/repayment archive/reversal protection and build-tool advisories belong
in separate tested packets. Leaked-password settings, staging/provider writes,
GitHub push/PR and Vercel release each require new explicit authorization.

### Refreshed issue register

| ID | Current evidence / disposition |
| --- | --- |
| F01 | Original CI contrast defect repaired; original WCAG/fixed paused scan pass. Continuation restores full default E2E: 73/73 twice, zero retries. No remote CI run was triggered by this work. |
| F02 | Main/production SHA drift reverified; release alignment deferred. |
| F03 | No active balanced journal in replay/catalog; reference proposal is historical. |
| F04 | Authenticated parent-debt history deletion blocked in local UI/preflight/proposed DB guard; individual mutable removals remain. Production guard is unapplied. |
| F05 | Leaked-password protection remains disabled; setting change deferred. |
| F06 | Existing signed-out entry remains authentication; marketing work is outside Phase 1. |
| F07 | `dashboard.ts` / `analytics.ts` savings rate remains ordinary income-minus-expense surplus divided by income. It does not prove physical savings or earmark funding; label/design decision deferred. |
| F08 | Historical migration versions and transaction-link/FX/origination mapping need reconciliation. |
| F09 | Manifest/icons retained; complete PWA/offline lifecycle and physical-device acceptance not established. |
| F10 | Fourteen unused-index informational notices retained; no plan-based removal proposed. |
| F11 | WCAG passes in both final full runs; 341 responsive checks pass again. Local browser baseline accepted under documented conditions; provider/device/remote CI boundaries remain. |

## Final integration readiness — 10 October 2026

**Decision: ready for a separately authorized local commit of the reviewed Phase 1
files; not authorized for push, PR creation, merge, migration or deployment.**
The complete tracked diff and all six untracked candidate files were read. This
review updates this document only; accepted application, SQL, fixtures and harness
code are unchanged. HEAD remains `819ddef0e8a3b9aad07475ff495152e4d2ea9156` on
`codex/phase1-stabilization`. The index is empty. Read-only `git ls-remote origin
refs/heads/main` confirms main still points to the same SHA at this checkpoint.
No fetch, rebase or merge was needed; this does not promise the remote will remain
unchanged before a later authorized push.

### Complete candidate inventory and scope

`M` means an unstaged tracked modification; `??` means a new untracked file proposed
for addition. There are **19 modifications, 6 additions, 0 deletions, 0 renames and
0 staged files**. Every candidate belongs to Phase 1. Commit numbers refer to the
plan below; no commit or staging action has been performed.

| Status | Exact repository-relative path | Phase 1 purpose | Commit |
| --- | --- | --- | --- |
| M | `README.md` | Actual model, local history guard and evidence link | 4 |
| M | `e2e/enhancements.spec.ts` | Paused-contrast regression, explicit swipe timing, documented WCAG readiness/deadline | 3 |
| M | `e2e/fixtures.ts` | ID/debt filters and pagination; local Realtime protocol handshake | 2 |
| M | `e2e/focused-upgrade.spec.ts` | English/Malay and stale-cache debt denial; await actual DELETE completion | 2 |
| M | `e2e/periods-colors.spec.ts` | Preserve color/period assertions with documented workflow/readiness allowances | 3 |
| M | `playwright.config.ts` | Fresh fixture bundle, strict server identity, failure artifacts | 3 |
| M | `scripts/foundations-db-test.mjs` | Exercise the new integrity cases during full replay | 2 |
| M | `scripts/real-postgres-test.mjs` | Observed native locks, retries, exact HTTP transport and debt guard/erasure tests | 2 |
| M | `src/App.test.tsx` | Query-snapshot fixture and future Recent progress regression | 1 |
| M | `src/components/financial/Debts.tsx` | Disable parent deletion when cached repayments exist | 2 |
| M | `src/components/financial/Overview.tsx` | Exclude future Recent progress entries at query snapshots | 1 |
| M | `src/components/financial/copy.ts` | Malay safety copy for the debt dialog | 2 |
| M | `src/domain/transport.ts` | Require positive, bounded, native exact transaction amounts | 1 |
| M | `src/domain/upgrade.test.ts` | Four-currency transport bounds and rejection cases | 1 |
| M | `src/hooks/useFinanceData.ts` | Use the same checked transport for transaction reads/rereads | 1 |
| M | `src/hooks/usePlatformData.ts` | Check complete server repayment history before parent DELETE | 2 |
| M | `src/styles.css` | Preserve analytics label opacity during entrance motion | 3 |
| M | `supabase/migrations/README.md` | Unapplied forward guard, drift and recovery gates | 4 |
| M | `vite.config.ts` | Ignore locked generated binaries/reports during development watch | 3 |
| ?? | `docs/phase1-stabilization.md` | Evidence, acceptance boundaries and this integration report | 4 |
| ?? | `scripts/browser-diagnostic-reporter.ts` | Optional synthetic action/test timing and retry evidence | 3 |
| ?? | `scripts/e2e-server.mjs` | Build fixed fixture configuration before loopback preview | 3 |
| ?? | `scripts/measure-browser-resources.ps1` | Read-only Windows CPU/memory diagnostic sampler | 3 |
| ?? | `scripts/phase1-integrity-test.mjs` | Isolated money, history, owner/session/MFA regressions | 2 |
| ?? | `supabase/migrations/20261009162324_protect_debt_repayment_history.sql` | Unapplied private invoker deletion guard | 2 |

The lockfile, package scripts/dependencies, public schema types, Auth implementation,
production API, Vercel configuration, CI workflow, manifest/icons and ledger
reference files are unchanged. There are no Phase 2 schema or backfill additions.

Ignored local items remain outside the commit: `.cache/`, `artifacts/`, `dist/`,
`node_modules/`, `test-results/`, `supabase/.temp/` and root `*.log` files. These
include synthetic traces/screenshots, diagnostics, native binaries and prior
read-only inspection logs. `git check-ignore` confirms the diagnostic manifest,
bundle, browser output and logs are ignored. No generated path is tracked. Do not
force-add ignored files or upload provider inspection logs with the PR.

### Secret, debug, financial and security review

Manual review plus redacted pattern scans of all 25 candidates found no private
keys, provider credentials, service-role JWTs or hard-coded external connection
passwords. Only `.env.example` exists and it is unchanged. No actual environment
file, browser storage state, `.vercel` file or production key is a candidate.
The one connection-pattern match was the existing native runner's template using
`server.options.password`: that password is generated with `randomUUID()` for an
isolated local cluster, and PostgREST binds to `127.0.0.1`. The fake browser key and
synthetic token are test data. This is a scoped source review, not a certification
that every historical commit is secret-free.

No `debugger`, `console.log`, `console.debug` or `console.trace` was found in the
reviewed production source files. Test PASS logging and the optional diagnostic
reporter are intentional. Reporter action titles/errors and browser traces may
contain fixture inputs; keep this tooling on synthetic tests and review artifacts
before any sharing. The source scan and SHA-256 manifest are saved locally in
`.cache/phase1-diagnostics/integration-audit.json`; the scanner emits locations and
classifications, not secret values.

The complete diff intentionally changes three financial behaviors:

- Recent/create/update transaction reads now fail closed for invalid exact text,
  precision, range, currency or non-positive amounts. Signed/zero opening balances
  are unaffected. Native arithmetic, original FX, transaction classification and
  optimistic settlement logic are unchanged.
- Recent progress excludes timestamps after each query's `dataUpdatedAt`. A record
  reaching its date while the page stays idle becomes visible after the existing
  refetch mechanism advances that snapshot; no autonomous posting/timer was added.
- Parent-debt deletion is blocked by cached history, followed by an authoritative
  server preflight. The unapplied DB trigger is needed for the concurrent race.
  Empty debts and privileged confirmed whole-account erasure remain supported.

No unintended balance/currency/category/ownership change was found. Transaction,
transfer and individual repayment removals remain mutable existing behavior;
there is no immutable reversal journal. RLS, owner/session/MFA checks, invoker
views, Auth storage and grants are not relaxed. The proposed trigger uses invoker
permissions and an empty search path, revokes standalone client execution and
checks `current_user = 'authenticated'`. Service/admin deletion is deliberately
outside this guard; production self-erasure compatibility still needs staging
validation against its historical overload/owner. Local tests cover the local
replay path, not that provider path.

### Browser determinism and explicit deadline disclosure

Resolved configuration was inspected with `npx playwright test --list
--reporter=json`: **73 tests, one worker, zero retries, 60,000 ms default deadline,
no config errors**. No `PRISM_E2E_BASE_URL`, `PRISM_E2E_STORAGE_STATE` or
`PRISM_E2E_SUPABASE_URL` override was present. The sole excluded deployed-site spec
was already opt-in at HEAD. No skips, fixmes or retry settings were added.

The fresh build forces fake public-provider configuration in the test process,
checks build exit status and serves only loopback on strict port 5173. Existing
servers cannot be reused. Each test resets the synthetic row baseline and installs
HTTP/WebSocket routes before navigation. The socket fixture acknowledges the
installed client's join/leave/heartbeat protocol without connecting to a server
or emitting data changes. ID/debt filters and pagination support actual preflight
and read behavior. These mocks do not prove RLS or live subscription delivery.
The category/timezone clock and controlled swipe keep timers/animations active;
the 700 ms product rejection case is additionally asserted.

**Preservation is exact for the browser continuation, not for all deadlines since
HEAD.** Every original assertion/value remains, and retries remain zero. The full
Phase 1 diff contains these earlier, locally accepted allowances; disclose them
in the PR rather than claiming every original deadline is identical:

| Case | HEAD / previous allowance | Current allowance | Recorded reason/evidence |
| --- | --- | --- | --- |
| Profile default across reloads/new context | 60-second workflow | `test.slow()`, 180 seconds | Historical failure at later navigation; corrected focused and two full runs pass |
| Category identity across themes/surfaces/deletion | 60-second workflow | `test.slow()`, 180 seconds | Historical failure after theme checks; final repeated maximum 74.8 seconds, all assertions retained |
| Original multi-route WCAG scan | 120-second workflow | 240 seconds | Eight scans and locale/theme navigation exceeded the original deadline in retained logs |
| Existing route readiness checks in color/WCAG tests | Default 5-second assertion | 20 seconds at the changed checks | Failure snapshots showed pending route data, not wrong values; values/assertions retained |
| New paused-animation regression | Did not exist | 120-second workflow; 20-second metrics readiness | Added deterministic paused contrast check, never substituted for original WCAG scan |

No further deadline change was made by the bundle/WebSocket continuation or by this
integration review. The accepted 15 repetitions and both 73-test runs exercised
the current configuration. The original missing traces still prevent unique
attribution of every historical stall. Fixture rates-API 404s and intentional
DELETE 409s remain inspected limitations; no console failures were suppressed.

### Pending migration: current status and staging runbook

Read-only inspection in this review of `hyhsppiitijkuvpyswce` returned PostgreSQL
**17.6**, no `20261009162324` migration entry, a null
`to_regprocedure('prism_private.protect_debt_repayment_history()')`, and **zero**
matching debt triggers. The proposal is confirmed **unapplied remotely** at this
checkpoint. Local synthetic replay previously executed its SQL in disposable
databases; that is not a provider application. No replay or migration execution
was performed during this readiness review.

Before a separately approved staging application, identify the exact staging
project/database and approved synthetic data, record the source/migration SHA-256,
and verify its schema matches the intended deployed prerequisites. Reconcile the
three historical version differences listed above without timestamp repair or
baseline replay. Inspect both private self-delete overloads, public wrappers,
owners, definer status, empty search paths and grants. Confirm repayment INSERT
still locks its parent via `validate_finance_link`; confirm role names and
owner/session/MFA RLS. Rehearse on PostgreSQL 17 with actual provider Auth/session
and HTTP behavior, as local native evidence is PostgreSQL 18.4/minimal Auth.

Require a recorded restorable backup/PITR point, recovery owner, agreed write
window and restore rehearsal before provider writes. Project backup availability
was not inspected or assumed. Database backups do not restore deleted Storage
objects; include separate object recovery if relevant
([Supabase backup documentation](https://supabase.com/docs/guides/platform/backups)).
Do not create a project/branch, copy private records, buy PITR or alter settings
without the corresponding approval.

The following are **proposed staging validation queries**, not a production test
script. Execute only against the explicitly approved staging target. The absence
query equivalent was the only catalog SQL executed remotely in this review.

```sql
-- Before: record target/version, absence and migration history.
select current_database(), current_setting('server_version');
select version, name from supabase_migrations.schema_migrations order by version;
select to_regprocedure('prism_private.protect_debt_repayment_history()')::text;
select count(*) from pg_trigger
where tgrelid='public.person_debts'::regclass
  and tgname='protect_debt_repayment_history' and not tgisinternal;

-- Before: inspect relevant signatures/owners/security without user records.
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_userbyid(p.proowner) as owner, p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','prism_private')
  and p.proname in ('delete_own_account','session_allowed','validate_finance_link',
                   'protect_debt_repayment_history')
order by n.nspname, p.proname, arguments;

-- Before/after DDL with staging writes quiescent: unchanged rows/native totals.
select 'person_debts' as entity, count(*) as rows,
       md5(coalesce(string_agg(md5(to_jsonb(d)::text), '' order by d.id), '')) as digest
from public.person_debts d
union all
select 'debt_repayments', count(*),
       md5(coalesce(string_agg(md5(to_jsonb(r)::text), '' order by r.id), ''))
from public.debt_repayments r;
select currency, count(*), sum(original_amount)::text as native_principal
from public.person_debts group by currency order by currency;
select r.currency, count(*), sum(coalesce(r.amount,t.amount))::text as native_repaid
from public.debt_repayments r left join public.transactions t
  on t.id=r.transaction_id and t.user_id=r.user_id
group by r.currency order by r.currency;

-- After: one enabled BEFORE DELETE row trigger, invoker/empty search path,
-- and no direct anon/authenticated EXECUTE. Capture and compare definitions.
select t.tgname, t.tgenabled, pg_get_triggerdef(t.oid)
from pg_trigger t where t.tgrelid='public.person_debts'::regclass
  and t.tgname='protect_debt_repayment_history' and not t.tgisinternal;
select p.prosecdef, p.proconfig, pg_get_functiondef(p.oid),
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as auth_execute
from pg_proc p
where p.oid=to_regprocedure('prism_private.protect_debt_repayment_history()');
```

These small synthetic-dataset fingerprints must match across DDL before behavior
tests introduce/delete their own fixture rows. Keep numeric sums separated by
currency and do not fetch real production records into local diagnostic artifacts.
Also compare schema/policy/grant snapshots and other financial table counts/native
balances: only the function/trigger and its execution revoke should differ.

| Authorized staging behavior | Expected validation |
| --- | --- |
| Owner deletes parent with manual, linked or future repayment history | API rejects with SQLSTATE `23514` (local PostgREST returned HTTP 400); debt/history counts and native balances remain identical |
| Owner deletes empty debt | One parent removed; HTTP 200/204 and unchanged unrelated rows/balances |
| Repayment INSERT holds parent lock; concurrent DELETE waits; INSERT commits | Observe lock wait, then history rejection and both records retained under READ COMMITTED |
| Empty-parent DELETE wins before a repayment INSERT | Repayment cannot create an orphan; opposite race ordering must also be rehearsed |
| Other owner / anon / revoked or missing session / insufficient AAL | No unauthorized row visibility or financial writes; repeat relevant permission fixtures |
| Confirmed whole-account erasure on a synthetic staging user | Wrong confirmation rejected; valid verified confirmation revokes/deletes sessions and removes only that user's rows despite parent history |

Native local tests already cover existing-history/empty deletion, INSERT-first
race, import/occurrence concurrency and confirmed erasure. They do not certify
the remote overload or opposite ordering under its deployed schema. Capture query
outputs, HTTP statuses, exact native balances, errors, versions and source SHA.
Application readiness and DB application remain separately approved operations.

**Recovery proposal, not executed:** the forward file wraps DDL in a transaction;
on error roll back and verify catalog/history state before retrying. Do not mark a
failed migration as applied or repair old timestamps. For a successful but faulty
guard, first stop the affected client deletion path through an approved operational
action, then separately review a forward rollback file containing:

```sql
begin;
drop trigger protect_debt_repayment_history on public.person_debts;
drop function prism_private.protect_debt_repayment_history();
commit;
```

After that approved rollback, verify function/trigger absence, unchanged rows and
the restored previous deletion semantics; reconcile its migration-history entry
through the approved migration mechanism. This removes protection and cannot
recover subsequently deleted repayments/cash history. Any data loss requires an
approved restore/reconciliation from the verified recovery point, preferably
rehearsed on an isolated restore before altering the original. A source revert
does not roll back a separately applied database migration. No restore, freeze,
rollback or external write has been performed.

### Proposed local commit plan

Create these four local commits only after explicit authorization. Stage exact
listed paths, inspect the staged diff including new files, and compare the final
tree against the reviewed manifest. Do not use a force-add, `git add .`, a reset
or an opportunistic dependency/formatting update. Shared fixture changes stay with
the debt regressions so their filtering and handshake dependencies are included.

1. `fix(finance): validate exact reads and exclude future recent progress` — the
   five commit-1 paths above, with transport/unit regressions.
2. `fix(debts): preserve parent repayment history` — the nine commit-2 paths,
   including the unapplied forward proposal, client preflight and native/browser
   regressions. This commit does not authorize applying that SQL.
3. `fix(e2e): stabilize Phase 1 browser verification and analytics contrast` —
   the eight commit-3 paths, including documented deadline exceptions and the
   fresh bundled fixture server/diagnostics.
4. `docs: record Phase 1 evidence and integration gates` — the three commit-4
   paths, including this final report, model limits and migration recovery.

The final combined tree is the acceptance unit. Intermediate financial/debt
commits inherit the old failing browser baseline until commit 3. If independently
green commits are required, combine commits 1–3 rather than claiming each has a
clean full-suite baseline. Do not publish intermediate commits/runs separately.

### Proposed pull-request description — draft only

Proposed repository/base: `ismailabs/prism`, `main`; head:
`codex/phase1-stabilization`. No PR has been created.

**Title:** Stabilize Phase 1 verification and protect parent-debt history

**Body:**

Analytics entrance opacity could make the existing WCAG scan fail while financial
labels were partially faded. Metrics now retain readable opacity, with a paused
animation regression. Transaction reads share bounded positive exact-money
validation, Recent progress excludes future entries, and debt deletion checks
cached and server repayment history. A reviewed forward-only private invoker
trigger is included as an unapplied migration to close concurrent parent deletion;
it requires separate staging/application approval.

The browser harness builds the current app with synthetic provider configuration
before loopback preview, rejects stale servers and mocks the Realtime handshake.
Failure traces/screenshots and optional CPU/memory/action diagnostics support
future investigation. Original assertions and zero retries are retained. Earlier
Phase 1 workflow deadlines changed from 60 to 180 seconds for two long workflows,
120 to 240 seconds for the WCAG workflow, and selected readiness allowances from
5 to 20 seconds; the bundle/WebSocket continuation added no deadline increases.

Validation: five affected cases pass three repetitions (15/15), and two fresh-build
full default suites pass 73/73 in 7.0/7.1 minutes without retries. Typecheck, lint,
76 unit tests, 341 responsive checks and build pass. Earlier unchanged PGlite and
native PostgreSQL 18.4/PostgREST 16.4 suites pass, including exact four-currency
transport, owner/session/MFA denial, concurrent debt deletion/retry and confirmed
whole-account erasure. See `docs/phase1-stabilization.md` for commands and limits.

These are Windows/Edge and synthetic database/provider results. Linux Chromium
CI, live Auth/Realtime/rates, PostgreSQL 17 provider rehearsal and physical devices
remain unverified. No data/backfill, immutable ledger or Phase 2 implementation is
included. The DB guard is absent from production; frontend preflight alone still
has a race. Individual mutable record deletion and historical schema/deployment
drift remain documented release risks. No remote changes accompanied local work.

### Verification before commit and remote verification plan

No accepted runtime/test/SQL code changed during this review. The retained logs
were checked again; there is no evidence-based reason to repeat expensive suites
solely for documentation edits. Fresh review checks passed: 73-test config listing,
syntax checks of the two new MJS scripts, candidate secret/debug/artifact inventory,
and whitespace checks. Browser/config/reporter standalone strict typecheck from
the continuation remains valid; normal `tsconfig.json` excludes browser files.

Before an authorized commit, repeat `git status`, full/staged `git diff --check`,
explicit file allowlist/secret review and final-tree comparison. These are source
integrity checks, not a new claim of runtime coverage. Re-run relevant type/lint,
unit, DB, affected repeated E2E/full suite, responsive and build gates if source,
SQL, fixture, dependency or config edits occur, or a rebase/conflict resolution
changes the accepted tree. If only the split/commit metadata changes, keep the
existing final-tree evidence. Do not rerun a linked-provider migration as a test.

After separate push/PR authorization, the unchanged GitHub workflow should run
`npm ci`, typecheck, lint, unit, all four DB gates, native/PostgREST, installed Linux
Chromium E2E, responsive and fixture build on the final PR SHA. Confirm every gate
ran and succeeded; retain run/job URLs, logs and exact SHA. Never treat a skipped
step after an earlier failure as a pass. Investigate failures without retries or
new blanket deadlines. Windows success does not establish Linux CI acceptance.

**CI evidence gap:** `.github/workflows/ci.yml` does not upload `test-results/`, so
the new local failure traces/screenshots would remain on an ephemeral runner.
Recommend a reviewed, SHA-pinned `actions/upload-artifact` step after browser tests,
conditioned on failure, scoped to `test-results/`, with explicit retention and
missing-file warnings. Only synthetic fixture artifacts are suitable; exclude
storage state, env files and provider diagnostics. The
[official action reference](https://github.com/actions/upload-artifact) documents
these inputs. This review leaves CI unchanged; choose this small evidence-capture
addition before the first remote run, then validate the workflow change separately.
It must not add retries or change the test exit status. Its retention/privacy
decision and action SHA belong in the remote-verification approval scope.

**Push/deployment coupling:** the Vercel project identity was confirmed read-only
as `prism`, `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr`, in `ismailstudio`. The connector's
project response does not expose Git linkage, production branch or per-branch
deployment enablement, so this review does not confirm their current policy.
`vercel.json` contains no Git deployment disable rule. Vercel's
[Git integration](https://vercel.com/docs/git) can deploy on branch pushes/PRs;
the repository workflow itself performs tests/builds and no deployment. Thus a
push cannot be promised to be CI-only. Before approval, inspect current Git
deployment settings read-only and either explicitly authorize the resulting
preview behavior or separately approve a narrowly scoped suppression change.
Do not pause/unlink a project, change env variables or bypass deployment protection
to create a CI-only path without approval. Source-only commit approval is safe to
separate from this unresolved external action.

### Risks, remaining unknowns and exact approval gates

| Item | Integration disposition |
| --- | --- |
| Candidate scope/secrets/artifacts | PASS for the 25 reviewed paths; ignored diagnostics/binaries/env state must stay untracked |
| Local acceptance | Accepted by user; 15/15 plus two 73/73 full runs and relevant checks retained |
| Earlier deadline exceptions | Explicitly disclosed; values/assertions/retries preserved, deadlines since HEAD are not all identical |
| Debt migration | Confirmed unapplied on production 17.6; provider staging/backup/erasure/race prerequisites remain gates |
| Current CI | Historical main run failed; the final local tree has no remote run yet; failure-artifact upload is absent |
| Git push/automatic previews | Current Vercel policy not exposed by read-only connector; resolve coupling before push approval |
| Security/provider limits | Synthetic Auth/RLS/Realtime evidence is not live-provider acceptance; existing leaked-password and dev/build advisory findings remain deferred |
| Financial limits | Mutable records, absent complete ledger/reversal semantics and unreconciled historical mappings remain; no backfill or Phase 2 started |
| Resource/device limits | Windows/Edge on the measured 4 GB host; no Linux, field performance or physical-device acceptance inferred |

**Exact next gate:** authorize local staging and the four proposed commits of these
25 explicit paths on `codex/phase1-stabilization`, with final staged/tree review.
That authorization must not be interpreted as permission to push, create/post a
PR, run provider writes or deploy. No additional runtime verification is required
for this unchanged accepted source before those commits.

**Subsequent separate gate:** approve the remote verification route, the CI
artifact retention addition/validation if adopted, current Vercel push side
effects, target `ismailabs/prism` / `main`, and then feature-branch push plus draft
PR creation. Main advancement/conflicts require a fresh integration check. Merge,
staging guard application, production migration/deployment and Phase 2 each need
their own later authorization and evidence. The proposed PR is review text only;
no commit, push, PR, merge, migration, deployment or external setting change was
performed in this readiness review.
