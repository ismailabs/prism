# PRISM stabilization and period analytics upgrade

Verified on 1 October 2026. Production: [prism-finance-tracker.vercel.app](https://prism-finance-tracker.vercel.app). Recorded goal runtime: approximately 1 hour 49 minutes.

## Period system

Overview and Analytics share selected month, last 3/6/12 calendar months, year to date, all time, and inclusive custom dates. One domain resolver supplies boundaries, comparisons, timezone context and partial-period state to the summary bar, KPI cards, cash-flow/category charts, Financial Pulse and transaction drilldown.

Calendar boundaries use the profile's financial timezone. UTC is used only for neutral calendar arithmetic. Current calendar periods stop at the current financial date and compare the same elapsed portion of the previous calendar block; historical months/years compare complete blocks. YTD compares the equivalent previous-year date, clamping leap days. Custom ranges compare the preceding equal number of inclusive days. Invalid ranges retain the last applied range and display a localized error. All time has no hidden history cutoff or previous-period comparison. Missing/zero denominators do not produce Infinity or NaN.

Daily exact-money aggregates make partial months and custom days accurate. Native-currency sums, differences, percentages and textual category totals retain integer minor-unit arithmetic. Chart coordinates are approximate; mixed-currency conversions remain labelled estimates. Account balances and present financial positions remain separate from period cash flow.

Settings saves the validated default in the authenticated profile. A user-scoped local preference provides a fallback; the server preference wins. Financial content waits for profile loading, preventing an initial month-to-preference flash. Temporary selections are shared between Overview and Analytics; reload/default changes restore the profile default. Reset saves current month. Custom dates are temporary.

## Category-color fix

The reproduced cause was the analytics palette resolver: it replaced valid stored colors when another category used the same color or when a color was considered too bright/dark. Cards used the stored value while charts used its replacement. This produced a mismatch even with fresh caches.

Every category surface now resolves `category_id → current category.color`. Valid stored colors are preserved, including duplicate, cyan, black and white choices. Missing/invalid values use one deterministic fallback based on identity, independent of ordering/filtering. Historical activity uses the current category metadata.

The existing ownership-scoped query keys, optimistic mutation ledger, invalidation and realtime cleanup were preserved. Charts consume current category query data; no forced-render workaround was added. Management counts now come from complete database usage totals. Deletion preserves the existing foreign-key behavior: referenced transactions become uncategorized, while budgets/recurring rules can restrict deletion and receive a clear localized explanation.

Regression coverage edits Investment from cyan to purple, checks cards, segments, legends, income versus spending, transaction badges, current/historical/all-time periods, reload, both themes, creation, restricted deletion, and successful deletion with unchanged financial totals. Route-specific readiness assertions prevent a departing chart or loading skeleton from satisfying the Analytics check.

## Repository audit

Reviewed financial domains and views, exact-money boundaries, transfers, accounts, goals/savings/debts, planning/import RPCs, authentication/recovery/OAuth/MFA/session code, private cache clearing, mutation races, realtime subscriptions, forms/dialogs/navigation, chart drilldown, translations, accessibility, responsive layouts, queries/pagination, lazy bundles, scripts/CI and deployment configuration. Existing local redesign work was preserved.

| Severity | Actual finding and cause | Correction and verification |
|---|---|---|
| Critical | None found in the inspected scope. | Ownership/MFA/anonymous denial, account deletion and integrity exercised in disposable database tests. |
| High | Scheduled contributions/repayments could appear as settled progress while present balances excluded them. | Filter future activity in the domain and exact progress views, retaining raw records. Unit and migration tests cover future native and linked activity. |
| High | Budgets and recurring rules stopped at the API's first 1,000 rows. | Stable, cancellation-aware pagination retrieves every page. Browser regression retrieves an older budget and recurring rule after row 1,000. |
| Medium | Valid category colors were replaced by chart palette heuristics. | Canonical current identity mapping; unit and browser color regressions. |
| Medium | Month-only totals could not correctly support custom days or elapsed-period comparisons. | Canonical periods and exact daily aggregates; leap/year/timezone/custom/old-history/comparison tests. |
| Medium | Category/payment cards counted the recent activity page instead of complete linked history. | Caller-permission usage view and paginated query. A 55-record regression verifies the card despite a 50-row recent feed. |
| Medium | Foreign-key deletion errors could appear as generic failures; plain Supabase error objects lost their message. | Preserve error-object messages and explain budget/recurring restrictions in English/Malay. Restricted and uncategorizing deletion paths tested. |
| Low | Deployment tests hard-coded the local Supabase host/storage key, and a long reflow test exhausted its budget on a 4 GB host. | Use the configured endpoint/key; isolate every locale/theme/viewport case and serialize heavy checks. Coverage and assertions retained. |

No discovered Critical/High issue remains unresolved. No speculative dependency churn or broad redesign was performed. Lazy routes remain; the largest application entry is about 496 KB before compression, 144 KB gzip, with charts in a separate lazy chunk.

## Database

Applied to the intended Supabase project with matching local/remote versions:

- [20261001083346_period_analytics_preferences.sql](C:/Users/moham/source/prism-finance-baseline/supabase/migrations/20261001083346_period_analytics_preferences.sql): validated/defaulted profile preference, narrow column update grant, exact daily ordinary totals, complete category/payment usage counts.
- [20261001083350_present_financial_progress.sql](C:/Users/moham/source/prism-finance-baseline/supabase/migrations/20261001083350_present_financial_progress.sql): computed present progress excludes future activity, preserving stored values and view columns.

All four affected views use `security_invoker=true`. Existing owner/session/MFA RLS remains enabled; anonymous view access is denied. No policies were weakened, no production reset occurred, and financial row counts/checksums were unchanged immediately before/after application and after final production QA. Generated types were retrieved from the deployed schema. The documented historical migration baseline and existing timestamp differences were preserved; only new migrations were applied.

## Files changed for this stabilization

Paths are relative to `C:/Users/moham/source/prism-finance-baseline`. Pre-existing local changes remain intact.

| Group | Files |
|---|---|
| Domain/date logic | `src/domain/periods.ts`, `analytics.ts`, `dashboard.ts`, `progress.ts` and corresponding tests |
| Overview | `src/App.tsx`, `src/components/Dashboard.tsx`, `src/components/analytics/AnalyticsBar.tsx`, `FinancialPulse.tsx` |
| Analytics | `src/components/analytics/Analytics.tsx`, `CashFlowChart.tsx`, `PeriodSelector.tsx` |
| Categories | `src/components/ManageLists.tsx`, `TransactionTable.tsx` |
| Settings/preferences | `src/components/PersonalizationSettings.tsx`, `src/hooks/useFinancialPeriod.ts`, `src/store/analysisPreference.ts`, `src/enhancementCopy.ts`, `src/i18n.ts`, `src/styles.css` |
| Queries/state/errors | `src/hooks/useFinanceData.ts`, `useFinancialReports.ts`, `usePlanningData.ts`, `src/lib/utils.ts` |
| Tests | `src/App.test.tsx`; domain tests; `e2e/periods-colors.spec.ts`, `pagination.spec.ts`, `enhancements.spec.ts`, `fixtures.ts`, `auth-routing.spec.ts`, `focused-upgrade.spec.ts`, `deployed.spec.ts`; `scripts/period-db-test.mjs`, `run-deployed-qa.mjs`, `verify-responsive.mjs` |
| Database/types | Two migrations above; `supabase/migrations/README.md`; `src/types/database.generated.ts`, `database.ts`, `index.ts` |
| Configuration | `package.json`, `.github/workflows/ci.yml` |
| Report | This document |

## Verification

Commands ran through the Windows npm/Vercel command wrappers where applicable.

| Command/check | Result |
|---|---|
| `npm run typecheck` | PASS, including regenerated schema types and final test changes |
| `npm run lint` | PASS |
| `npm run test` | PASS: 74 tests, 7 files (baseline: 55 tests) |
| `npm run test:db` | PASS: replay, precision, relationships, ownership and MFA |
| `npm run test:platform-db` | PASS: CRUD/cascades/linked transactions/self-deletion/RLS |
| `npm run test:foundations-db` | PASS: exact views, transfers, positions, timezone, RLS/MFA, atomic/idempotent CSV/recurrence, numeric pagination |
| `npm run test:period-db` | PASS: default validation/update ownership/MFA, daily/custom/all-time/timezone exact totals, future progress, anonymous denial |
| `npm run test:postgres` | PASS: native PostgreSQL independent-connection races and actual PostgREST HTTP exact roundtrips, precision rejection, anonymous denial and disposable self-deletion |
| `npm run test:e2e` | Baseline PASS: 24 tests. Intermediate changed runs found fixture assertions and host-memory timeouts; corrected without dropping checks. Final complete deployed execution is below. |
| `npm run test:responsive` | PASS: 341 layout checks, no browser exceptions; final rerun passed |
| `npm run build` | PASS locally and in both Vercel builds; same application asset hashes |
| `npm audit --omit=dev --json` | PASS: 0 production dependency vulnerabilities |
| `git diff --check` | PASS; only existing Windows line-ending notices |
| Supplemental raw Git whitespace check | Disabling CRLF normalization alone initially produced line-ending false positives. The normal check and a raw CRLF-aware check both passed; no persistent Git settings or pre-existing line endings were changed. |
| `node scripts/run-deployed-qa.mjs PREVIEW --all` | PASS: 71 tests before the extra planning regression was added |
| `node scripts/run-deployed-qa.mjs PREVIEW` | PASS: 9 final targeted tests, including planning pagination and fully loaded chart checks |
| `node scripts/run-deployed-qa.mjs https://prism-finance-tracker.vercel.app --production --all` | PASS: all 72 final browser tests |
| Supabase post-migration verification/advisors/types | PASS security invariants and unchanged financial checksums; advisory details below |
| Vercel inspection/log queries | Production alias resolves to the READY production deployment. Error, warning and 5xx queries returned no entries in the observed 30-minute window. |

Intermediate failures were investigated: a missing column update grant was fixed before migration application; deletion tests were corrected to the actual intentional `SET NULL` behavior; API mocks/assertions were made deployment-aware. The 4 GB host's memory pressure was resolved by serial checks and fresh viewport contexts. Protected preview QA handles Vercel's same-origin cookie redirect without logging credentials or sending protection headers to Supabase.

## Browser QA

Real Edge browser runs covered Overview, Analytics, Transactions, Accounts, Plans/Goals/Savings/Budgets/Recurring, Debts, Categories, Payments, Settings, authentication and recovery screens; forms, delete confirmations, CSV, transfers, command palette, mobile drawer/gestures, keyboard focus, empty/sparse/large/many-category data and exact drilldown.

All seven periods were checked across Overview/Analytics. English and Malay were checked in light and dark modes at 320, 360, 375, 390, 414, 640, 768, 1024, 1280 and 1440 px; the responsive suite also checks a 320×360 short dialog viewport. WCAG AA scans passed for the new controls, Analytics, Settings, transaction UI, command palette and drawer. The cyan-to-purple scenario is described above. Deployed screenshots were visually inspected after route readiness was established.

Authenticated financial mutations use isolated API fixtures against the deployed application bundle. Real database authorization/exact writes/concurrency are exercised separately through disposable native PostgreSQL/PostgREST. Live deployed assets, security headers, exchange-rate API, and anonymous deletion denial were checked without modifying production financial data. The production sign-in screen was also inspected in the in-app browser and reported no console warnings/errors.

## Vercel

- Preview: [verified deployment](https://prism-finance-igzpmvpcz-mohamadismailmohdizwan-8309s-projects.vercel.app), READY, `dpl_81ACUWPbYBBzRRKXQyTtmBtY7YNb`. Full and final targeted QA passed. Deployment protection stayed enabled.
- Production: [PRISM](https://prism-finance-tracker.vercel.app), READY, `dpl_5tKmFadGtfrFRfaoL88dtmJruBSJ`. All 72 production tests passed. [Immutable deployment](https://prism-finance-8di451kta-mohamadismailmohdizwan-8309s-projects.vercel.app).
- Both client environments target the intended Supabase project and contain an anonymous public client key. No secret values were printed or exposed in client configuration.
- The Vercel connector lacked access to the linked team; the authenticated CLI successfully completed deployment, alias inspection and log verification. Remote builds logged a non-blocking install-script notice for the native database testing dependency; both builds succeeded.

## Remaining issues

No unresolved application blocker was found. Supabase's leaked-password protection warning remains because that feature requires Pro or above and this project is on Free. No paid-plan change was made. [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The private report-reservations table's no-policy RLS notice is intentional deny-by-default behavior. Fourteen unused-index informational notices were reviewed and retained; low observed usage is insufficient reason to remove integrity/supporting indexes. [RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

**PRISM stabilization and period analytics upgrade: COMPLETE**
