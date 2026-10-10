# P.R.I.S.M. — Phases 1–4 integration handoff

10 October 2026, Asia/Kuala_Lumpur. Integration checkout: `C:/Users/moham/.codex/worktrees/6aee/prism-finance-baseline`, branch `codex/phases1-4-integration`.

**GO for the integrated local baseline. All achievable local functional acceptance criteria pass; no known financial/security P0/P1 defects remain.** This handoff supersedes the paused checkpoint preserved in [the original integration audit](phases1-4-preintegration-audit.md). Acceptance here is strictly local and synthetic, with the development-tool dependency risks disclosed below. No hosted migration, production-data copy, push, PR, deployment, protected-branch merge or Phase 5 work was performed.

## Preservation and Git provenance

The original 80 candidates were reverified against [the byte inventory](phases1-4-source-inventory.json), branch names, original parents and working-tree inventories before staging. There were no inventory/hash mismatches. Only each original phase's audited paths were staged. Staged diffs and whitespace were reviewed; Gitleaks 8.30.1 staged scans returned zero findings. One logical local checkpoint was created per phase under the user's explicit authorization.

| Phase | Original checkout | Parent | Authorized checkpoint | Files |
| --- | --- | --- | --- | ---: |
| 2 | `8081/prism-finance-baseline`, `codex/phase2-ledger` | `72da622305754328f02ec8f5d2ca8b71a221ee17` | `5f07fe20062623d429a0e4fda4fb1ee759a4e063` | 26 |
| 3 | `2ec2/prism-finance-baseline`, `codex/phase3-finance-ux` | `72da622305754328f02ec8f5d2ca8b71a221ee17` | `1c0c5fa98925dd29df3bc0ae9a7ecba4bcf0c068` | 29 |
| 4 | `0afe/prism-finance-baseline`, `codex/phase4-budgeting-debt` | `819ddef0e8a3b9aad07475ff495152e4d2ea9156` | `ba98330e50ca87afb03f58d1fd4bfca92dbc0e78` | 25 |

[Checkpoint evidence](phases1-4-checkpoints.json) includes full roots, tree IDs, exact path sets and preserved-byte checks. All 80 audited source files remain byte-identical to the pre-commit audit; all three original phase worktrees are clean. Phase 1 and `main` were untouched. No original worktree was moved, reset, deleted or overwritten.

```text
819ddef0e8a3b9aad07475ff495152e4d2ea9156
├─ main (unchanged)
├─ ba98330e50ca87afb03f58d1fd4bfca92dbc0e78  Phase 4 checkpoint
└─ 698a2c1e2d4e9eeeb529e66f2b3a8d629e68c91b
   └─ bf691ff0316c1d4176723150b96f6e648b4acae6
      └─ 1653e2f069bb81c01f180e6ec9ee0d4863aaff95
         └─ 72da622305754328f02ec8f5d2ca8b71a221ee17  accepted Phase 1
            ├─ codex/phase1-stabilization (unchanged)
            ├─ 5f07fe20062623d429a0e4fda4fb1ee759a4e063  Phase 2 checkpoint
            ├─ 1c0c5fa98925dd29df3bc0ae9a7ecba4bcf0c068  Phase 3 checkpoint
            └─ codex/phases1-4-integration HEAD + uncommitted integrated content
```

Phase 4 did not contain any of the four accepted Phase 1 commits. The integration branch was created at the exact accepted Phase 1 hash. Checkpoints were applied in 2 → 3 → 4 order using `git cherry-pick --no-commit`. After conflict resolution the sequencer was quit without committing. **Integration HEAD remains Phase 1; checkpoint hashes are content provenance, not newly merged ancestors of HEAD.** Integration commits require separate authorization.

## Complete integration inventory

The original audit and [source inventory](phases1-4-source-inventory.json) enumerate all 105 audited files (25 committed Phase 1 changes plus 80 later-phase candidates), dependencies and migrations. [The final manifest](phases1-4-final-inventory.json) enumerates the final integrated candidate paths and hashes. The complete review patch, including newly added integration files, is `artifacts/integration/integrated.patch`; it is generated with a separate temporary index and does not change the working index or create a commit.

