# P.R.I.S.M. Phases 1–4 pre-integration audit and paused handoff

Date: 10 October 2026 (Asia/Kuala_Lumpur). Source snapshot: 2026-10-10T03:41:03.7349287Z.

**NO-GO for an integrated local baseline. Integration is paused before application code changes because all required Phase 2, 3 and 4 implementations are uncommitted.** This is the completed pre-integration audit and proposed integration map, not a completed integration or acceptance handoff.

The user's explicit rule controls this pause: “If required changes are uncommitted, do not move or discard them. Report the required local-commit authorization and pause integration until they can be safely preserved.” No Git commit, staging, branch merge, cherry-pick, push, PR, deployment, hosted database query/mutation, migration application or production-data copy was performed. Original candidate content remains in the original worktrees. The audit ran Git reads, source/handoff reads, hash/whitespace checks and a read-only in-memory comparison of the two budgeting functions. Documentation and audit evidence are the only files added in this chat's checkout.

## 1. Verified original ancestry and preservation boundary

Accepted Phase 1 is exactly `72da622305754328f02ec8f5d2ca8b71a221ee17`.
The older common base is `819ddef0e8a3b9aad07475ff495152e4d2ea9156`.

```text
819ddef0e8a3b9aad07475ff495152e4d2ea9156
├─ main / origin/main (local cached ref)
├─ codex/phase4-budgeting-debt + 25 uncommitted candidates
└─ 698a2c1e2d4e9eeeb529e66f2b3a8d629e68c91b
   └─ bf691ff0316c1d4176723150b96f6e648b4acae6
      └─ 1653e2f069bb81c01f180e6ec9ee0d4863aaff95
         └─ 72da622305754328f02ec8f5d2ca8b71a221ee17
            ├─ codex/phase1-stabilization (clean)
            ├─ codex/phase2-ledger + 26 uncommitted candidates
            ├─ codex/phase3-finance-ux + 29 uncommitted candidates
            └─ chat checkout 6aee (initially clean, detached)
```

The four committed Phase 1 packets, in order:

| Full commit | Subject |
| --- | --- |
| `698a2c1e2d4e9eeeb529e66f2b3a8d629e68c91b` | fix(finance): validate exact reads and exclude future recent progress |
| `bf691ff0316c1d4176723150b96f6e648b4acae6` | fix(debts): preserve parent repayment history |
| `1653e2f069bb81c01f180e6ec9ee0d4863aaff95` | fix(e2e): stabilize Phase 1 browser verification and analytics contrast |
| `72da622305754328f02ec8f5d2ca8b71a221ee17` | docs: record Phase 1 evidence and integration gates |

Phase 4's merge base with Phase 1 is `819ddef0...`; `git rev-list --left-right --count` reports **4 / 0**. Phase 4 contains none of those four Phase 1 commits. Phase 2 and Phase 3 each have zero phase-specific commits beyond accepted Phase 1. Their branch names do not preserve their implementations.

| Phase / checkout | Branch | HEAD | Tracked edits | Untracked files | Staged files |
| --- | --- | --- | ---: | ---: | ---: |
| phase1: `C:/Users/moham/.codex/worktrees/33fa/prism-finance-baseline` | `codex/phase1-stabilization` | `72da622305754328f02ec8f5d2ca8b71a221ee17` | 0 | 0 | 0 |
| phase2: `C:/Users/moham/.codex/worktrees/8081/prism-finance-baseline` | `codex/phase2-ledger` | `72da622305754328f02ec8f5d2ca8b71a221ee17` | 5 | 21 | 0 |
| phase3: `C:/Users/moham/.codex/worktrees/2ec2/prism-finance-baseline` | `codex/phase3-finance-ux` | `72da622305754328f02ec8f5d2ca8b71a221ee17` | 17 | 12 | 0 |
| phase4: `C:/Users/moham/.codex/worktrees/0afe/prism-finance-baseline` | `codex/phase4-budgeting-debt` | `819ddef0e8a3b9aad07475ff495152e4d2ea9156` | 14 | 11 | 0 |

