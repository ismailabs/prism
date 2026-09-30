# PRISM financial foundations upgrade — 2026-09-30

The existing React/Vite/Supabase application was upgraded in place on local branch `codex/financial-foundations`. PostgreSQL remains the integrity boundary. Existing production records and historical migration files were preserved. This report distinguishes isolated database tests, browser fixtures, and live production inspection.

## Completed

| Workstream | Result |
| --- | --- |
| 1. Transfers | One atomic transfer with owned source/destination accounts, exact native amounts, editing/deletion, account balance effects and history protection. |
| 2. Savings/debts | Explicit earmarks/transfer funding and account-funded principal; legacy links preserved and excluded from ordinary analytics. Exact progress and overpayment protection. |
| 3. Exact transport | Ten exact entity views plus two reporting views; money becomes text before JSON. Typed writes return IDs; no lossy raw numeric read enters financial calculations. |
| 4. Concurrency | Parent-row locks serialize competing relationship inserts and repayments. Verified with independent native PostgreSQL connections and observed lock waiting. |
| 5. Timezone | Persisted per-user IANA timezone, centralized dates, saved-zone default month, timezone-aware reporting/filters/import/recurrence/overdue checks, DST validation. |
| 6. Auth/privacy | Password recovery with PKCE and password confirmation; existing MFA gate retained; second-factor guidance; all finance/platform caches cleared on identity/token changes and deletion. |
| 7. Architecture/types | Generated live schema, exact transport adapter, checked enums, typed platform repositories, feature modules, settings extraction, Error Boundary, exhaustive hook dependency checking. |
| 8. Loading/consistency | Fifteen-row server pages, native filters/search, fifty-row recent activity, database balances/report totals; one targeted realtime channel plus write/focus/reconnect refetch. |
| 9. Product workflows | Existing CSV parser connected to validated mapping/preview and atomic idempotent import; daily/weekly/monthly/yearly explicit recurring occurrences; genuine-expense category budgets; account/currency/amount filters. |
| 10. Onboarding/navigation | Skippable setup for currency/timezone/account/categories/import, six main navigation destinations, existing goal/savings/list routes preserved. |
| 11. Localization | Active financial forms, settings, dialogs and empty states support English/Malay; provider/domain errors may retain their original English diagnostic text. |
| 12. Accessibility/security polish | Skip link, semantic labels, keyboard dialogs, textual chart data, reduced-motion behavior, responsive fixes, preserved headers and practical production CSP. |
| 13. Tests | Unit, migration/integrity, native PostgreSQL/PostgREST, browser and responsive regression suites executed successfully. |
| 14. CI | GitHub Actions runs type/lint/unit, all database suites, PostgREST, Chromium browser/responsive checks and build without production secrets. Remote Actions execution has not been triggered. |
| 15. Documentation | Root setup/architecture/model/security/test/deployment README; updated migration/security/integration documentation and this evidence report. |

## Database changes

All four forward migrations were applied to Supabase `hyhsppiitijkuvpyswce` and replayed through the clean historical chain in isolated tests. The new local filenames match the applied remote versions. Historical timestamp differences are documented in [migration history](../supabase/migrations/README.md); the live database predates the local baseline, which was not reapplied.

| Migration | Change |
| --- | --- |
| `20260930135217_financial_foundations.sql` | Timezone, transfers, allocation/principal account links, locking validation, eight initial exact views, RLS/grants and indexes. |
| `20260930135222_reporting_and_planning.sql` | Two report views, budgets/rules and exact views, occurrence/import/page RPCs, recurrence/import metadata, RLS/grants and publication membership. |
| `20260930135716_financial_relationship_indexes.sql` | Eleven composite relationship indexes; removes two new redundant indexes without changing historical files. |
| `20260930141104_canonical_financial_transport.sql` | Canonical native text scale in all exact entity views, including historical JPY values with redundant zero decimals. Stored values remain unchanged. |

