# Phase 02 implementation and acceptance record

Updated for the explicitly authorized P1 remediation on 10 October 2026.
Historical timestamp truncation and both NULL authorization guards are repaired.
Local Phase 2 acceptance is restored: GO after all requested gates passed
(97 unit tests, 73 Playwright tests and 341 responsive layout checks included).
The current before/after evidence, complete gate results and local GO/NO-GO
decision are in [`phase2-p1-remediation.md`](phase2-p1-remediation.md); the earlier
implementation results below remain a historical record. Hosted metadata below
was observed during implementation/review and was not refreshed in remediation.

The new `ledger-instant.ts` preserves six fractional digits and compares bigint
microseconds; domain posting, historical openings/links/order/cutoffs and the
reconciliation oracle share its strict representability contract. The SQL RPC
validates before timestamptz casting, and the exact read view emits UTC timestamp
text to prevent driver Date truncation. Both definers reject `session_allowed()
IS NOT TRUE` before payload UUID/timestamp parsing or privileged access. New
boundary tests and actual SQL/HTTP regressions prove rejection without persistent
ledger/legacy writes. Native lock, immutable journal, exact-money, four-currency,
rollback and idempotency coverage is retained. Zero-money tolerance is unchanged.

Local-only double-entry foundation on `codex/phase2-ledger`, starting from clean
detached `72da622305754328f02ec8f5d2ca8b71a221ee17`. Phase 1's accepted local
baseline is recorded in `phase1-stabilization.md`; the user requested Phase 02.
No pre-existing local changes were present. The ancestor AGENTS file is empty.
Node 24.19.0 / npm 11.17.0 and the existing lockfile/dependencies are retained.
Only `.env.example` exists; no secrets were read. Names are
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `EXCHANGE_RATE_API_KEY`.

Read-only connectors confirm the old Git remote redirects to private
`ismailabs/prism`. Latest hosted CI remains failed run `37255165638` on
`819ddef0`; it is not a run of this local phase. Vercel still reports production
`dpl_5tKmFadGtfrFRfaoL88dtmJruBSJ`, independently of local HEAD. Supabase
`hyhsppiitijkuvpyswce` is PostgreSQL 17.6 and its migration catalog retains the
documented timestamp differences; neither Phase 1's guard nor this ledger file
is remotely applied. No financial records were queried from that provider.

## Packets and exact files

| Packet | Files | Behavior |
| --- | --- | --- |
| 2A decisions | `docs/adr/0002-shadow-ledger.md` | Nine required architecture decisions based on the active schema, keep/repair/add/defer and explicit tradeoffs. |
| 2A schema | `supabase/migrations/20261009220402_shadow_double_entry_ledger.sql` | New owner/currency chart, immutable posted events, journal headers/lines, non-cash allocations, balanced deferred constraints, sealed insertion boundary, session/MFA RLS, narrow private definer writes and public invoker wrappers/exact views. |
| 2B engine | `src/domain/accounting.ts` | Typed deterministic commands for salary/income, expenses/splits, transfers, signed openings, loan principal/interest, card settlement, refund, reversal, goal earmark/funding and approved adjustment; exact native stock/flow reports. |
| 2B/2C independent fixtures | `src/domain/accounting.test.ts`, `scripts/ledger-db-test.mjs`, `scripts/real-postgres-test.mjs`, `supabase/tests/ledger-history.synthetic.json` | Domain expectations, full migration replay, failed posting rollback, changed-payload conflicts, owner/session/MFA denial, late insertion/immutability, native races/caps, actual PostgREST and legacy SQL comparisons. |
| 2C translator | `src/domain/ledger-reconciliation.ts`, `scripts/ledger-dry-run.mjs` | Deterministic offline synthetic translation with explicit opening dates, unassigned/link/deletion/FX exceptions, deferred future records and zero-tolerance reconciliation. |
| 2D local surface | `scripts/ledger-preview.mjs`, `scripts/ledger-preview.html`, `scripts/ledger-preview-test.mjs` | Loopback-only synthetic Accounting overview, balance sheet, period statement and journal detail, English/Malay, native currency/date controls and mobile/accessibility checks. No existing route or financial hook changed. |
| Gates/runbook | `package.json`, `.github/workflows/ci.yml`, `supabase/migrations/README.md`, `README.md`, `docs/phase2-accounting.md`, `docs/phase2-ledger-recovery.md` | Active checks, evidence, unapplied status and staging/cutover/data-recovery gates. |