Primary checkout `C:/Users/moham/source/prism-finance-baseline` is clean at `819ddef0...` on `main`. This chat's isolated checkout is `C:/Users/moham/.codex/worktrees/6aee/prism-finance-baseline`, initially clean at accepted Phase 1, detached. No extra worktree is necessary. After preservation, use this checkout for `codex/phases1-4-integration` rooted at the exact accepted commit; do not merge into or change the primary checkout. No integration branch has been created during this pause.

Final Git ancestry currently remains the original ancestry above. There are no new integration commits or integrated source tree.

No repository AGENTS.md was found; the ancestor `C:/Users/moham/.codex/AGENTS.md` is empty. No delegation requirement was present.

## 2. Integration inventory and accepted boundaries

See [the complete source manifest](phases1-4-source-inventory.json) for every candidate's absolute worktree root, relative path, status, size and byte SHA-256, plus package scripts, dependency declarations and SQL hashes. All 80 Phase 2–4 candidates are captured; the 25 committed Phase 1 changes are listed separately.

| Phase | Required packet | Handoff / evidence | Boundary to retain |
| --- | --- | --- | --- |
| 1 | Checked exact reads, future-progress cutoff, parent-debt deletion guard, browser fixture/build stability and accessibility repair | `docs/phase1-stabilization.md` | Accepted legacy finance, native currency, owner/session/MFA enforcement and confirmed whole-account erasure |
| 2 | Five shadow-ledger tables, balanced immutable journals, atomic posting/reversal, durable request identity, synthetic history translation/reconciliation, exact microsecond parser and both fail-closed privileged guards | `docs/phase2-accounting.md`, `docs/phase2-p1-remediation.md`, `docs/phase2-final-review.md`, ADR 0002, recovery/rehearsal documents | Legacy balances remain authoritative; no automatic dual write, historical backfill, FX ledger posting or live cutover |
| 2 viewer | Loopback-only bilingual accounting laboratory and its Playwright/axe test | `scripts/ledger-preview.{mjs,html}`, `scripts/ledger-preview-test.mjs` | Uses synthetic fixture data only, no Auth/provider connection and no posting controls |
| 3 | Guarded routes/lazy workspace, bilingual public homepage/demo, grouped navigation, planning highlights, explicit onboarding retry/partial-save/server-confirmation handling, future MYR/Kuala Lumpur profile defaults and signup language | `docs/phase3-finance-ux.md`, `e2e/phase3.spec.ts`, route/highlight unit tests, identity replay helper | Public/demo never load private queries or mutate finance; returning preferences and exact records stay intact |
| 4 | Exact signed rollover and thresholds, reserve assumptions, recurring forecasts/category selection, fixed-rate debt schedules (snowball/avalanche/custom), manual principal snapshots, split previews and broader repayment-history protection | `docs/phase4-budgeting-debt.md`, planning domain/browser/DB tests | Plans/previews do not move cash, post interest, infer debt splits or become authoritative legacy balances |

All four copies have the same dependency declarations and identical package-lock byte SHA-256:
`87684E891EBDEC9518E3FFDAE0ACB1421D26AF1FF160351F76A4B3BE41CD1EDA`.
No package/dependency upgrade is needed for merging these packets. Current installed command versions: Node `v24.19.0`, npm `11.17.0`. This checkout has no installed node_modules; dependency installation belongs to the post-preservation verification setup.

Union the Phase 2 scripts `test:ledger-db`, `ledger:dry-run`, `ledger:preview`, `test:ledger-preview` with Phase 4 `test:planning-db`; preserve every existing gate. The tracked `scripts/phase2-db-test.mjs` is an obsolete reference to nonexistent baseline/migration files, not the accepted Phase 2 implementation or an active package gate. Do not resurrect its old migration proposal.

