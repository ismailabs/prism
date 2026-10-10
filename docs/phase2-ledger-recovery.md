# Controlled rollout and financial data recovery

This is a proposal, not authorization to operate a hosted database. Phase 02
creates no production records, replaces no balance view and deploys no code.
The synthetic tool has no provider client, connection URL or apply mode.

10 October 2026 P1 remediation: both local defects are repaired and all requested
gates pass; GO for local acceptance. See
[`phase2-p1-remediation.md`](phase2-p1-remediation.md) for current gates and decision.
No hosted application or restore operation was performed. The corrected migration
is still a local additive proposal. Before rehearsal, independently review the
corrected tree/hash and repeat real PostgreSQL 17/managed Auth tests on the named,
separately approved staging and restore targets.

## Before an authorized staging rehearsal

1. Record the intended project ID, organization, Postgres major, migration
   catalog, application commit and actual serving deployment. Compare all live
   functions, RLS/grants and exact views with the local chain. Do not infer
   production from GitHub main or apply an empty-project baseline to it.
2. Resolve the historical differences documented in the migration README,
   including the private Auth deletion overload. Phase 1's repayment-history
   guard is still a separately reviewed unapplied file. Phase 02 does not
   normalize timestamps, repair the remote ledger, or reset the database.
3. Obtain approval for the named isolated staging target, data scope and writes.
   Use synthetic data first; use scrubbed historical fixtures only after a
   separately reviewed exporter and permission. The current translator accepts
   **synthetic fixtures only** and emits record IDs and native aggregates, never
   descriptions. No production export is included.
4. Verify backup retention/PITR availability for that project, take the authorized
   pre-change snapshot, and record its recovery point, encryption/access controls,
   retention and responsible operator. A configured backup is not restore proof.
   Restore to a separate approved target, compare counts/native checksums,
   Auth-owned sessions and RLS, and record actual restore time and data-loss
   exposure. No RPO/RTO or restore success is asserted by this phase.
5. Apply only reviewed additive forward files on the staged target. Check its
   actual PostgreSQL 17 behavior, Supabase managed Auth/MFA, RPC privileges,
   expiry/revocation, anonymous denial and cross-user HTTP isolation. Local
   PostgreSQL 18.4/minimal Auth fixtures do not close these provider gates.

## Translation and reconciliation contract

Use complete exact-text exports, not the 50-item recent transaction feed. Record
one consistent cutoff and the user's IANA timezone. Freeze each event's financial
date/timezone at posting. Explicitly approve opening dates and debt opening
snapshots; account/debt creation timestamps are not historical origination proof.
Zero account openings require no journal. Unknown accounts remain unresolved.

Preserve full PostgreSQL microseconds in every authoritative instant. Use strict
explicit-offset ISO input with at most six fractional digits, normalize to UTC
six-digit text, and compare complete instants. Gregorian local and normalized UTC
years must be 0001–9999; reject unsupported precision/range, invalid calendars,
leap seconds, 24:00 and offsets beyond 15:59 rather than rounding or truncating.
Cutoff membership is inclusive `instant <= cutoff`; later records are deferred.
Activity strictly before its approved opening is blocked, and linked effective
instants must be identical. SQL and HTTP exact views transport timestamps as text;
do not let a DB client's Date parser discard fractions during export/replay.

Both private write functions require explicit TRUE session authorization; FALSE
and NULL deny. RLS remains restrictive, public wrappers invoker, function search
paths empty, and client table DML absent. Include NULL/missing assurance with a
verified factor, insufficient assurance, missing/invalid/wrong-owner sessions
and zero-write snapshots in every authorized rehearsal. Denial must remain atomic
even if callers use a savepoint then COMMIT. No recovery step weakens these gates.

Reconcile for **each owner, currency and checkpoint**: cash/account balance,
ordinary monthly income/expense, outstanding payable/receivable, goal funding,
every balanced journal and Assets = Liabilities + Equity including retained
earnings. Tolerance is exactly **zero native minor units**. Do not aggregate
currencies at par. An accepted February synthetic fixture proves only that fixture;
real cutover requires beginning/ending periods and representative intermediate
checkpoints, not one final balance. Current CLI runs one selected cutoff; rerun
fixtures at the approved checkpoint set and archive each report separately.

Future items are deferred, not posted. Missing cash/debt mappings, undated
openings, conflicting owners/currencies/dates, legacy goal-linked cash expenses,
deleted history and FX transfers are exceptions. Unassigned principal cannot
acquire an invented bank. Linked principal is counted once; interest must be
explicit. Transfer-linked goal allocations do not repeat the cash movement.
Linked repayment translation preserves the existing schema's full-transaction
principal classification. It cannot prove that an old transaction contained no
bundled interest/fees. Before real replay the owner must confirm that assumption
or classify that record as an unresolved exception; no partial split is inferred.
Exceptions block acceptance even when the translated subset balances. Invalid
fixture data may be rejected before a report can be generated; never treat a
nonzero exit as successful reconciliation.
Deletion exceptions depend on an explicitly supplied known-deletion inventory;
absent records cannot be discovered from the remaining rows alone. Unknown
historical completeness is a cutover blocker, not a clean reconciliation result.

## Shadow validation and staged cutover

The new RPCs have no automatic caller in legacy forms. Before enabling shadow
writes, design one durable transactional command that records legacy effects,
request identity and shadow effects together, or a reviewed replay/outbox boundary
that detects every failed/missing shadow write. Two unrelated browser mutations
are insufficient. Store stable request keys before sending and reuse the exact
payload on retry. Changed payloads require a new request; immutable originals
require an explicit inverse correction. Liability payments serialize under account
locks and cannot exceed the currently posted liability; cash overdrafts remain
permitted. This does not promise historical balance floors on backdated corrections.

Run shadow comparison without displaying speculative figures as authoritative.
Resolve discrepancies with explicit owner-approved accounting decisions, retaining
their evidence and journal trail. Review FX clearing and refund provenance before
expanding supported semantics. Match legacy exports and independently calculated
report totals, not only two implementations of the same algorithm.

Separately approve a limited staging write/read switch, monitor mismatch counts,
posting failures/conflicts, native balances, denied requests and reconciliation
freshness, then decide on a bounded production rollout. Do not silently toggle
production balance views. Record who owns each alert and the stop conditions.

## Recovery by rollout stage

| Stage | Recovery |
| --- | --- |
| Local proposal | Revert reviewed source files; no live data exists to recover. |
| Schema only, no hosted postings | Stop new callers, preserve the verified snapshot; prefer leaving inert additive objects. Review any later removal as a new forward migration. |
| Shadow records, legacy still authoritative | Disable shadow callers, preserve immutable receipts/journals and discrepancies, repair by replay or explicit reversals. Reverting application code alone must not discard request identity. |
| New financial writes/read authority | Freeze the affected write path, record the last known-good recovery point and all later accepted commands. Choose a tested forward fix or restore to an approved separate target, replay durable commands once, reconcile all checkpoints, then switch traffic under approval. |

Never drop money tables, edit posted amounts, delete receipts or replay a baseline
as a rollback shortcut. A restore can lose valid writes after its recovery point;
recover them from durable command evidence before reopening. Re-test retries,
owner/session/MFA isolation, confirmed whole-account erasure and period reports
on the recovered target. A Vercel rollback cannot restore database state.
