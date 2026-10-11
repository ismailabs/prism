# P.R.I.S.M. — Gate 4B transaction amount feedback

11 October 2026, Asia/Kuala_Lumpur. **Historical Gate 4B local acceptance: GO.** The original correction and local regressions were completed uncommitted under their original local-only authorization. The later release-validation mission explicitly authorizes reviewed commits and conditional branch CI publication; its current disposition is recorded in [release acceptance and blockers](release-validation/acceptance-and-blockers.md). Full Gate 4 and production readiness remain separate.

## Baseline and changed-file inventory

Original Gate 4B worktree: `C:\Users\moham\.codex\worktrees\prism-phase7-readiness\prism-finance-baseline`. Branch: `codex/phase7-readiness`. Required and retained HEAD at that handoff: `753dadf4fdc0d2f979bd11a4524c3f1e9ed932f3`. That task started with a clean working tree and left the three corrections below uncommitted. The subsequent release-validation mission starts with all three preserved. The detached initial checkout was not used for implementation.

The request identifies `ismailabs/prism`; the local origin is `https://github.com/ismailabs/prism-finance-tracker.git`. The original Gate 4B task used the specified worktree, branch and exact HEAD. It performed no remote identity check, fetch or hosted operation; the later mission verifies those boundaries separately.

The original correction changes exactly three source/documentation files:

| File | Change |
| --- | --- |
| `src/components/TransactionDialog.tsx` | Separates amount errors from save errors; preserves parser rejection reasons through the existing safe bilingual error mapper; associates amount feedback with the input. |
| `e2e/transaction-amount.spec.ts` | Adds 10 local synthetic browser regressions for both languages and all four currencies, including create/edit, no-write, exact-text and accessibility checks. |
| `docs/gate4b-amount-validation.md` | This local evidence and handoff record. |

Generated logs, screenshots, accessibility trees and the separate direct-submit review are ignored under `artifacts/gate4b/`. They are evidence, not additional source changes. Dependencies, CI, deployment configuration and migrations are unchanged.

## Root cause and behavior

`src/domain/money.ts` already rejects excess fractional digits before constructing the bigint amount. MYR, USD and EUR have scale 2; JPY has scale 0. `TransactionForm.submit` previously caught every parser failure, including precision, malformed input and range failures, and replaced it with `t('invalidAmount')`. It also threw a synthetic positivity error for a successfully parsed nonpositive value into that same catch. The alert had no input-specific ID association.

The correction keeps parsing, limits, exact serialization and validation order intact. Parser errors now pass through the pre-existing allowlisted `errorMessage`/`userError` English/Malay mapper. Only a successfully parsed amount at or below zero gets the existing positivity copy. Every rejection returns before constructing the transaction or invoking either mutation. No new rounding, truncation, coercion or floating-point amount arithmetic is introduced.

| MYR input | Before, English / Malay | After, English / Malay |
| --- | --- | --- |
| `1.234` | Enter an amount greater than zero. / Masukkan amaun melebihi sifar. | MYR allows 2 decimal places; amounts are never rounded silently. / MYR membenarkan 2 tempat perpuluhan; amaun tidak dibundarkan secara senyap. |
| `0`, `-1`, `-0` | Positivity feedback | Existing positivity feedback retained verbatim. |
| `abc`, `1e3`, `12,34.56` | Positivity feedback | Use a decimal amount with consistent thousands separators. / Gunakan amaun perpuluhan dengan pemisah ribu yang konsisten. |
| `10000000000000000` | Positivity feedback | Amount exceeds the supported range. / Amaun melebihi julat yang disokong. |
| `1.23` | Accepted exactly | Accepted exactly as decimal text `1.23`. |

JPY excess precision reports 0 decimal places in both languages. Excess trailing zeros remain rejected (`1.230` for a scale-2 currency, `1.0` for JPY). A negative value with invalid precision is still rejected for precision first, preserving the parser's existing ordering. Empty required input still uses native browser validation.

## No-write, exact-money and accessibility evidence

The new browser matrix observes all REST mutations, excluding the known read-only transaction-page RPC. Every rejected case leaves the full synthetic records unchanged, leaves rendered transaction table/mobile-list data unchanged, retains the entered amount and keeps the dialog open. Create and edit rejection paths are covered. Valid create requests and saved synthetic records retain exact native decimal strings; an edit correction sends exactly one PATCH.

All currencies test grouped positive input, values beyond IEEE-754 integer precision and the individual-entry cap: `9999999999999999.99` for MYR/USD/EUR and `9999999999999999` for JPY. No invalid fractional digits are silently removed.

The amount input receives `aria-invalid="true"` and `aria-describedby` pointing to its uniquely identified `role="alert"` message. Save errors retain their separate general alert behavior. Editing the amount or changing currency clears stale amount feedback. Existing autofocus, native required validation, dialog containment, submission, busy state and focus restoration are preserved. Tests assert the actual accessible description, matching alert ID, Enter submission, Tab/Shift+Tab between amount and currency, click focus after rejection and return to the opener after saving. Both language MYR cases run at 320px; all eight language/currency cases run WCAG 2 A/AA and 2.1 AA axe checks and retain error screenshots and accessibility trees.