Phase 2's current 26 candidate hashes exactly match `artifacts/phase2/p1-final-source-manifest.json`. Phase 3's current 29 exactly match `artifacts/phase3/final-source-manifest.json`. In particular, the corrected Phase 2 SQL hash is
`0C89AD1DE837CB7ED79F9A0C0042939E1FAA05B7593A96B02A049720CAB840FE`, matching its P1 remediation handoff. No equivalent final Phase 4 hash manifest was used to establish historical gate/source correspondence; this audit captures its current tree.

## 3. Overlap map and proposed resolutions

These are planned resolutions; **no conflict has been resolved or applied yet**. Taking a whole Phase 4 file would risk losing accepted Phase 1 behavior.

| Overlap | Findings / resolution required after preservation |
| --- | --- |
| `src/components/financial/Overview.tsx` (1/3/4) | Retain Phase 1 per-query refreshed timestamp cutoffs for recent progress, Phase 3's account/spendable-cash disclosure, and Phase 4 budget health. Phase 4's source still has the older unfiltered recent feed. |
| `src/components/financial/Debts.tsx` (1/4), `copy.ts` (1/4) | Retain Phase 1 cached-history disabled confirmation, localized warning and server preflight; incorporate Phase 4 planner, immutable repayment UI and restrictions on debt monetary recasting. Preserve empty-debt deletion and explicit whole-account erasure. |
| `src/components/financial/Planning.tsx` (3/4) | Preserve Phase 3's URL section, popstate and protected deep links while replacing the basic budget panel with Phase 4 AdvancedBudgets and retaining its optional recurring category. |
| `scripts/foundations-db-test.mjs` (1/3/4) | Keep Phase 1 integrity invocation, Phase 3 before/after profile-defaults hook at its migration position, and Phase 4 no-repayment-delete expectation. Historical subset tests remain explicitly historical; full-chain tests must enforce the new guard. |
| `scripts/real-postgres-test.mjs` (1/2/4) | Union Phase 1 observed-lock/deletion/import/occurrence/HTTP checks, Phase 2 ledger concurrency/rollback/microsecond/NULL-denial and erasure checks, and Phase 4 exact planning/cash-conservation/history checks. Do not replace this runner with Phase 4's older version. |
| `e2e/fixtures.ts` (1/4) | Keep Phase 1 ID/debt filters and range pagination; add new planning tables, exact eligible spending and upsert behavior. Preserve semantic authorization and financial assertions. Fixture arithmetic must remain distinct from native SQL evidence. |
| `package.json`, `.github/workflows/ci.yml` (2/4) | Union new scripts/gates. Preserve locked versions, serial native/browser verification and loopback fixtures. No CI execution/push is authorized here. |
| `supabase/migrations/README.md` (all) and `README.md` (1/2) | Keep historic migration discrepancies and the production-baseline warning. Append each local proposal/status; never make shadow-ledger balances appear authoritative. |
| `src/App.test.tsx` (1/3), `src/styles.css` (1/3) | Preserve financial regressions and Phase 1 analytics full-opacity contrast while retaining Phase 3 route/public/onboarding changes. |
| Dashboard highlights (3/4, different files) | Phase 3 `PlanningHighlights` and Phase 4 `PlanningSummary` overlap conceptually. Retain useful recurring guidance, envelope health and native amounts without duplicate contradictory notices. Share the exact rollover-aware budget derivation. |
| Accounting viewer vs Phase 3 routes | Phase 3 has no Accounting tab; the Phase 2 viewer is a separate synthetic server. Its accepted architecture is not an authenticated ledger page. Coexistence must retain a clearly marked, local-only laboratory and verify its entry/navigation and public/private isolation. Do not add a live ledger adapter, real-balance claim or posting UI implicitly. Record what is integrated and what remains synthetic. |

### Reproduced cross-phase budget inconsistency

An independent read-only probe imported the actual Phase 3 `planning-highlights.ts` and Phase 4 `planning.ts` functions into memory using Node's TypeScript stripping. It used synthetic MYR envelopes, an October base of RM800, rollover enabled and a 100% alert threshold. No copied/edited source, database or financial mutation was used.