### Tables and columns

- **`transfers`**: `id`, `user_id`, `source_account_id`, `destination_account_id`, `source_amount`, `source_currency`, `destination_amount`, `destination_currency`, `occurred_at`, `note`, `created_at`, `updated_at`.
- **`monthly_budgets`**: `id`, `user_id`, `category_id`, `category_type`, `currency`, `month`, `amount`, `created_at`.
- **`recurring_rules`**: `id`, `user_id`, `description`, `amount`, `currency`, `type`, `account_id`, `category_id`, `payment_method_id`, `start_date`, `end_date`, `frequency`, `interval`, `next_index`, `active`, `created_at`.
- Added **`profiles.financial_timezone`**; **`objective_contributions.account_id`**, **`.transfer_id`**; **`debt_repayments.account_id`**; **`transactions.recurrence_id`**, **`.recurrence_index`**, **`.import_key`**.

### Views

All twelve views are `security_invoker=true`, with authenticated SELECT and no anonymous SELECT:

`exact_transactions`, `exact_accounts`, `exact_objectives`, `exact_objective_contributions`, `exact_objective_milestones`, `exact_person_debts`, `exact_debt_repayments`, `exact_transfers`, `exact_monthly_budgets`, `exact_recurring_rules`, `finance_monthly_totals`, `finance_net_flow`.

Derived columns include transaction `activity_kind`/`financial_date`, contribution/repayment `effective_amount`, account `balance`/`transaction_count`/`linked_activity_count`, and budget `spent`. Financial amounts, including aggregate values, cross the API as text. The final migration preserves view identities and column order. The transaction view intentionally retains its original transport columns; recurrence/import metadata stays on the base table.

### Functions and triggers

- New private functions: `prism_private.validate_timezone()`, `validate_transfer_edit()`, `validate_budget()`.
- Replaced private functions: `validate_finance_link()`, `validate_transaction_links()`, `validate_debt_edit()`. Existing triggers remain attached to these validators.
- New public RPCs: `record_recurring_occurrence(uuid, integer, date)`, `import_transactions(jsonb, uuid, boolean)`, `transaction_page(jsonb, integer)`.
- New triggers: `validate_financial_timezone` on profiles (insert/timezone update), `validate_transfer_edit` on transfers (update), `validate_budget` on budgets (insert/update).

These functions use security-invoker execution and an empty search path. Public RPC execution is granted to authenticated users only. New private trigger functions have no public/anonymous/authenticated execution grants. The existing private self-delete implementation remains protected; its public confirmation wrapper is preserved.

### Policies, grants and publication

Each new table enables RLS and has all five policies: `own_select`, `own_insert`, `own_update`, `own_delete`, and restrictive `require_session`. That is fifteen new policies. Authenticated CRUD is granted; anonymous/public table access is revoked. The restrictive policy calls the existing current-session/MFA validator. Profiles receive UPDATE permission on the new timezone column.

The migration adds transfers, budgets and recurring rules to the existing realtime publication. Actual live membership is categories, payment methods, profiles, transactions, transfers, monthly budgets and recurring rules. One client channel subscribes to those seven tables. Older platform resources deliberately refetch after writes and on focus/reconnect.

### Constraints