| Area | Integrated behavior and retained boundary |
| --- | --- |
| Phase 1 | Exact financial reads; future-activity exclusions; cash/progress/reporting semantics; debt-parent history guard and native lock races; analytics contrast and existing regression coverage. |
| Phase 2 | Five shadow-ledger tables; immutable, balanced atomic journals; full inverse reversals; durable retry identity; exact decimal and microsecond transport; both explicit TRUE authorization remediations; synthetic translation and independent reconciliation; recovery/staging runbooks. |
| Phase 3 | Public homepage/demo isolation, guarded private routes, safe Auth return destinations, lazy workspace, grouped navigation, onboarding/defaults and retry behavior, English/Malay localization, current-month planning guidance. |
| Phase 4 | Signed rollover, threshold notices, reserve assumptions, recurrence forecasts, debt snowball/avalanche/custom schedules, split previews and stronger parent/repayment history protection. |
| Accounting viewer wiring | Protected `/accounting`, desktop/mobile navigation and command palette reuse the accepted pure ledger/reporting modules and synthetic fixture. It has explicit cutoff/coverage, deferred count, exact equation, bilingual classifications/events/errors, signed-balance and journal-scope explanations, unique journal labels, live result status and invalid-period clearing. It performs no ledger/provider finance query or posting; normal workspace reads retain their existing guards. The standalone loopback viewer remains available as a development tool. |
| Stabilization additions | Shared rollover-aware dashboard derivation; explicit unknown propagation; budget available amount; accessible budget-health region; visible localized history explanation beside the disabled debt deletion control; native installation/upgrade/failure/recovery/reconciliation/recast-race runner; cross-phase unit/browser regressions; separate 100-case adversarial oracle; CI/script union. |

Dependency versions and package-lock bytes were preserved. Lock SHA-256: `87684E891EBDEC9518E3FFDAE0ACB1421D26AF1FF160351F76A4B3BE41CD1EDA`. No feature phase, live ledger adapter, automatic dual write, guessed historical debt split, bank integration, accrual job or FX posting was added. Debt split UI remains a preview.

## Conflict resolutions and discovered defects

Five explicit conflicts arose applying Phase 4:

| File | Resolution |
| --- | --- |
| `.github/workflows/ci.yml` | Union ledger, planning and existing gates; add native integration and adversarial gates. No hosted CI was run. |
| `package.json` | Union all accepted scripts and new integration verification scripts; preserve all dependency versions and lockfile. |
| `scripts/foundations-db-test.mjs` | Retain Phase 1 integrity tests, Phase 3 new-profile/default preservation tests and Phase 4 history-denial expectations. |
| `src/components/financial/Debts.tsx` | Retain Phase 1 cached-history explanation and server-history preflight; retain Phase 4 disabled history deletion, protected monetary terms, preserved trail and debt planner. Make the existing bilingual history explanation visible when the disabled control applies. |
| `supabase/migrations/README.md` | Keep every phase's additive migration/recovery documentation and inherited production-history warnings. No SQL was renumbered or rewritten. |

Automatic merges were reviewed independently: native PostgreSQL runner, exact-money fixture behavior, dashboard/Overview composition, Plans query/back/forward navigation, copy, types and styles. Phase 1 guard SQL, native concurrency/HTTP tests and query-snapshot recent-progress cutoffs remain present.

The audit reproduced a P1 cross-phase inconsistency: Phase 3 compared current spending with the base budget, while Phase 4 compared with available budget after signed rollover. `PlanningHighlights` now derives the complete ordered budget history using `budgetBalances` before selecting the current month; its denominator uses available amount. Phase 4 health/detail uses the same derivation. Threshold advice may appear below 100%; a reached-budget notice continues to mean spending reached the full available amount.

Missing spending is no longer interpreted as zero. Unknown remaining propagates into an adjacent enabled rollover, available amount, remaining amount and forecast balance; it produces an explicit unknown notice, not a healthy/over/reached claim. Opting out or a missing allocation month resets carry as designed. Known amounts continue using bigint minor units, including aggregates exceeding the individual-money bound.

The first complete browser run exposed four incompatibilities: two Phase 1 tests tried clicking a Phase 4-disabled history-delete button; Phase 3 and Phase 4 synthetic transactions omitted the required nullable payment-method field. The history tests now assert the stronger disabled action, visible localized warning, absent permanent-delete control and zero DELETE requests. The server race/preflight assertions remain. Fixtures supply the real nullable transport contract; the production parser was not weakened. Monetary assertions were made more specific to labeled available/remaining definitions after adding the available amount. All four repaired journeys passed before the fresh complete rerun.