| Prior month | October spending | Phase 3 dashboard | Phase 4 envelope result |
| --- | --- | --- | --- |
| September RM800 allocation / RM700 spent | RM850 | Budget reached = true | Available RM900, remaining RM50, healthy |
| September RM800 allocation / RM900 spent | RM750 | Budget reached = false | Available RM700, remaining -RM50, over |

The probe exits 0 because it successfully demonstrated the disagreement, **not because integration passes**. Raw output is retained in [audit evidence](phases1-4-audit-evidence.json). Add both as cross-phase regressions after integration and make dashboard and budget detail agree. Phase 3 compares spending to base allocation; Phase 4 compares against the signed rollover-adjusted envelope.

### Schema overlaps

Phase 1 adds `prism_private.protect_debt_repayment_history()` / trigger `protect_debt_repayment_history` on parent deletion. Phase 4 adds differently named `protect_debt_history()`, parent UPDATE/DELETE trigger and child UPDATE/DELETE trigger. These are not duplicate SQL object identities. Retain the accepted Phase 1 migration unchanged and initially retain both protections. Verify actual trigger ordering, denial outcomes, repayment INSERT vs parent UPDATE/DELETE locks and privileged account erasure together; do not remove a security guard merely to simplify the merge.

Phase 4 appends `rollover_enabled` and `alert_percent` to `monthly_budgets` and its exact invoker view. Phase 3 does not alter those objects. Phase 2's five ledger tables/exact ledger views do not replace legacy/planning sources. Phase 3 replaces only the restricted profile-creation function and future defaults. No conflicting SQL object redefinition or duplicate migration version was identified in these new files by static inspection. Successful combined native execution is still unverified.

## 4. Complete proposed migration order

The union has **16 migrations**: accepted Phase 1's 13, then the three uncommitted forward additions. Lexical order agrees with phase dependency order.

| Order | File | Status |
| ---: | --- | --- |
| 1 | `20260928000200_initial_finance_tracker.sql` | Committed inherited local chain |
| 2 | `20260928031516_personal_finance_platform.sql` | Committed inherited local chain |
| 3 | `20260928032448_exact_money_validation.sql` | Committed inherited local chain |
| 4 | `20260928043611_focused_crud_integrity.sql` | Committed inherited local chain |
| 5 | `20260928082016_harden_self_delete_rpc.sql` | Committed inherited local chain |
| 6 | `20260930135217_financial_foundations.sql` | Committed inherited local chain |
| 7 | `20260930135222_reporting_and_planning.sql` | Committed inherited local chain |
| 8 | `20260930135716_financial_relationship_indexes.sql` | Committed inherited local chain |
| 9 | `20260930141104_canonical_financial_transport.sql` | Committed inherited local chain |
| 10 | `20261001033902_analytics_drilldown_filters.sql` | Committed inherited local chain |
| 11 | `20261001083346_period_analytics_preferences.sql` | Committed inherited local chain |
| 12 | `20261001083350_present_financial_progress.sql` | Committed inherited local chain |
| 13 | `20261009162324_protect_debt_repayment_history.sql` | Committed accepted Phase 1, missing from Phase 4 branch |
| 14 | `20261009220402_shadow_double_entry_ledger.sql` | Uncommitted Phase 2 forward addition |
| 15 | `20261010021500_malaysia_profile_defaults.sql` | Uncommitted Phase 3 forward addition |
| 16 | `20261010024257_phase4_planning.sql` | Uncommitted Phase 4 forward addition |

All inherited SQL content matches accepted Phase 1 after CRLF/LF normalization. The Phase 1 guard has LF bytes in its original worktree and CRLF in the Phase 2/3 checkouts; different byte hashes here do not indicate SQL history drift. The source manifest preserves byte hashes; the evidence file separately records normalized SQL hashes. Phase 4 is missing the Phase 1 guard file entirely.