- All new tables have UUID primary keys and owner foreign keys to Auth users with deletion cascade.
- Transfers have `transfer_distinct_accounts`, `transfer_source_money`, `transfer_destination_money`, `transfer_same_currency`, note length at most 500, UNIQUE `(user_id,id)` and `(user_id,id,destination_currency)`. Both account foreign keys include owner/currency and restrict deletion.
- Contributions gain `contribution_owned_account`, `contribution_owned_transfer`, `contribution_single_event`; `contribution_transfer` permits a transfer to fund at most one allocation. Locked validation requires the exact destination amount/currency/account to match.
- Repayments gain `repayment_owned_account` and `repayment_single_cash_movement`; locked debt validation rejects total principal above the original debt, including edits to linked legacy transactions. Debt ownership/currency remain immutable; direction cannot change while any repayment exists.
- Budgets require an owned expense category, supported currency, month beginning on day one, exact positive amount and UNIQUE `(user_id,category_id,currency,month)`; the owner/category/type composite FK restricts deletion.
- Recurring rules require a nonblank description of at most 500 characters, supported currency and income/expense direction, exact positive amount, one of four frequencies, interval 1–366, next index 0–100000 and end date at/after start. Owner/account/currency, owner/category/type and owner/payment FKs restrict deletion; UNIQUE `(user_id,id)` supports transaction references.
- Transactions gain `recurring_owned_rule` and `recurrence_pair`. Unique partial indexes enforce one occurrence per rule/index and one imported row per owner/import key.
- New amounts must be greater than zero and below `10000000000000000`, with zero decimals for JPY and two for MYR/USD/EUR. Database constraints reject nonzero excess precision; transport canonicalization only removes redundant zero decimals.

### Index inventory

Twenty-one new explicitly named indexes remain:

`transfers_source`, `transfers_destination`, `contribution_transfer`, `repayment_account`, `transaction_recurrence`, `transaction_import_key`, `contribution_account`, `recurring_account`, `recurring_category`, `recurring_payment`, `repayment_debt_currency`, `repayment_transaction_currency`, `repayment_account_currency`, `budget_category_type`, `contribution_account_currency`, `contribution_transfer_currency`, `contribution_objective_currency`, `contribution_transaction_currency`, `recurring_account_currency`, `transfer_destination_currency`, `transfer_source_currency`.

Seven primary/unique constraint indexes are also new:

`transfers_pkey`, `transfers_user_id_id_key`, `transfers_user_id_id_destination_currency_key`, `monthly_budgets_pkey`, `monthly_budgets_user_id_category_id_currency_month_key`, `recurring_rules_pkey`, `recurring_rules_user_id_id_key`.

`transactions_financial_page` and `categories_owner_id` were created by the first two forward migrations and removed by the third as redundant. The historical transaction paging index and category owner/id/type key remain. Final performance advisors contain only unused-index INFO notices; no duplicate-index or uncovered-foreign-key notices remain.

## Financial invariants

Transfers subtract the exact source amount and add the exact destination amount. Same-currency net assets do not change. Cross-currency transfers retain both entered native values; reference rates only produce labeled presentation estimates. Transfers never contribute to ordinary income, expenses, savings rate, category spending or budgets.

Savings contributions record exact goal progress. An account identifies an earmark without cash movement. An allocation linked to an actual transfer reuses its destination; it never debits cash again. Debt repayments reduce principal, with optional cash debit for `i_owe` and cash credit for `owed_to_me`; principal never becomes earned income or consumption expense. Missing account attribution means progress only. Overpayment is rejected by the database.

Legacy transaction links remain auditable. Their entire transaction is classified as allocation/principal and excluded from ordinary reporting while retaining its original cash effect. Any historically bundled fee is consequently excluded too; users can record fees separately. Removing a legacy link returns the transaction to ordinary analytics. No stored amounts, timestamps or links were rewritten.

Native calculations and rankings use decimal text/bigint. Entry limits match database limits, while aggregate parsing permits totals beyond the individual entry limit. Numbers are used only for presentation charts/ratios/FX estimates. Future financial movements do not affect current balances/report totals. Date grouping follows the persisted financial timezone; unconfigured historical profiles use UTC until verified sign-in persists a browser-derived zone.

## Important files changed

