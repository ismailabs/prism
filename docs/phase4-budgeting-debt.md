# Phase 4: budgeting, planning and debt

## Entry decision and scope

Started from clean detached HEAD `819ddef0e8a3b9aad07475ff495152e4d2ea9156`, on local branch `codex/phase4-budgeting-debt`. Node 24.19.0, npm 11.17.0; package lock preserved. No repository instructions in the empty parent AGENTS.md. Only `.env.example` existed; environment names are `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (synthetic fixtures used for tests).

Read-only provider inspection on 10 October 2026 confirmed private `ismailabs/prism`, Supabase `hyhsppiitijkuvpyswce` (PostgreSQL 17), and Vercel `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr`. Git origin retains the historical `prism-finance-tracker` URL. Vercel production still reports `e46822f5` on `codex/financial-foundations`. The GitHub connector's PR-only workflow lookup returned no runs; the historical failed run has not been requalified remotely.

The executable local migration chain and live schema have no Phase 2 event/journal implementation. An orphan Phase 2 test script references an absent migration and is not a package gate. **Entry: planning-only.** No ledger posting, legacy backfill, automatic accrual or inferred historical principal/interest split is authorized.

| Decision | Scope |
| --- | --- |
| Keep | Flat expense categories, exact decimal strings, currency separation, confirmed recurring posting, goals/savings, session/MFA RLS, legacy records |
| Repair | Debt history deletion; missing planning states and explicit assumptions |
| Add | Deterministic signed rollover, thresholds, separate reserve plans, recurring forecasts, manual debt principal snapshots, fixed APR scenarios, split preview, in-app notices |
| Defer | Subcategories (no current hierarchy), authoritative split posting/reversals/card settlement, variable/manual interest forecasts, provider release |

## Contracts

Budget planned = base allocation. Posted eligible expense comes from the existing security-invoker exact view, restricted to ordinary expense activity, native currency, financial month and timestamps at or before now. Remaining = base + rollover - posted. A month's `rollover_enabled` opts into the immediately preceding month's remaining (including a deficit). A missing month or disabled rollover resets the chain. Historical edits rebuild downstream results; no stored counters. Reserve plans are earmarks and never cash debits or expense records. Assigned totals use base allocations plus reserves, without counting rollover as income. No zero-based income claim is made.

Forecasts expand only active confirmed recurring rules starting at their unrecorded next index. They show future due dates separately from overdue unrecorded occurrences; there is no statistical extrapolation, sample size or rate assumption invented. Uncategorised rules stay visibly unallocated. Empty inputs do not predict a salary or rent.

Debt contracts are planning records linked by owner, debt and currency. Scenario principal is an explicit user supplied snapshot, dated and independent from legacy repayments. APR is integer basis points (two decimal places of percent). Supported fixed convention: interest on each period's opening balance, nominal APR divided by 12/26/52, rounded half up to native minor units. Every row, including the first, assumes a full period; UI horizon is 600 periods and interest totals cover only the modeled horizon. No daily accrual or intraperiod timing is claimed. Variable/manual rates and absent inputs yield unavailable scenarios. An allocated payment at or below interest produces a negative-amortization result. Snowball, avalanche and custom ordering apply only to liabilities of one currency and require a budget covering all minimums. Extra payment is reallocated in the same period after payoff. Dates are illustrative scheduled dates, never posted transactions.

Split previews validate exact cash = principal + actual interest + fees, currency equality and principal <= outstanding; cash and liability signs follow direction. Card settlement expense is only actual interest/fees, never principal. No mutation/RPC connects this preview to money records.

## Release boundary

Migration is a forward-only file, unapplied to hosted databases. Reconcile remote migration versions against `supabase/migrations/README.md`; never replay the baseline. Review the exact diff, rehearse in an explicitly disposable database, and obtain separate approval before hosted changes. Before that approval, verify backup/PITR and a tested restore destination. Deploy the migration before the matching client; rollback the client first and retain new planning rows. Avoid a destructive down migration; export planning rows if a restore is needed. No Git commit, push, PR, provider write or deployment is performed here.

Current Supabase documentation was consulted for grants, ownership RLS, session checks and invoker views: https://supabase.com/docs/guides/database/postgres/row-level-security. The changelog index was fetched with PowerShell after the web tool rejected its markdown content type. No relevant API change required upgrading the pinned client.

## Implemented packets and exact file manifest

| Packet | Changed files |
| --- | --- |
| 4A: scope/schema contracts | `docs/phase4-budgeting-debt.md`, `src/types/index.ts`, `src/types/database.ts`, `supabase/migrations/20261010024257_phase4_planning.sql`, `supabase/migrations/README.md` |
| 4B: rollover/reserves/forecast | `src/domain/planning.ts`, `src/components/financial/AdvancedBudgets.tsx`, `src/components/financial/Planning.tsx`, `src/hooks/usePlanningData.ts`, `src/hooks/useAdvancedPlanning.ts` |
| 4C: debt scenarios/history protection | `src/components/financial/DebtPlanner.tsx`, `src/components/financial/Debts.tsx`, `src/components/financial/planningCopy.ts`, `src/components/financial/copy.ts`; shared domain/schema above |
| 4D: restrained summary/notices | `src/components/financial/PlanningSummary.tsx`, `src/components/financial/Overview.tsx`; budget/debt screens above |
| Verification | `src/domain/planning.test.ts`, `e2e/planning.spec.ts`, `e2e/fixtures.ts`, `scripts/planning-db-test.mjs`, `scripts/foundations-db-test.mjs`, `scripts/real-postgres-test.mjs`, `scripts/verify-responsive.mjs`, `package.json`, `.github/workflows/ci.yml` |

Generated hosted schema snapshot and package lock are unchanged. `src/types/database.ts` declares the unapplied local migration contract; raw numeric reads are numbers and exact invoker views are strings. Saved planning mutations normalize grouping separators to canonical decimal strings. New planning records remain in the per-user query cache, with the existing auth cache reset; they are never added to public PWA caches or persisted preferences. New views are security invoker; new tables require both owner RLS and the existing session/MFA check. No new definer function or financial posting endpoint was introduced.

Debt repayment updates/deletes and deletion or monetary recasting of a debt with history are rejected for the authenticated application role. Note edits and deletion of empty debts remain available. The existing privileged, explicitly confirmed account-erasure RPC remains available and is tested; administrative/service-role access retains its pre-existing privileged boundary. Audited repayment reversals require Phase 2 and are unavailable here. Historical amounts are never guessed or rewritten.

## Verification matrix

All tests below use synthetic data. PGlite tests run in fresh memory; native PostgreSQL tests use an independently allocated temporary server and loopback PostgREST. The existing local pinned PostgREST binary was supplied through `PGRST_TEST_BINARY`; no hosted database URL or key was used for mutations.

| Command/check | Result | Environment / evidence |
| --- | --- | --- |
| `npm ci` | PASS with advisories | Node 24.19.0/npm 11.17.0, unchanged lockfile; 8 dependency advisories (6 high, 2 moderate), chiefly existing Tailwind tooling; no automatic major upgrade |
| `npm run typecheck` | PASS | TypeScript 5.9.3, including local migration adapter |
| `npm run lint` | PASS | ESLint repository gate |
| `npm run test` | PASS | Final run: 89 tests / 8 files; 15 planning tests, including historical month/date boundary regression and 180 generated schedule conservation cases |
| `npm run test:db` | PASS | Isolated baseline ownership/MFA and exact money constraints |
| `npm run test:platform-db` | PASS | Historical migration subset; validates historical behavior, not the new history guard |
| `npm run test:foundations-db` | PASS | Full migration chain; updated assertion requires history preservation |
| `npm run test:period-db` | PASS | Exact periods/timezone and future progress exclusions |
| `npm run test:planning-db` | PASS | 8 groups: preservation, eligible spend, exact plans/no cash, constraints, history guard, ownership/FKs, session/MFA/anon, account erasure |
| `npm run test:postgres` | PASS | Real independent connections for concurrency; actual PostgREST exact text, new plans preserve cash and history, account erasure; pinned local binary |
| `npm run test:e2e -- --output=artifacts/phase4-full-e2e-final` | PASS | 75/75 tests, 9.6 minutes, Windows/Edge, synthetic fixtures. Previous run: 74 pass / 1 new test selector failure; corrected selector is verified in this final clean run |
| Focused `e2e/planning.spec.ts` | PASS | 6/6 tests: budget historical edit/reset, grouped inputs, debt schedules/splits, no posting, history UI, bilingual mobile axe, retry states. All six also passed during the final full run |
| `npm run test:responsive` | PASS | 341 layout checks, en/ms, 320–1440px, no browser errors; mocked modules |
| `npm run build` | PASS | Explicit synthetic fixture env, current Vite >500kB chunk warning (main 526.67 kB / 153.18 kB gzip), no deployed build |
| Visual review | PASS | Synthetic screenshots at 390px/1280px; repaired mobile schedule wrapping with horizontal scrolling and keyboard focus |
| Hosted CI / production journeys | NOT TESTED | Read-only metadata only; PR-only connector returned no runs. No protected-site bypass, live users or real money |

Temporary diagnostics and screenshots are ignored local artifacts under `.cache/phase4/` and `artifacts/phase4-*.png`. The build warning and existing dependency advisories are disclosed, with no claim of a security audit. Public-site/provider behavior was not validated by these local results.

Review corrections are covered by regression checks: grouped money inputs are canonicalized before writes; the populated mobile schedule scrolls with readable amounts and keyboard access; budget month arithmetic preserves pre-1900 historical budgets and December 9999 without borrowing recurring-rule restrictions. Initial test defects (currency formatting, definition-list selectors and the fixture export) were corrected without removing monetary or authorization assertions.

## Acceptance checklist

| Criterion | Status / boundary |
| --- | --- |
| September 800/700 -> October 800+100=900; historical edits/reset/overspend | PASS: exact deterministic projection and browser fixture |
| Savings transfer 500 is not eligible spending; reserve plan has no debit | PASS: SQL transfer fixture, browser no money-write assertions |
| Loan payment 600=480 principal+120 interest, signed cash/liability/expense | PASS as isolated preview; authoritative posting GATED by absent Phase 2 |
| Card purchase then settlement is not expensed twice | PASS as pure settlement preview; actual card ledger integration GATED |
| Forecast salary/rent stays unposted | PASS: rule fixtures and unchanged transaction rows |
| Missing/zero income, partial/historical month | PASS: no ratio/false income claim or statistical extrapolation; empty assumptions state |
| Overdue debt / upcoming planned payment | PASS: retained debt overdue state plus dated assumption review notices; no notifications emitted |
| Missing APR/minimum, variable/manual APR, negative amortization, overpayment, currency mismatch | PASS: unavailable/explicit result; native currency and exact components |
| Zero rate, frequency/clamping, partial/early payments | PASS for documented periodic scenarios and updated principal snapshots; actual partial/early posting, edits and reversals GATED |
| Parent/child allocation | DEFER: verified categories are flat; no speculative hierarchy or double-counted rollup |
| New owner/session/MFA RLS and cross-user references | PASS in disposable DB; hosted rollout NOT TESTED |
| Local unit/DB/browser/type/lint/build | PASS; all 75 browser tests, all 89 unit tests, all available DB gates, typecheck/lint/build and 341 responsive checks |
| Live migrations, backfills, bank integration, live accrual, advice | EXCLUDED / NOT PERFORMED |

## Next packet and approval gate

The next financial packet is a separately verified Phase 2 canonical ledger and reconciliation adapter, then idempotent atomic split posting and explicit audited reversals with principal/interest/fee and card-settlement fixtures. This phase does not authorize implementing that missing ledger silently. Separately review the new migration, especially the intentional history guard and account-erasure exception, before an approved disposable staging rehearsal and release. Verify restore/PITR evidence before any hosted migration; an external database, GitHub publication, or Vercel deployment needs explicit authorization. No approval is needed for reviewing these local files.

Recommendation: local planning packet reviewable; release NO-GO until the migration/release gate and hosted evidence are satisfied. Authoritative debt posting remains NO-GO until Phase 2 is verified.