Never renumber or replay historical migrations to align hosted history. The repository documents local/remote pairs `20260928043611 / 20260928081917`, `20260928082016 / 20260928082111`, and `20261001033902 / 20261001035741`; production predates the tracked empty-project baseline. These are locally documented history constraints, not a fresh hosted catalog assertion. No hosted history was queried.

Required isolated native rehearsal after preservation:

1. Clean installation: bootstrap synthetic Auth, apply exactly this ordered chain, audit schemas/tables/functions/views/owners/search paths/grants/default privileges, then exercise all local finance/ledger/planning gates.
2. Upgrade: replay exactly the accepted Phase 1 chain, create synthetic existing profiles, large four-currency records, transfers, ordinary expenses, earmarks, principal repayments, microsecond boundary history and budgets. Snapshot IDs/relationships/canonical monetary strings and frozen-cutoff projections. Apply 2 → 3 → 4; compare every legacy snapshot and reconcile shadow events independently. Defaults may affect only new profiles.
3. Failure/recovery: inject a failure inside each forward migration's transaction on a separate disposable cluster/clone, roll back, prove no partial DDL/rows/grants and the accepted prior schema/data still work, then apply the correct file and reproduce the successful outcome. Detect partial installs, duplicate versions/objects and mismatched content explicitly instead of silently skipping them.
4. Security: test explicit TRUE success and FALSE/NULL denial, owner isolation, session expiry/revocation/wrong owner, anonymous and MFA, private definer entry points, exact invoker views, denied direct DML/TRUNCATE, and complete unchanged row counts after denied or failed requests.
5. Native races: observe lock acquisition with independent connections; include ledger retry/conflicting payload/reversal/principal races plus legacy debt deletion/insertion and Phase 4 monetary-recast/update/child-history behavior.
6. Recovery evidence must include commands, PostgreSQL/PostgREST versions, migration hashes, before/after catalogs/data comparisons and failures. No destructive hosted rollback or production copy.

The existing native runner uses embedded PostgreSQL 18.4 and loopback PostgREST 16.4 with synthetic Auth/JWTs. This is a suitable local native gate under the stated isolation boundary; managed PostgreSQL 17/Auth/provider/default-grant parity remains an external requirement. PGlite remains supplemental, not the native gate. Clean install and upgrade/failure-recovery are distinct; the current generic replay alone does not prove all three.

## 5. Cross-phase verification and adversarial review plan

No combined application exists yet. The following are required acceptance work after commits, not passing results.

| Area | Required combined evidence |
| --- | --- |
| Exact money / shadow accounting | Decimal strings and bigint including >2^53 and JPY; balanced immutable journals, atomic children, reversals, stable same-key retry and changed-payload rejection; FX rejection and currency separation |
| Canonical authority / principal / interest | Shadow salary/expense/transfer/principal/interest/fee/earmark correctness while exact legacy balances stay authoritative. Planning saves and split previews leave ledger and legacy cash/transaction rows unchanged. No automatic debt split posting |
| Timestamp correctness | PostgreSQL-independent microsecond before/exact/after inclusive cutoff and link/opening tests; exact UTC six-digit transport through actual HTTP; unsupported precision/date/range rejection with no rows |
| History/security across phases | Parent guard plus Phase 4 child/monetary guards, localized blocked actions, insertion/deletion/recasting races, empty-parent deletion and confirmed whole-account erasure across both new ledger and planning tables |
| Plans and dashboard | Positive/negative/reset rollover, reserves, genuine spending excluding principal/earmarks/transfers, threshold agreement on both dashboard summaries and budget detail; historical edits recompute; native currencies never collapse |
| Debt / recurrence | Snowball/avalanche/custom schedule conservation, missing/variable/manual rates, negative amortization, horizons/early payoff; planned recurrence next-index/category/overdue vs future and explicit confirmation without unattended posting |
| Routes/Auth/public | Protected `/plans?section=budgets` and `recurring` after login/MFA/recovery; back/forward/refresh; grouped desktop/mobile navigation and keyboard/focus; public/demo no private queries or finance mutations |
| Onboarding/defaults | New English/Malay MYR/Kuala Lumpur profiles, existing choices conserved, exact opening balance, partial-save retry and held-response locking; onboarding opening remains legacy authority without invented shadow income |
| Existing application | Accounts, transfers, transactions/CSV, goals/savings, debt cash, reporting periods/drilldown/analytics, cache reset/cancellation and Privacy Mode, loading/error/empty/retry states |
| Viewer integration | Clearly bounded synthetic accounting laboratory coexists with Phase 3 navigation/auth model; no real data/authority or public private-query leakage; English/Malay, native currency, journal detail, exact equation and invalid-period clearing |
| Accessibility/responsive | Existing and new populated/empty/failure states; EN/light and MS/dark, 320–1440 widths, short viewport/zoom, focus/drawer/keyboard and axe; viewer issues below remediated where required for local criteria |