| Group | Principal files |
| --- | --- |
| Database | Four forward migrations; `src/types/database.generated.ts`, `src/types/database.ts`. |
| Domain | `src/domain/money.ts`, `dates.ts`, `dashboard.ts`, `transport.ts`, `progress.ts`; compatible legacy helpers in `src/lib/finance.ts`. |
| Services/hooks | `useFinanceData.ts`, `usePlatformData.ts`, `useFinancialReports.ts`, `usePlanningData.ts`, `useAuth.tsx`, `src/lib/privateCache.ts`, `src/services/currency.ts`. |
| UI | Feature modules under `src/components/financial`; `App.tsx`, Dashboard/Transactions/Table/Dialog, AuthScreen/PasswordRecovery/MfaSetup, ErrorBoundary, store/i18n/styles. |
| Tests | `src/domain/upgrade.test.ts`, `App.test.tsx`, `scripts/foundations-db-test.mjs`, `real-postgres-test.mjs`, `e2e/fixtures.ts`, foundations/auth/focused/deployed specs, responsive runner. |
| Configuration | `package.json`/lock, `.github/workflows/ci.yml`, `eslint.config.js`, `tsconfig.json`, `playwright.config.ts`, `vercel.json`, `.gitignore`. |
| Documentation | Root README, migration README, security/integration guidance, historical upgrade addendum, this report. |

## Verification

All commands below were actually executed locally. Intermediate failures were corrected and the relevant suites rerun; these are the final results.

| Command/check | Actual result |
| --- | --- |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS; hook dependency checking enabled. |
| `npm run test` | PASS: 44 tests in five files. |
| `npm run test:db` | PASS: existing finance database integrity suite. |
| `npm run test:platform-db` | PASS: existing platform/RLS/MFA integrity suite. |
| `npm run test:foundations-db` | PASS: full migration replay and new transfers, semantics, exact values, ownership/MFA, pagination, atomic import, recurrence and budget invariants. |
| `npm run test:postgres` | PASS: actual native PostgreSQL independent connections demonstrate lock waiting/reuse rejection and concurrent overpayment rejection. Actual PostgREST HTTP verifies text round trips for all ten money-bearing entity views, excess precision rejection, anonymous denial, canonical historical JPY and complete authenticated self-delete cascade. |
| `npm run test:e2e` | PASS: 12 browser tests, including exact create/edit, saved-zone month boundary, transfer CRUD, allocation/principal, malformed CSV blocking and recovery. Financial APIs are isolated fixtures. |
| `npm run test:responsive` | PASS: 225 scenarios and no browser errors on the final run. |
| `npm run build` | PASS; main bundle 545.68 kB (160.65 kB gzip), with a nonfatal chunk-size warning. |
| `npm audit --audit-level=high` | PASS: zero vulnerabilities on the installed lockfile. |
| Agent browser dev sanity | PASS: sign-in controls render, no overlay, empty browser error list, screenshot inspected. |
| `npx playwright test e2e/deployed.spec.ts` (preview) | PASS: one full deployed-workflow test against the final preview; no unexpected browser/CSP errors. |
| `npx playwright test e2e/deployed.spec.ts` (production) | PASS: one full deployed-workflow test against the final production alias; mobile screenshot inspected. |
| Production route/API checks | PASS: six core routes return 200 with CSP, nosniff, frame denial and the final bundle hash. `/api/rates?base=MYR` returns four currencies and provider metadata. |
| Vercel build/runtime logs | PASS: final preview/production builds completed; production error-log query returned no errors in the inspected window. |
| `git diff --check` | PASS with the repository's existing line-ending configuration. |

Responsive coverage includes English/light and Malay/dark at 320, 360, 375, 390, 414, 640, 768 and 1440 px plus a short viewport, core routes and dialogs. Deployed verification exercises real downloaded assets with fixture Auth/data for safe signed-in flows; unauthenticated routing uses the actual deployed application. These checks do not assert live OAuth/email delivery or financial mutations against production users.

## Supabase

Checked intended P.R.I.S.M. project `hyhsppiitijkuvpyswce`, healthy PostgreSQL 17 in `ap-northeast-1`. No isolated Supabase branch was available, so native PostgreSQL/PGlite verification preceded safe forward production migrations. All four new remote versions are confirmed. Generated types were regenerated after the final migration.

