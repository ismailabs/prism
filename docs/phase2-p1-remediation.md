# Phase 2 P1 remediation and local acceptance

10 October 2026, `codex/phase2-ledger`, HEAD
`72da622305754328f02ec8f5d2ca8b71a221ee17`. Both P1 fixes pass targeted
regressions. **GO for local Phase 2 acceptance: both P1 defects are resolved and
all requested verification gates pass.** Hosted staging remains
unexecuted and requires separate authorization, target identity/parity and restore
evidence. No production data, hosted service, Git index, commit, push, deployment,
merge, backfill or Phase 3 changes were made. Database replay was limited to
disposable local synthetic fixtures expressly needed for the requested tests.

## Root causes and fixes

**A — timestamp precision.** Historical normalization used `Date.toISOString()`
and authoritative comparisons used `Date.parse()`. Both discarded stored
microseconds; translation and its reconciliation reference shared the same loss,
so a false inclusion still reconciled to zero. PostgreSQL timestamptz resolution
is one microsecond ([PostgreSQL 17 datetime documentation](https://www.postgresql.org/docs/17/datatype-datetime.html)).

`ledger-instant.ts` strictly parses Gregorian ISO timestamps with explicit offsets,
retains the fraction in string/bigint form and compares exact epoch microseconds.
Supported local/UTC years are 0001–9999; offsets are `Z` or `±HH:MM` up to 15:59;
zero to six fractional digits are accepted. Unsupported precision (including
redundant seventh zero), invalid dates, leap seconds, 24:00, implicit zones and
out-of-range instants/financial calendar dates are rejected. Calendar-only Intl projection uses Date;
authoritative comparison and serialized instants never use that projection.

Posting builders and translation normalize valid transport to UTC with six digits.
Cutoff membership is inclusive `instant <= cutoff`; strictly later instants are
deferred. Approved openings include their exact instant; earlier activity is an
exception. Debt openings, repayment/transaction links, transfer/allocation links,
principal totals, ordering and reconciliation all retain complete instants.
Deterministic sorting breaks equal-instant ties by stable request key.

The SQL RPC and read-only rehearsal cutoff gates validate fractional precision/shape before timestamptz casting can
round it. `exact_ledger_lines.occurred_at` is canonical six-digit UTC **text**, so
PostgREST and native clients preserve microseconds without a driver's Date parser.
The raw event column remains timestamptz. Future RPC instants still reject.
Existing application legacy timestamp fields remain strings; legacy display helpers
are outside historical migration authority and were not changed. Any future
exporter must read complete timestamp text, never recent-feed/Date projections.

**B — NULL authorization.** With an owned current session and verified MFA factor,
missing/null signed-context aal makes the dependency's session helper NULL. The
original `u IS NULL OR NOT session_allowed()` rejection was then NULL, so PL/pgSQL
continued ([PostgreSQL conditional semantics](https://www.postgresql.org/docs/17/plpgsql-control-structures.html#PLPGSQL-CONDITIONALS)).

Both private SECURITY DEFINER write functions now reject
`u IS NULL OR session_allowed() IS NOT TRUE`. Only explicit TRUE permits execution.
Payload UUID/timestamp casts occur after authorization. Dependency migration history
and MFA rules are unchanged. Related confirmed self-deletion already uses fail-closed
coalesce; other finance write RPCs use invoker permissions/RLS. Auth lifecycle
definers are trigger-only. Both ledger public wrappers remain invoker; all seven
new function search paths are empty, anon cannot execute, trigger helpers have no
authenticated execute, and authenticated has no ledger table DML/TRUNCATE. Owner
and restrictive session RLS remain enabled on all five tables and exact views.

## Before/after regression evidence

Ignored evidence is retained under `artifacts/phase2/`:

| Regression | Original result | Corrected result |
| --- | --- | --- |
| Unchanged `phase2-review-probes.mjs` | Exit 1: baseline pass, four blocker cases fail (`p1-probes-before.json`) | Exit 0: all five cases pass (`p1-probes-after.json`) |
| RM7 at `.000900Z`, cutoff `.000100Z` | Posted at `.000Z`; income 5007, assets 15287, accepted | Deferred; income 5000, assets 15280, accepted with correct membership |
| Principal link differing by 800us | Accepted without exception | Ambiguous-link exception; rejected |
| Activity 800us before approved opening | Accepted without exception | Pre-opening exception; rejected |
| Initial four boundary unit regressions | 4/4 fail (`p1-unit-before.log`) | Expanded six cases pass in full unit suite |
| Both guards under NULL (actual source expression) | Both continue | Both reject |
| Actual missing-aal account RPC with verified factor | New DB regression fails: missing expected rejection (`p1-db-before.log`) | Both RPCs reject missing/null aal with SQLSTATE 42501 |
| Independent PostgreSQL before/exact/after 1us | Shared JS oracle previously hid the defect | Legacy SQL sum 5.00/count 2; ledger income 5.00/events 2; deferred 1; differences zero |
| SQL and actual HTTP authorization matrix | Original coverage lacked NULL | TRUE succeeds; FALSE/NULL/missing/invalid/wrong-owner session and insufficient MFA deny; RLS hides rows |
| Denied savepoint then COMMIT and HTTP requests | No NULL denial guarantee | All five ledger table counts and legacy transaction counts unchanged |
| Timestamp round trip/retry | Historical transport lost microseconds | Native exact-view string and real HTTP preserve `.000099Z`; offset normalized; stable retry ID |
| Unsupported timestamp precision/calendar | JS normalized dates; SQL could round fractions | Domain/SQL/HTTP reject; no persistent event/children |

No assertions, timeouts, authorization rules, money arithmetic, journal constraints,
idempotency rules or zero-minor-unit reconciliation thresholds were relaxed.

## Verification results

Commands run serially on the unchanged Node 24 dependency lock. Browser tests use
synthetic provider configuration and loopback servers. Native tests use a fresh
local PostgreSQL 18.4 cluster and pinned local PostgREST binary via
`PGRST_TEST_BINARY`; minimal synthetic Auth and local signed fixture JWTs are not
managed provider proof. Logs: `p1-*.log`; gate exits/durations:
`artifacts/phase2/p1-verification.json` and `p1-final-verification.json`.
The affected type/lint/unit/database/native/viewer gates are rerun after the final
range/cutoff validation additions. Full Playwright/responsive tests cover the
unchanged legacy application; the separate viewer gate covers the ledger UI.

| Gate | Result |
| --- | --- |
| `node scripts/phase2-review-probes.mjs` | PASS, all five cases |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test` | PASS, 97 tests / 9 files (21 accounting/boundary cases) |
| `npm run test:db` | PASS, exact scale/CRUD/ownership/MFA |
| `npm run test:platform-db` | PASS, edit/delete/cascades/linked history/confirmation/RLS |
| `npm run test:foundations-db` | PASS, money/period/deletion/session/MFA/exact views/import/recurrence |
| `npm run test:period-db` | PASS, timezone/period/owner/MFA/future/anonymous |
| `npm run test:ledger-db` | PASS, accounting/security/history/microsecond oracle/grants/search paths |
| `npm run ledger:dry-run` | PASS, 12 events, no exceptions, one deferred, zero differences |
| `npm run test:postgres` | PASS, actual SQL/HTTP and observed concurrent lock/retry/reversal/principal/rollback races; exact four-currency transport and erasure |
| `npm run test:ledger-preview` | PASS, English/Malay, stocks/flows, journal detail, invalid-period clearing, mobile, zero axe violations and external requests |
| `npm run test:e2e` | PASS, 73/73, zero retries, 15.2 minutes |
| `npm run test:responsive` | PASS, 341 layout checks, no browser errors |
| `npm run build` with synthetic `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` | PASS, typecheck plus production bundle; Vite build 9.07 seconds |
| Read-only staging query preparation | PASS, 23 statements: eight catalog prepared, 15 missing application relations expected, zero queries executed by the preparation helper. Actual valid/invalid cutoff guards additionally execute and pass in disposable PGlite/native tests; no hosted PG17 result claim |
| `git diff --check` / explicit source whitespace and final manifest | PASS; 26 candidates, no index changes; final source hashes retained |

## Changed files and review packet

Remediation changes 16 paths (the overall uncommitted Phase 2 packet has 26):

| Paths | Change |
| --- | --- |
| `src/domain/ledger-instant.ts` (new) | Strict exact instant contract/comparison |
| `src/domain/ledger-boundary.test.ts` (new) | Precision, inclusive membership, calendar/offset/range, links/openings, order and rerun regressions |
| `src/domain/accounting.ts`, `src/domain/ledger-reconciliation.ts`, `src/domain/accounting.test.ts` | Normalize posting transport; replace lossy authoritative comparisons; retain original accounting cases |
| `supabase/migrations/20261009220402_shadow_double_entry_ledger.sql` | Both fail-closed guards; post-auth casts; pre-cast precision validation; exact timestamp text view |
| `scripts/ledger-db-test.mjs`, `scripts/real-postgres-test.mjs` | Actual SQL/HTTP denial matrix, no-write/savepoint assertions, privilege audit and independent timestamp oracle/round trips |
| `scripts/phase2-staging-validation.sql`, `scripts/phase2-staging-reconciliation.sql` | Assert timestamp text column alongside exact money text; reject unsupported cutoff precision/range before SQL casting |
| `docs/adr/0002-shadow-ledger.md`, `docs/phase2-accounting.md`, `docs/phase2-ledger-recovery.md`, `docs/phase2-final-review.md`, `docs/phase2-staging-rehearsal.md`, this report (new) | Current fixes/evidence, precision and guard protocol, residual risks, corrected hash and explicit commit candidates |

Corrected migration SHA-256:
`0C89AD1DE837CB7ED79F9A0C0042939E1FAA05B7593A96B02A049720CAB840FE`.
Final 26-path source manifest is retained as
`artifacts/phase2/p1-final-source-manifest.json`. Original pre-review manifest and
before-fix failures are retained separately. Commit grouping/explicit paths remain
proposed in `phase2-final-review.md`; no staging or commit was performed.

## Residual gates and decision

Immutable double-entry journals, atomic posting, durable request identity, inverse
corrections, exact native money and multi-currency restrictions remain verified.
The migration remains additive and remotely unapplied by this work; legacy hooks,
routes, tables/views and balance authority remain unchanged. Original provider
catalog absence was read during the previous review; no current hosted catalog
refresh is claimed by this remediation.

Managed PostgreSQL 17/Auth/MFA, hosted migration dependency/owner/default-grant
parity, real JWT/expiry/revocation behavior, Linux CI and a tested backup/restore
remain external gates. Authorization is checked at call start, not continuous
cancellation after concurrent revocation. Raw numeric REST tables are not exact
financial transport; clients must use exact views. Historical export/hosted loader,
opening snapshot approval, interest/refund provenance and deleted-record completeness
remain unimplemented/unproven for real data. Unsupported precision is a hard failure,
not an allowed rounding policy. Existing six viewer UX issues remain tracked in
the final review and were outside this two-blocker repair.

**Local acceptance decision: GO. Both P1 blockers are closed, with failing
before-fix regressions and passing complete verification.** Independent review
can proceed on the uncommitted corrected tree. Hosted application,
publication, production cutover and Phase 3 remain **NO-GO without separate
authorization and their own evidence**. Local success must not be represented as
hosted readiness or real historical migration acceptance.