## Financial reconciliation evidence

| Scenario | Prior base/spent | Current base/spent | Available | Remaining | Dashboard/health |
| --- | --- | --- | --- | --- | --- |
| Positive carry | MYR 800 / 700 | MYR 800 / 850 | MYR 900 | MYR 50 | No reached notice; no threshold notice at 100%. |
| Negative carry | MYR 800 / 900 | MYR 800 / 750 | MYR 700 | −MYR 50 | Reached notice, over-budget detail and one health notice. |
| Unknown prior spending | MYR 800 / unavailable | MYR 800 / 750, carry enabled | Unavailable | Unavailable | Explicit unknown; no fabricated numeric/healthy/reached result. |

Evidence has three independent levels: deterministic cross-domain unit assertions; real native SQL eligible monthly totals reconciled against both dashboard and budgeting; authenticated browser journeys checking visible health, notice denominator, available/spent/remaining and ordinary period totals. Viewing scenarios preserves legacy source transactions, opening balances, transfers and repayments; exact expected cash is asserted separately. Principal and earmark transactions are excluded from ordinary reporting. Transfers are not expenses; interest is an expense; earmarks have no cash movement. The accounting unit regression reconciles MYR 700 food + 120 interest while excluding 500 transfer, 480 principal and 250 earmark, with an exact zero accounting equation.

The native upgrade fixture fills all 13 legacy tables, including an existing JPY/Malay/Tokyo profile, exact large four-currency openings, ordinary expenses at six-digit timestamps, budgets, cash transfer, standalone principal, objective earmark/milestone, payment method and recurrence. After upgrade, explicit synthetic opening approvals produce shadow reports that reconcile each native exact cash account, remaining debt and objective allocation at zero tolerance. Every comparison is zero. Native SQL independently confirms cash and debt; original legacy balances remain authoritative. This is not a real-data backfill approval.

Actual native/HTTP tests cover exact `90071992547409.93`, JPY canonical text, four currencies, maximum bounds and rejected excessive precision; immutable posting, reversals, atomic failures, retry conflicts and concurrent duplicate/reversal requests; microsecond before/exact/after inclusive cutoffs and offset normalization; explicit TRUE success with NULL/FALSE/session/owner/MFA denial in both privileged ledger functions; RLS, grants, private functions and search paths. Denied operations preserve all ledger and legacy counts. Planning saves preserve cash. Confirmed whole-account erasure still works across ledger and planning history in the disposable fixture.

## Migration dependencies and recovery

The executable chain has 16 unique versions. Exact normalized SQL hashes are in [the audit evidence](phases1-4-audit-evidence.json) and `artifacts/integration/migration-verification.json`.

```text
 1  20260928000200_initial_finance_tracker.sql
 2  20260928031516_personal_finance_platform.sql
 3  20260928032448_exact_money_validation.sql
 4  20260928043611_focused_crud_integrity.sql
 5  20260928082016_harden_self_delete_rpc.sql
 6  20260930135217_financial_foundations.sql
 7  20260930135222_reporting_and_planning.sql
 8  20260930135716_financial_relationship_indexes.sql
 9  20260930141104_canonical_financial_transport.sql
10  20261001033902_analytics_drilldown_filters.sql
11  20261001083346_period_analytics_preferences.sql
12  20261001083350_present_financial_progress.sql
13  20261009162324_protect_debt_repayment_history.sql       accepted Phase 1
14  20261009220402_shadow_double_entry_ledger.sql           Phase 2
15  20261010021500_malaysia_profile_defaults.sql             Phase 3
16  20261010024257_phase4_planning.sql                       Phase 4
```

Phase 2 uses Phase 1's validated ownership/session/money contract and adds separate shadow structures. Phase 3 changes future profile defaults and the existing restricted signup trigger function without backfilling preferences. Phase 4 adds planning metadata/tables and stronger history protection; it does not replace legacy balance views or introduce financial posting. Both Phase 1 parent protection and Phase 4 parent/child protection coexist. Their intended effect is additive; they are not duplicate accounting features.

`test:integration-db` creates a random-password native PostgreSQL cluster on a dynamically allocated loopback port, creates separate clean/upgrade databases and loads only minimal synthetic Auth fixtures. It reads no hosted URL, credential or data. It enforces the accepted SQL manifest and order before execution, rejects unknown/duplicate/out-of-order/mismatched history, and proves clean versus upgraded catalogues agree. It compares schemas, schema ACLs, default privileges, relations/RLS/options/ACLs, columns/defaults, functions/owners/search paths/ACLs, constraints, policies, triggers and view definitions.