Live verification confirms RLS and five policies on all three new tables, twelve protected invoker views, secured functions and relationship indexes. Final safe integrity queries found **zero cross-table event reuse, zero orphaned transaction/account links and zero overpaid debts**. Existing counts stayed unchanged: users/profiles 7/7, accounts 2, transactions 25, objectives 3, contributions 3, debts 4, repayments 1; all three new entity tables contain zero rows. No production mutation tests or destructive database reset occurred.

Public Auth settings confirm email and Google enabled, signup enabled and email confirmation required. Complete management Auth configuration is unavailable through the connected tools/CLI credentials. SMTP delivery, provider OAuth handshake and redirect allowlist therefore remain unverified. Security advisors report only the existing disabled leaked-password protection WARN and deny-all private `report_reservations` policy INFO. No High/Critical advisor finding was returned.

## Vercel

The existing linked `prism-finance-app` project and team were inspected. It uses Node 24, `npm run build`, Vite and `dist`. Production public Supabase variables point to the intended project; the corresponding preview variables were provisioned. Privileged variables were not changed or exposed to the client. Broken connected deployment/log tool methods were handled through the authenticated Vercel CLI.

Final preview **READY**: `dpl_2Q3jFJyYkS967moawfBwQhUvSP8x`, [preview URL](https://prism-finance-5d7vufqpe-mohamadismailmohdizwan-8309s-projects.vercel.app). Its deployed browser suite passed before production deployment.

Final production **READY**: `dpl_DDVkqfSkKdccE2wefktLADVuemas`, [production deployment](https://prism-finance-9cstur1lx-mohamadismailmohdizwan-8309s-projects.vercel.app), aliased to [PRISM Finance](https://prism-finance-tracker.vercel.app). CLI uploaded the verified local working tree; no remote repository push was required.

Both build logs were inspected and completed successfully. Production's queried runtime error logs contain no errors in the inspected window. The final deployed browser check passed sign-in/authentication routing, recovery entry, dashboard, transaction creation, accounts, transfer creation, goals/savings, debts, timezone settings and mobile navigation with isolated signed-in API fixtures. Local browser tests also exercise financial record editing/deletion and the complete recovery form. Six public route responses confirm the exact final asset bundle (`index-CpOf9eK-.js`) and expected security headers. The live rate endpoint responds successfully. The final mobile screenshot was inspected for layout.

## Remaining issues

- **External access/credentials:** no dedicated live test account was supplied. OAuth handshake, email delivery and authenticated production CRUD are unverified; real UI fixtures and isolated real database/API tests cover implementation. Auth management access is insufficient to enable the existing leaked-password protection setting. GitHub Actions is configured but not remotely executed; this local work has not been pushed.
- **Local cleanup restriction:** automatic command review rejected deletion of the task-created `.cache/deployment-protection.json` and `.env.vercel-production.local` with the stated reason `blocked by policy`. They remain ignored and were excluded from the commit. The first contains the preview protection bypass token; the second is the temporary environment pull. Remove these local temporary files when permitted.
- **Intentional non-goals:** unattended financial writes, historical FX inference, MFA recovery codes, bank APIs, trading and AI financial advice. PostHog was not added because analytics is optional.
- **Technical debt:** the main JavaScript chunk exceeds Vite's 500 kB warning threshold; smaller platform histories still load ordered blocks; literal search/aggregate queries can benefit from further indexing/materialization when real scale warrants it. Fresh indexes have unused-index INFO notices on this small dataset. Vercel's installer warns about the native PostgreSQL test package's unapproved Linux hydration postinstall; the web build succeeds, and remote CI execution remains unverified. These are not known financial-integrity or security failures.

No known High/Critical financial correctness, integrity, security, migration, build or deployment defect was identified in the resulting implementation. All feasible completion gates have passed with the credential limitations explicitly recorded above.

**PRISM financial foundations upgrade: COMPLETE**