Run serially in the isolated integration checkout with locked dependencies and fixture-only configuration:

```text
npm ci
npm run typecheck
npm run lint
npm run test
npm run test:db
npm run test:platform-db
npm run test:foundations-db
npm run test:period-db
npm run test:ledger-db
npm run ledger:dry-run
node scripts/phase2-review-probes.mjs
npm run test:planning-db
npm run test:postgres
npm run test:ledger-preview
npm run test:e2e
npm run test:responsive
npm run build
```

Additionally implement/run native upgrade and failure/recovery tests, plus the cross-phase regressions above. Keep deployed-site opt-in variables unset; use the existing fresh fixture build on loopback and synthetic keys. Audit inherited acceptance evidence, then do an independent adversarial pass against the integrated diff and behavior. Repair locally actionable defects and rerun affected gates followed by complete verification when warranted. Do not waive failures, reduce invariants or equate one green pass with acceptance.

Phase 2 final review already records two P2 viewer issues (fixture cutoff/coverage absent; updates not announced) and four P3 issues (duplicate journal labels, incomplete Malay event/classification/error text, absent signed-balance legend, unclear journal date scope/collapsed details). These remain in the accepted uncommitted packet; P1 remediation did not address them. Review them against the requested integrated accessibility/localization/error criteria before a GO decision.

## 6. Verification results at this checkpoint

### Per-phase historical evidence, not a current integrated pass

| Handoff | Reported prior isolated result |
| --- | --- |
| Phase 1 stabilization | 76 unit tests, two fresh 73/73 full browser runs, 341 responsive checks, native/HTTP/DB/type/lint/build pass |
| Phase 2 P1 remediation | 97 unit tests, 73/73 browser tests, 341 responsive checks, ledger/concurrency/microsecond/SQL+HTTP authorization/native/viewer/DB/type/lint/build pass |
| Phase 3 finance UX | 86 unit tests, 90 browser tests, 341 responsive checks, defaults conservation/native/HTTP/DB/type/lint/build pass |
| Phase 4 planning | 89 unit tests, 75/75 browser tests, 341 responsive checks, planning/native/HTTP/DB/type/lint/build pass |

These are source-handoff reports, supported by matching final candidate manifests for Phase 2 and 3; they were not rerun here and cannot be added together to establish an integrated pass. Retain recorded historical failures as well as later passes. Development tooling advisories and the Phase 4 >500kB build warning remain disclosed in their original handoffs.

### Executed during this audit