Historical `scripts/phase2-db-test.mjs` and `supabase/reference` are left intact;
they describe the old incompatible proposal and are not active ledger gates.
The CLI created the forward filename; no historical migration was edited.

## Usage and boundaries

`npm run test:ledger-db` replays into a fresh in-process synthetic database.
`npm run test:postgres` additionally runs independent native connections and
loopback PostgREST. It requires the pinned local PostgREST binary, as before;
CI installs it. The local run uses the verified existing 16.4 binary via
`PGRST_TEST_BINARY`, not provider credentials. The existing native PostgreSQL
18.4 harness is retained; PostgreSQL 17 managed-provider acceptance is still open.

`npm run ledger:dry-run` uses the committed synthetic JSON and writes
`artifacts/phase2/reconciliation.json` (ignored by Git). Optional path input must
also declare `fixture_kind: synthetic`; there is no network or apply mode.
The report contains IDs, counts and aggregate totals, never descriptions or
individual real-user transactions. It exits nonzero on discrepancy. The checked
fixture has 12 events, zero exceptions, one future item deferred and 16 chart
accounts (12 native control accounts plus two cash and two personal-debt accounts).
At the February cutoff, MYR assets 15,280, liabilities 1,500, equity/net worth
13,780; period income 5,000 and genuine expenses 220. Every comparison is exact.
These amounts are synthetic acceptance examples, not live user balances.

`npm run ledger:preview` serves only `http://127.0.0.1:5182/`; the optional
`PRISM_LEDGER_PREVIEW_PORT` changes its local port. It reads the same reconciled
fixture and has no mutation controls or Supabase client. It is not included in
the production application build. Signed ledger account balances are advanced
detail; normal balance sheet liability/equity values use their natural signs.

Authoritative balance calculations remain legacy. New immutable rows have no
dual-write integration; FX postings are rejected. Receipt identity, full inverse
corrections and goal allocations are durable. Raw numeric tables support SQL;
clients must use exact text views for journal/allocation money. Private definers
are justified solely by denying direct client money writes and verify Auth-owned
session/MFA before privileged access. They do not accept a caller-supplied owner.
Ledger accounts use stable validated legacy provenance without altering legacy
foreign-key/deletion behavior. Whole-user erasure remains the separately confirmed
existing privileged Auth operation, not an ordinary journal correction.

## Verification matrix

The first full browser run passed 70/73 in 20.5 minutes. Failures were the
five-second dashboard-readiness assertion in `foundations.spec.ts:7`, teardown
after the complete allocation/repayment workflow at `foundations.spec.ts:17`, and
the cumulative seven-period workflow at `periods-colors.spec.ts:17`. The host
had only 17 MB free RAM and approximately 1.8 GB in memory compression. The
temporary viewer was closed and its runtime reset; unrelated processes were
left intact. All three passed unchanged in 45.7 seconds. A subsequent fresh-build
full suite passed **73/73 in 7.8 minutes**, with zero retries and no E2E source or
timeout changes. The resource explanation is supported by this before/after
evidence, not a claim that timing failures can always be ignored. Initial
synthetic failure traces remain under `artifacts/phase2/first-e2e-failures`.

The local viewer test initially used Playwright's convenience page context, which
axe does not support, and then found ambiguous exact selector labels from wrapped
select options. The harness now uses an explicit context and the controls have
explicit accessible names; no assertion was removed.

Initial schema compile and alias errors were fixed before fixture acceptance.
The first native run passed SQL/races but lacked this worktree's PostgREST binary;
rerun with the existing pinned binary passed the actual HTTP checks. No failed
checkpoint is treated as acceptance evidence.