For each of migrations 14–16, division by zero is injected immediately before its explicit COMMIT. Actual DDL executes, fails with `22012`, and is rolled back. The complete prior catalogue and canonical database-serialized contents of all 13 legacy tables and exact cash views match their prior snapshots. The correct migration is reapplied successfully and all legacy snapshots remain unchanged; only the intentional new budget columns are excluded from the row comparison. These are three actual transactional failure/recovery tests, not a simulation of a skipped migration. Then reconciliation, rollover and security tests run on the upgraded schema. A separate connection pair observes the repayment-parent lock, commits a repayment and verifies a concurrent monetary debt recast fails while principal/history survive.

This proves transactional local recovery before new financial writes. It does not prove hosted backup/PITR restoration or operator recovery after live ledger writes. The Phase 2 immutable receipt/reversal and recovery runbooks remain applicable.

Historical hosted/local migration version differences remain unresolved by design: local harden-self-delete `20260928082016` is documented remotely as `20260928082111`; local analytics drilldown `20261001033902` as `20261001035741`. Production predates local baseline tracking. Do not replay/reset the baseline or normalize these IDs. No new phase migration was applied remotely.

## Verification and adversarial review

Fresh verification uses Node 24.19.0/npm 11.17.0, locked packages, native PostgreSQL 18.4, PostgREST 16.4 and headless Microsoft Edge. Native and HTTP processes use loopback, synthetic Auth/JWTs and independent connections. Browser tests rebuild the release bundle with fixture-only configuration; deployed-site opt-in variables were not used.

| Gate | Current result / evidence |
| --- | --- |
| `npm ci` | PASS; dependency bytes retained. Native test executables launched successfully despite npm's pending install-script advisory. |
| `npm run typecheck` | PASS; final log `artifacts/integration/final-typecheck.log`. |
| `npm run lint` | PASS; final log `artifacts/integration/final-lint.log`. |
| `npm run test` | PASS, 127 tests in 13 files, repeated after remediation; `final-unit.log`. |
| `test:db`, `test:platform-db`, `test:foundations-db`, `test:period-db` | PASS; exact money, legacy finance, Phase 1 integrity, defaults and period/reporting/ownership behavior. |
| `test:ledger-db`, `ledger:dry-run`, `node scripts/phase2-review-probes.mjs` | PASS; both P1 remediations and zero-tolerance synthetic reconciliation. |
| `test:planning-db` | PASS; migration preservation, exact plans/rollover/reserves, isolation and history protections. |
| `test:postgres` | PASS; actual native connections, observed lock races and PostgREST financial/security/precision/concurrency tests. |
| `test:integration-db` | PASS; clean/upgrade, all three rollback/recovery probes, preserved populated legacy history, native SQL reconciliation and monetary-recast race. |
| `test:integration-review` | PASS; 100 cases with a separate closed-form oracle across all currencies, including negative available budget, zero spending, deficits and immutable inputs. |
| `test:ledger-preview` | PASS; standalone bilingual viewer, exact stock/flow/journals, invalid-period clearing, mobile overflow, axe and no external requests. |
| First complete `test:e2e` | 98/102 passed; four failures preserved in `full-browser.log`, diagnosed and repaired as above. |
| Targeted remediation browser run | PASS, 4/4; `browser-remediation.log`. |
| Fresh complete `test:e2e` | PASS, 102/102, 8.6 minutes; `final-test-e2e.log`. |
| Final expanded cross-phase `test:e2e` | PASS, 6/6, 47.1 seconds; `currency-final-browser.log`. Covers both locales, empty USD/EUR/JPY reports, JPY formatting, return to MYR, keyboard scrolling and financial/authentication checks. Final lint also passes. |
| `test:responsive` | PASS, 361 checks, zero browser errors; repeated after the final viewer correction. English/Malay, 320–1440px, all 12 routes plus dialogs and short viewport; includes accounting route. |
| `npm run build` | PASS; repeated after the final viewer correction with fixture provider configuration. Largest JavaScript chunk about 363 kB; no >500 kB chunk warning. Vite reports informational plugin timing notices. |
| Production dependency audit | PASS, zero advisories, exit 0; `production-dependency-audit.json`. No dependency upgrade was made. |
| Full dependency audit | EXIT 1, 8 inherited dev/build advisories (6 high, 2 moderate), disclosed below; `dependency-audit.json`. |
| Whitespace, staged secrets and preservation | PASS; all checkpoint scans and final combined temporary-index Gitleaks scan have zero findings. All 105 original source hashes unchanged; original worktrees clean. Working index and integration HEAD preserved. Final patch metadata is in `artifacts/integration/final-package.json`. |