| Check | Result |
| --- | --- |
| Exact Phase 1 hash / ancestry / merge base / worktree/index status | PASS: values and counts above verified from actual Git |
| Complete committed/uncommitted candidate inventory | PASS: 25 committed Phase 1 paths, 26 / 29 / 25 later-phase candidates, all source indices empty |
| Final source-preservation check | PASS: all 105 inventoried candidate byte hashes, four source statuses and four source heads unchanged; source indices remain empty; primary checkout remains clean. Only the three audit documents were added in checkout 6aee. |
| Dependency/lockfile parity | PASS: declarations and byte-identical lockfile, no added dependency |
| Phase 2/3 accepted final manifest comparisons | PASS: 26/26 and 29/29 current byte hashes match |
| Corrected Phase 2 migration / guard source | PASS static: hash matches handoff; both definer guards use `session_allowed() IS NOT TRUE`; exact instant source retained |
| Inherited SQL content / migration IDs | PASS static: inherited content equal modulo line endings; 16 distinct ordered versions in union; Phase 4 missing Phase 1 guard |
| `git diff --check HEAD` in all four phase source worktrees | PASS (tracked diffs only; not a complete untracked-source lint or secret scan) |
| Actual budgeting-function comparison | DISAGREEMENT REPRODUCED for positive and negative rollover; resolution/regression required |
| Cross-phase unit/native/HTTP/concurrency/browser/axe/responsive/type/lint/build | NOT RUN: no safely preserved integrated source tree |
| Clean install / Phase 1 upgrade / failure-recovery native rehearsal | NOT RUN: integration paused |
| Integrated independent adversarial acceptance loop | NOT RUN: integration paused |
| Hosted/production/provider/release checks | NOT RUN; outside authorization |

### P0/P1 and GO/NO-GO

No new confirmed P0/P1 implementation defect was established by this bounded pre-audit. Phase 2's two prior P1 findings are documented repaired, and their current implementation hashes match the corrected packet. **Absence of a new finding is not evidence that the combined application is free of P0/P1 defects.** The integrated acceptance/review and local database rehearsal are outstanding. The reproduced budget disagreement is a confirmed integration defect to resolve before local acceptance.

**Integrated local baseline: NO-GO / NOT YET PRODUCED.** The preservation authorization gate and the subsequent integrated local criteria are unmet. **Hosted/production/release acceptance is not claimed.**

External requirements remain managed-provider/PostgreSQL 17 migration/privilege parity, real Auth/OAuth/email/recovery/MFA and callback allowlists, real JWT expiry/revocation, tested provider restore, Linux CI and physical-device/manual assistive-technology evidence. They do not justify hosted mutations in this task.

## 7. Exact authorization needed to resume

Authorize **local checkpoint commits only** for the audited Phase 2 (26 paths, including timestamp/authorization P1 remediations), Phase 3 (29 paths), and Phase 4 (25 paths) candidate sets on their existing branches. Review explicit paths, staged diff/whitespace and secrets/generated artifacts before each commit; keep ignored evidence/dependencies/credentials out of Git and preserve every original worktree. If any candidate changed since this snapshot, repeat the affected inventory/review first. Do not use blanket staging, stash/reset, branch rewrites or relocation of user changes.

Suggested authorization:

> Create local checkpoint commits for the audited Phase 2, Phase 3 and Phase 4 candidate sets on their existing branches, including Phase 2's P1 remediations, after explicit staged-tree and secret review. Preserve all original worktrees and user changes. Then resume local integration in checkout 6aee on codex/phases1-4-integration based on 72da622305754328f02ec8f5d2ca8b71a221ee17. No push, PR, protected-branch merge, deployment, hosted mutation, production-data copy or Phase 5 is authorized.

Once preserved, integrate Phase 2 → Phase 3 → Phase 4 using reviewed commits into the dedicated local branch. Because new integration commits are also prohibited by the current request, the authorization above permits only original-branch preservation commits; conflict-resolved integration changes can remain uncommitted and fully verified in the isolated integration worktree. Ask separately for any eventual integration-result commit. Non-committing integration should retain source commit references and record merge/cherry-pick bookkeeping honestly in the final handoff.

The final post-integration handoff must replace this checkpoint's original-only ancestry/NOT RUN entries with actual source commit IDs, applied conflict resolutions, migration recovery evidence, cross-phase test results, independent review findings, residual risks and a supported local GO/NO-GO.
