# ADR 0002: isolated shadow accounting

Status: accepted for local Phase 02 implementation only (10 October 2026).

The current schema has cash accounts with undated opening balances, mutable
income/expense transactions, two-leg transfers, personal debts, repayments and
goal contributions. The proposal in `supabase/reference` conflicts with these
installed objects and is not executable input.

1. **Record of truth.** Legacy records remain authoritative for the application.
   New immutable financial events record request identity, effective instant and
   frozen financial timezone; one balanced journal supplies accounting amounts.
   Goal earmarks are non-cash allocation events with no journal. There is no
   mutable balance cache and no automatic legacy dual write.
2. **Accounts.** A separate owner/currency chart classifies asset, liability,
   equity, income and expense. Legacy cash maps to assets; `i_owe` maps to
   liabilities and `owed_to_me` to receivable assets. Credit-card payment labels
   cannot establish liabilities. Optional legacy IDs are validated when mapped
   but retained as provenance, without foreign keys that alter legacy deletion
   semantics. Deleted/changed legacy objects become reconciliation exceptions.
3. **Corrections.** Posted events, accounts, journals, lines and allocations are
   immutable. Corrections use one full inverse event per original, followed by a
   new posting if necessary. Refunds explicitly credit expense and debit cash.
   Whole-user erasure remains available through existing confirmed privileged
   Auth deletion; cascading ledger deletion is allowed only after Auth removal.
4. **Transaction boundary.** Public invoker RPC wrappers call narrow private
   definer functions because clients receive SELECT only on money tables.
   Every definer verifies Auth-owned session/MFA and `auth.uid()`, uses an empty
   search path and derives ownership internally. Owner/request locks serialize
   retries; changed payloads conflict. Deferred constraints independently require
   one journal with 2–64 lines and exact balance, or one allocation with no journal.
5. **Currency.** Each event has one native currency, all lines have composite
   owner/currency foreign keys, and money is unrounded numeric internally and
   decimal text at JSON boundaries. MYR/USD/EUR scale 2; JPY scale 0. FX postings
   are rejected in this phase. Different currencies are never summed at par.
   Cash overdrafts are allowed and displayed signed, matching legacy semantics;
   a cash-floor reservation policy would require a separate product decision.
   Principal/card settlement is capped at the currently posted liability under
   ordered account locks; no fabricated debt original or inferred interest.
6. **Compatibility.** Existing hooks, views, routes and mutable CRUD stay in
   control. No live posting integration or altered budgets/analytics. A separate
   loopback-only accounting fixture page provides balance sheet, income statement
   and journal inspection; it has no provider writes or production totals.
7. **History.** Opening balance dates cannot be inferred from account creation.
   Effective instants retain PostgreSQL microseconds, with inclusive cutoff
   membership and exact link/opening order comparisons. Transport is explicit-
   offset ISO (0001–9999, at most six fractional digits) normalized to UTC six-
   digit text; finer precision or unsupported calendar/range is rejected. SQL
   validates before casting and exact views emit timestamp text, never Date.
   A fixture must supply an explicit approved opening instant, otherwise report
   an exception. Unassigned transactions remain unresolved, never assigned a
   fabricated bank. Debt originals without origination dates/cash provenance are
   not fabricated. An approved opening debt snapshot can pair with equity.
8. **Links.** Repayment-linked transactions are principal under the current
   schema, with no invented interest. Goal-linked outgoing transactions are
   ambiguous cash allocations and block translation. Transfer-linked goals
   create allocation-only events; do not duplicate the transfer. Deleted history,
   conflicting dates/owners/currencies and unknown counterparts block acceptance.
9. **Cutover/recovery.** Additive files remain unapplied remotely. Synthetic replay
   and native races precede an approved staging snapshot rehearsal. Production
   requires backup/restore evidence, complete reconciliation, shadow monitoring
   and a separately approved write/read cutover. After any changed financial
   writes, rollback includes data recovery or forward correction, not code alone.

Keep: exact money, native FX history, session/MFA isolation, legacy reads and
English/Malay. Repair: request identity and immutable accounting for new shadow
postings. Add: constrained ledger, deterministic translators, reconciliation and
local inspection. Defer: FX clearing, live dual writes, provider cutover, automated
adjustments and reconstruction of deleted financial history.