After the complete 102-test browser pass, native upgrade/recovery/reconciliation/race, the 100-case oracle, native/PostgREST security/concurrency and six cross-phase browser journeys were rerun and passed. Manual screenshot review caught split monetary figures in mobile ledger tables. The final viewer preserves single-line amounts and provides labeled keyboard-scrollable account/journal regions. Fresh typecheck, lint, six integration browser journeys with money line-box/keyboard-scroll checks, all 361 responsive checks and the optimized build passed after that correction. Native currency empty-state/isolation checks also cover USD, EUR and JPY before returning to MYR. This is documented in [the verification evidence](phases1-4-verification.json), with screenshots under `artifacts/integration/`.

The review revisited the integrated mechanisms independently of the merge: shared money/cutoff boundaries, authorization truth tables, ownership/grants/definer behavior, posting/retry/reversal locks, authoritative legacy reads, planning-only saves, complete budget history/pagination, malformed/missing input, localized routes and public/private isolation. Executable independent native SQL and the closed-form adversarial oracle complement code inspection; this was a separate review pass by the same agent, not a claim of a second human reviewer or hosted review service.

The last added currency tests initially failed their exact label lookup: the nested select label includes option text for that Playwright lookup, although its accessible combobox name is correct. The tests now select the exact accessible role/name and scope the equation status so the separate workspace FX status cannot collide. All currency, zero-balance, formatting and empty-journal assertions remain. The failed 4/6 run is retained in `final-complete-integration-browser.log`; the corrected expanded 6/6 run passes.

No assertion was skipped or financial invariant relaxed. The stronger disabled-deletion assertion and nullable fixture corrections reflect the combined accepted behavior; native denial and conservation checks remain intact. New tests are `src/domain/integration.test.ts`, `e2e/integration.spec.ts`, `scripts/integration-db-test.mjs` and `scripts/integration-review-probes.mjs`.

## Residual risks, external requirements and decision

The integrated local baseline is GO with no known financial/security P0/P1 defects or unmet achievable local functional criteria. Hosted/production/release acceptance is NO-GO pending separately authorized provider, real-data, backup/recovery and deployment verification.

- Accounting is still a shadow implementation. The application laboratory uses synthetic data; existing legacy balances remain authoritative. There is no live historical reconciliation/cutover or authoritative debt split posting adapter. Implementing those capabilities is a separate authorized packet.
- Managed PostgreSQL 17, real Supabase Auth/MFA/OAuth, hosted RLS/default grants, Realtime, backup/PITR and real-record reconciliation were not verified. Minimal native Auth and browser HTTP fixtures cannot establish provider acceptance.
- The unchanged Tailwind/build dependency tree has 8 advisories involving braces/chokidar/fast-glob/micromatch, PostCSS nested/selector parser, source-map-js and Tailwind. These concern hostile patterns, selectors or source maps in tooling; the integrated product does not route user financial inputs into this build pipeline. They remain unremediated; several npm suggestions require a Tailwind major upgrade. Local application acceptance is not a dependency-security certification or approval to process untrusted source trees.
- The optimized build passes without the prior >500 kB chunk warning. Vite plugin timing notices are informational. No performance redesign or framework major upgrade was included.
- The retained standalone development viewer still has the previously documented minor coverage/live-announcement/Malay-label/inspection-state limitations; the integrated guarded viewer addresses the requested application coverage, status, localization and journal-scope behavior.
- Automated axe/reflow and keyboard checks are scoped evidence, not complete manual assistive-technology or physical-device acceptance.
- All integration results remain uncommitted. Local integration commit authorization, remote publication, staging/provider changes and deployment each remain separate boundaries. No hosted/release GO is implied.

Preserve this checkout and the original phase worktrees. Review the complete patch and handoff before any separately authorized integration commit or hosted rehearsal. Original source audit, checkpoint and final candidate manifests provide the provenance for that next review.