| Command | Final result | Environment / scope |
| --- | --- | --- |
| `npm ci` | PASS | Existing locked dependencies; 410 packages. Audit output retains 8 dependency advisories; no forced upgrade or security certification. |
| `npm run typecheck` | PASS | Final TypeScript source and synthetic fixture types. |
| `npm run lint` | PASS | New domain code, existing application and hook rules. |
| `npm run test` | PASS, 91 tests / 8 files | Includes 15 new accounting/reconciliation cases and the existing 76 tests. |
| `npm run test:db` | PASS | Original isolated baseline/CRUD/RLS/MFA checks. |
| `npm run test:platform-db` | PASS | Historical platform relationships and confirmed erasure. |
| `npm run test:foundations-db` | PASS | Full-chain PGlite replay and existing financial/security fixtures. |
| `npm run test:period-db` | PASS | Full replay, exact timezone/period/future/security checks. |
| `npm run test:ledger-db` | PASS | Full fresh replay, all mandatory postings, exact/atomic errors, precision/currency/ownership, expiry/revocation/session ownership/anonymous/MFA denial, immutability and synthetic translation vs independent legacy SQL. |
| `npm run ledger:dry-run` | PASS | 12 events; zero discrepancies/exceptions; one future record deferred; native tolerance zero. Intermediate cutoff and large aggregate fixtures also pass in unit checks. |
| `npm run test:postgres` with local `PGRST_TEST_BINARY` | PASS | Native PostgreSQL 18.4; observed connection lock waits, retry/reversal/principal races; four-currency ledger HTTP values above JS safe integer boundaries, exact strings, payload 409, denied direct writes and AAL2 confirmed full ledger erasure. Minimal Auth fixtures; no hosted credentials. |
| Three previously failing E2E cases | PASS, 3/3, 45.7 seconds | Fresh fixture build; unchanged assertions, zero retries. |
| Fresh full `npm run test:e2e -- --reporter=line` | PASS, 73/73, 7.8 minutes | Loopback fixture bundle, Edge; no opted-in deployed-site spec, retries or E2E changes. Initial 70/73 checkpoint above retained. |
| `npm run test:ledger-preview` | PASS | Desktop/mobile English/Malay, currency/date semantics, journal inspection, stale-value clearing, zero WCAG A/AA violations on checked desktop/mobile pages and zero external requests. |
| `npm run test:responsive` | PASS, 341 layout checks, zero browser errors | Existing application, 320–1440 px, English/Malay, synthetic fixture hooks. |
| `npm run build` | PASS, 13.4-second Vite build | Final TypeScript check plus fixture URL/key; no deployment or provider target. |
| `git diff --check` | PASS | No whitespace errors; expected Windows CRLF conversion notices only. |

Screenshots and the exact reconciliation JSON are in ignored local
`artifacts/phase2/`. The initial implementation had 18 phase paths; final review
added five, and P1 remediation adds three (26 total). All remain uncommitted for
review. No unrelated edits or remote mutations.

## Acceptance and next gate

| Criterion | Status and evidence |
| --- | --- |
| Clean isolated replay; balanced/owner-scoped atomic postings | PASS in full-chain PGlite and native PostgreSQL, including missing/partial writes, late additions, direct write denial and independent connection races. |
| Mandatory accounting fixture matrix | PASS: salary 5,000; groceries 100; asset transfer 500; principal 480 + interest 120 = cash 600; purchase/card settlement; explicit refund/inverse correction; concurrent retry/reversal; native currency separation/FX rejection; future confirmation rejection; cashless goal earmark and atomic goal transfer. Signed openings, permitted cash overdraft, split expense and explicit adjustment also exercised. |
| Deterministic historical translation/reconciliation | PASS on synthetic fixtures, exact zero tolerance, four intermediate cutoffs, unchanged input-order results and aggregates above the entry cap. Unassigned/missing mappings, ambiguous links/dates, FX, overpaid principal and supplied deleted-history inventory block acceptance. |
| Legacy backward compatibility | PASS local gates recorded above. No application hooks/routes, balance/reporting views or legacy money rows are changed by the migration. |
| Architecture, staged cutover and realistic recovery | PASS as reviewed local documentation; actual hosted restore/rehearsal is NOT TESTED. |
| Explicit local-only status | PASS: unapplied migration, no push/PR/deployment/provider setting changes or real-user backfill; accounting is not production-authoritative. |

Hosted schema application, real historical cutover,
managed Auth/PG17 behavior and backup/restore rehearsal are intentionally **not
tested or approved** here. See `phase2-ledger-recovery.md` for their precise sequence.
The next reviewable packet is staging parity/snapshot rehearsal, after approval
for its exact target and data scope. Do not deploy, push/PR, migrate a live target
or change balance authority as part of this local phase.

Relevant official platform guidance checked during implementation:
[Supabase RLS and invoker views](https://supabase.com/docs/guides/database/postgres/row-level-security),
[PostgreSQL 17 constraint triggers](https://www.postgresql.org/docs/17/sql-createtrigger.html).
The Supabase changelog index was requested; it did not provide usable changelog
content in this environment. Current function/RLS guidance was checked through
the Supabase documentation connector instead.