## Separate review, remediation and verification

A separate source/evidence pass by the same agent independently executes the actual extracted submit function, using synthetic create/update spies. It passes 192 reject/no-write cases and 64 exact valid create/edit cases across both languages and all currencies. Invalid input never reaches date conversion, success toast, close or mutation calls. It verifies 27 critical inputs against the baseline Git blobs, including money parsing, transport, safe error copy, i18n, mutation hooks, modal, all 17 migrations, package/lockfile and deployment configuration. Windows checkout line endings are accounted for by Git's configured filters. The receipt includes current changed-source/test hashes. This is an independent probe and separate same-agent review, not review by a second agent or external accessibility auditor.

Review added coverage for required empty values, native currency boundaries, large/grouped exact values, mobile feedback and click/keyboard focus. Two new test defects were corrected: a currency-filtered account selector initially expected all accounts, and the existing Malay Edit menu was incorrectly expected to say Sunting. A whole-main text assertion also captured an asynchronous exchange-rate banner; it was narrowed to the financial transaction table and mobile list. Financial write, state, exact-value and accessibility assertions remain intact. No pre-existing assertion or validation rule was removed or weakened.

The unfixed English and Malay MYR browser cases were reproduced with the precise wrong positivity text. The expanded suite's affected English EUR and Malay edit cases then passed on retest. All 10 new browser tests passed in the final broader run; no remaining source defect or local verification failure was found.

| Verification | Final result |
| --- | --- |
| Typecheck, lint, build | Pass |
| Existing exact-money/domain unit suite | 163 tests, 20 files passed |
| Full browser suite | 161 tests passed, including all 10 new amount-feedback cases |
| Real-worker PWA | 5 tests passed |
| Responsive sweep | 481 layout checks passed; no browser errors |
| Localization, safe error mapping and PWA privacy review | Pass |
| Finance/platform/foundations/period/ledger/planning/integration/actions/intelligence database and independent review gates | Pass |
| Native PostgreSQL/PostgREST | Pass: exact text, four-currency boundaries, financial integrity, concurrency and authorization invariants |
| Synthetic cold restore | All 28 public/Auth/private tables and 17 migrations passed |
| Local release source packaging | Pass; no upload or provider configuration change |
| Separate actual-submit review | 192 rejection/no-write cases and 64 exact valid create/edit cases passed |

The full 30-gate invocation was interrupted after its first 27 passing gates and during browser tests. Its partial browser log is not counted as a pass. The final three gates were rerun completely. Both runs have identical 251-input inventories and the same required HEAD; SHA-256 of each `inputs.json` is `9549c6c7239f32b5b533c8c35be382a4cbb8f5ca9fa67ec3aa4a3e36f4c946d3`. Engineering inputs remained unchanged through verification. Documentation is excluded by the runner from its engineering-input inventory and was finalized afterward.

Retained evidence:

- `artifacts/phase7/gates-1791691104962/`: 27 completed gates, frozen input receipt and interrupted browser log.
- `artifacts/phase7/gates-1791701075329/`: complete browser/PWA/responsive rerun and identical input receipt.
- `artifacts/gate4b/red-regression.log`: unfixed MYR English/Malay wrong-message reproduction.
- `artifacts/gate4b/focused-retest.log`: corrected English EUR and Malay edit retests.
- `artifacts/gate4b/independent-review.json`: direct-submit review, critical baseline blob checks and current source/test hashes.
- `artifacts/gate4b/resume-inputs.json`: identical-input proof across the interruption.
- `artifacts/gate4b/{en,ms}-{MYR,USD,EUR,JPY}-error.{png,txt}`: final error screenshots and accessibility trees. English/Malay MYR 320px screenshots were visually inspected; precision feedback wraps legibly.
- `artifacts/gate4b/final-verification.json`: final combined 30-gate receipt, exact three-file inventory/hashes and local disposition.

The final scope audit requires HEAD and branch to remain unchanged, all 30 gates to have exit code zero, the source/test hashes to match the separate review, the full frozen engineering inventory to remain unchanged, exactly the three authorized files to differ and the staging area to be empty. Generated artifacts are ignored and excluded from any future checkpoint inventory.

## Limits and next boundary

The original Gate 4B task proves local behavior using synthetic browser/provider, PGlite and disposable native PostgreSQL/PostgREST fixtures. It did not inspect or accept actual spoken screen-reader output, physical devices, remote Linux CI, hosted Supabase/Auth/RLS/MFA, managed database behavior or production deployment. Existing wider Gate 4 and release requirements remain open. That task performed no dependency upgrade, paid service, hosted inspection/mutation, Vercel change, commit, push, PR, merge or deployment. The subsequent mission's actual work is recorded separately.

**Original handoff GO:** separately authorized local checkpoint commit of exactly the three files listed above, after review of their unstaged diff. **Original handoff NO-GO:** treating this local correction as full Gate 4, remote CI, hosted acceptance, publication or production readiness. That task ended at the uncommitted local handoff. The later mission preserves this correction and completes its separately authorized checkpoint/publication work; the historical counts above are not claimed as newly executed tests.
