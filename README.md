# P.R.I.S.M. Finance

PRISM is a personal finance tracker with accounts, transactions, transfers, goals, savings, debts, CSV import/export, category budgets, and explicitly recorded recurring activity. It supports English/Malay, password and Google sign-in, TOTP MFA, and password recovery.

Current local stabilization: [Phase 1 evidence](docs/phase1-stabilization.md).
The [Phase 02 shadow ledger](docs/phase2-accounting.md) remains local-only and
unapplied remotely. Historical deployment reports below describe earlier releases.

## Architecture

React 19, TypeScript, Vite, TanStack Query, Zustand, Zod, Radix UI, and Recharts form the client. Supabase Auth identifies users; PostgreSQL constraints, locking, grants, and RLS enforce financial integrity. Vercel hosts the SPA and server-only exchange-rate endpoint. Feature modules live in `src/components/financial`; financial and calendar utilities live in `src/domain`.

## Financial model

- Account balances include exact opening amounts, assigned cash transactions, transfers, and account-funded debt principal through the present instant. Future activity is excluded. Historical unassigned transactions stay unassigned.
- A transfer is one atomic row with two owned accounts and two exact native amounts. Same-currency amounts match. Cross-currency amounts are explicitly entered; current rates never rewrite history. Referenced accounts cannot be deleted; archive them to preserve history.
- Savings contributions earmark amounts without moving cash. An optional account identifies the earmark. Link an actual transfer to its destination to represent physical funding; allocation does not debit cash again.
- Repayments reduce outstanding principal. With an account, `i_owe` debits cash and `owed_to_me` credits cash. Without an account, they record principal progress only. Principal and allocations never enter ordinary income, spending, savings rate, or budgets. Interest/fees can be recorded separately as ordinary transactions.
- Deleting transfers/repayments removes their balance effects; these are mutable records, without an immutable reversal journal. Local debt deletion now checks repayment history and blocks removal of a parent with repayments. The proposed database guard remains unapplied to production; it closes concurrent deletion races when applied. Empty debts remain deletable. Confirmed whole-account erasure remains available. Deleting a goal removes allocations but preserves transfers and legacy transactions.

Existing transaction-linked contributions/repayments remain intact. Exact views classify those transactions as `savings_allocation`/`debt_principal`, excluding them from ordinary analytics while preserving cash effects. This assumes the historical link represents the entire transaction, including any fees previously bundled into it. No historical amounts, timestamps, or links are backfilled. Removing a legacy relationship returns its transaction to ordinary analytics.

## Exact money and timezone

`Money` is decimal text. Native calculations use bigint minor units. PostgreSQL `exact_*` security-invoker views cast every financial numeric to text **before JSON serialization**. Writes send decimal strings to raw tables and return IDs. Numeric raw read responses never enter financial calculations. Aggregation views and pagination RPCs also return text amounts. Generated types describe the raw schema; `database.ts` adapts checked enum values and the exact write/view boundary.

JPY permits zero decimal places; MYR/USD/EUR permit two. Excess precision is rejected, never rounded on storage. `90071992547409.93` is tested over actual PostgREST HTTP for every money-bearing entity. Chart coordinates, ratios, forecasts, and reference-rate conversions are presentation estimates. `≈` identifies converted totals and their rate date; native records remain exact.

Each profile has an IANA `financial_timezone`, initially derived and persisted from the browser on verified sign-in. Historical instants are retained; reporting uses UTC only while unconfigured. Grouping, overdue status, import calendar dates, recurrence, reports, and filters use this timezone. Wall-time entry rejects DST gaps/ambiguity. CSV and recurrence dates use local noon. Recurrence calculates from its original anchor: January 31 clamps to February's last day and returns to March 31. Each due occurrence requires explicit confirmation and has an idempotent identity.

## Auth and security

Supabase PKCE supports password, Google, and recovery callbacks. MFA is checked before workspace or recovery access. Enroll a second authenticator while the first is available: Supabase TOTP provides no downloadable recovery codes. Password reset does not bypass MFA.

All financial tables have ownership RLS and restrictive current-session/MFA policies. Composite foreign keys enforce owner, currency, and category direction. Private trigger functions have empty search paths; public operations are security-invoker RPCs. Privileged self-deletion remains in the unexposed private schema. Finance/platform query caches are cancelled and removed on ownership/token changes and deletion. Browser storage contains preferences/session/setup dismissal, not financial records. See [security guidance](docs/security.md).

Vercel headers preserve nosniff, frame denial, referrer/permissions policy and add CSP for production assets, Supabase HTTP/WebSocket connections, and the deployment toolbar. Client variables contain only public Supabase configuration. Privileged keys must never have a `VITE_` prefix.

## Local setup

Use Node 24. Copy `.env.example` to ignored `.env.local` with an isolated development project, then run:

```powershell
npm ci
npm run dev
```

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public | Public client key; sessions remain protected by RLS |
| `EXCHANGE_RATE_API_KEY` | Server only, optional | Rate provider; public fallback is available |

Vite serves the frontend. Use `vercel dev` for `/api/rates`. Configure Supabase Site URL/redirect allowlist for local and deployed origins, confirmations/SMTP, Google, and TOTP. Recovery returns to the origin with `?recovery=1`.

## Migrations and deployment

See [migration history](supabase/migrations/README.md). Replay the full numbered sequence only on an **empty development project**. Production predates local baseline tracking: never push its initial baseline or reset production. Apply only new forward migrations after local verification; preserve historical remote timestamp differences.

The linked projects are Vercel `prism-finance-app` and Supabase `hyhsppiitijkuvpyswce`. Verify environment variable names/public project URL, deploy and verify a preview, then deploy production. Configure public variables in preview and production. Regenerate `src/types/database.generated.ts` after schema changes; preserve transport adaptations in `database.ts`.

## Tests and CI

```powershell
npm run typecheck
npm run lint
npm run test
npm run test:db
npm run test:platform-db
npm run test:foundations-db
npm run test:postgres
npm run test:e2e
npm run test:responsive
npm run build
```

The PostgreSQL suite starts disposable native PostgreSQL with independent connections to verify lock waiting and concurrent overpayment. It requires PostgREST 16.4: set `PGRST_TEST_BINARY` or put the Windows executable in `.cache/postgrest/postgrest.exe`. The runner supplies bundled PostgreSQL DLLs. CI installs the Linux static binary. Temporary clusters contain test data only; Windows shutdown uses `pg_ctl` without recursive deletion.

Playwright uses Edge on Windows and Chromium elsewhere. Linux: `npx playwright install --with-deps chromium`. API fixtures exercise real UI mutation requests without writing production data. Responsive checks cover English/light and Malay/dark at 320, 360, 375, 390, 414, 640, 768, and 1440 px plus a short viewport. Artifacts remain ignored. GitHub Actions runs the same checks without production secrets.

## Loading and limits

Transactions use 15-row server pages and native filters/search; recent activity is limited to 50 rows. Database summaries calculate balances and ordinary monthly totals. One RLS-protected realtime channel listens to published transactions, categories, payment methods, profiles, transfers, budgets, and recurring rules. Accounts, goals, contributions, milestones, debts, and repayments deliberately refresh after writes and on focus/reconnect. Smaller goal/transfer/repayment lists still load in ordered blocks; dedicated activity-history pagination remains a future scale improvement.

CSV import uses the existing parser, explicit default mappings, row validation, a preview, and one bounded atomic batch. Retry IDs prevent batch duplication; users choose semantic duplicate skipping. Export explicitly exports the current page and retains formula-injection protection.

PRISM does not connect to banks, trade investments, provide AI advice, infer historical FX, schedule unattended financial writes, or offer MFA recovery codes. Live OAuth/email delivery and authenticated production mutation checks require a test account/provider configuration. See [upgrade evidence](docs/financial-foundations-upgrade.md) for actual deployment results and limitations.

## Phase 02 local accounting foundation

The additive double-entry ledger is local-only and remains a shadow foundation.
Existing application balances and reports retain their legacy authority. New
financial events post atomically with exact native money, durable request identity
and immutable inverse corrections. The migration is unapplied remotely.

Run `npm run test:ledger-db`, `npm run ledger:dry-run`, and
`npm run test:ledger-preview` for synthetic checks. `npm run ledger:preview`
opens a loopback-only English/Malay Accounting laboratory with balance sheet,
income statement and journal inspection. It is not a production route.
See [Phase 02 evidence](docs/phase2-accounting.md),
[architecture decisions](docs/adr/0002-shadow-ledger.md), and
[controlled rollout/recovery](docs/phase2-ledger-recovery.md).

## Phases 1–4 integrated local baseline

The protected `/accounting` workspace route reuses the synthetic accounting
fixture and pure reporting modules. Legacy balances remain authoritative;
the laboratory has no live ledger posting or historical cutover adapter.

See the [integration handoff](docs/phases1-4-integration-handoff.md),
[verification evidence](docs/phases1-4-verification.json), and
[complete candidate manifest](docs/phases1-4-final-inventory.json).
Run `npm run test:integration-db` for isolated native installation, Phase 1
upgrade, migration recovery, reconciliation and concurrency checks, and
`npm run test:integration-review` for the independent rollover oracle.
The [local checkpoint handoff](docs/phases1-4-local-checkpoint.md) records the
authorized integration commits. See its complete committed inventory, local
PR draft and remote/staging prerequisites before any separately authorized
publication or Phase 5 work. Local acceptance does not authorize publication,
deployment or hosted migrations.
