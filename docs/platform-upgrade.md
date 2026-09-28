# Prism personal finance upgrade (2026-09-28)

## Architecture observed

Vite 8, React 19, TypeScript 5, npm, Tailwind 3, Radix UI, TanStack Query, Zustand, Vitest, and a Vercel rates function. Client-side routes are selected in `src/App.tsx`. Supabase Auth and MFA protect the workspace; Postgres RLS also checks a current session. The shipped model had Profiles, Categories, Payment Methods, and Transactions. Payment methods were labels, not bank accounts. Existing transaction data was retained.

## Implemented model

- Accounts hold a native currency and opening balance. Transactions can optionally link to an account. Balance is derived from the opening amount plus linked income and expenses; preexisting transactions remain unassigned.
- `objectives` holds both Goals and Savings with separate product pages. Contributions and milestones are owned child rows. Funded amount and completion are derived from contributions. A linked contribution uses its transaction's current amount, so an edit changes progress and deletion removes the contribution.
- `person_debts` tracks `i_owe` and `owed_to_me`. Outstanding balance is original principal less repayments. A linked repayment uses the current transaction amount. Database triggers reject overpayment, incompatible transaction direction, and changes that would invalidate a linked repayment.
- Composite foreign keys enforce matching owner and currency for linked records. All six new public tables have ownership RLS and current-session restrictions. The older finance tables already had RLS. The existing public execute grant on `rls_auto_enable()` was revoked.
- Financial progress uses real amounts, target percentages, debt reduction, overdue state, recent activity, and a next debt action. The standalone “Your direction / Financial progress” heading was removed during the focused dashboard cleanup; the account, debt, goal, and savings summaries now sit immediately below the KPI row.
- Existing exchange-rate service remains centralized in `server/rates.ts` and `src/services/currency.ts`. Native records stay unchanged. Converted dashboard aggregates are marked approximate and include the rate date.

## Migrations and deployment

The production migrations are `20260928031516_personal_finance_platform.sql`, `20260928032448_exact_money_validation.sql`, `20260928043611_focused_crud_integrity.sql`, and `20260928082016_harden_self_delete_rpc.sql`. They were replayed with PGlite and applied to the observed project. The focused migrations restrict deletion of accounts with linked transactions, add the supporting index, require explicit account-deletion confirmation, and keep the privileged deletion function in the unexposed private schema behind a security-invoker wrapper. The focused migration retained 7 users, 3 accounts, 22 transactions, 2 objectives, and 3 debts. Live generated schema types are saved in `src/types/database.generated.ts`; the application's adapted boundary types keep monetary values as decimal strings.

The Vercel project is `prism-finance-app`, deployed at `https://prism-finance-tracker.vercel.app/`. The focused-upgrade deployment is `dpl_Hegh8t9jcfTtiaM2oCyNCxR9tuqS` (Ready). The production configuration has Supabase URL and public key, plus server-only secrets. The app uses no service-role key in the browser.

## Verification and limits

`npm test` passed 34 tests. `npm run test:platform-db` passed account edits, deletion restrictions, goal/savings/debt cascades, linked-transaction preservation, self-deletion, and two-user RLS isolation. Four Playwright tests passed, including authenticated mocked data flows, mobile drawer behavior, destructive confirmations, account editing, and authentication guards. TypeScript, lint, and the production build passed. Production SPA routes and `/api/rates` returned 200, the deployed bundle contains the focused UI, and Vercel reported no runtime errors after deployment. The attached production browser tab was signed out, so authenticated production mutations were not performed against a real user account.

The original tracker has income/expense transactions but no transfer ledger. An objective's manual contribution earmarks an amount; it does not move cash between accounts. Existing transactions are not assigned to newly created accounts automatically. Exchange rates are used for estimated display totals rather than historical conversion snapshots. New finance pages currently use English copy while existing navigation supports English and Malay. Supabase Auth leaked-password protection remains disabled at the project setting level; a private `report_reservations` table has RLS without policies because it is not exposed to clients.
