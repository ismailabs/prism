# Active migration baseline

## Phase 3 local proposal (2026-10-10; unapplied)

`20261010021500_malaysia_profile_defaults.sql` changes only defaults for future
profiles: MYR and `Asia/Kuala_Lumpur`, including profiles created through OAuth.
It does not update existing preferences, native amounts, history, grants or RLS.
Both defaults remain user-selectable. The existing signup trigger uses these
column defaults. Its restricted function also accepts the supported signup
language metadata (`ms`, otherwise `en`), preserving username truncation,
identity ownership, conflict handling, privileges and its empty search path.
The trigger binding and Auth-provider settings are unchanged.

The disposable replay checks snapshots from a pre-existing profile, account and
transaction before/after the addition, new OAuth-style profile defaults and
explicit preference changes in PGlite and native PostgreSQL. See
[Phase 3 evidence](../../docs/phase3-finance-ux.md).

This file is **not applied remotely**. Rehearse just the approved forward additions
on a verified staging target after resolving historical migration differences
and the inherited Phase 1 proposal. Do not replay the baseline or backfill users.
If a rollback is approved, a new forward migration can restore currency default
`'USD'`, drop the timezone default and restore the prior profile-creation function
from `20260928000200_initial_finance_tracker.sql`. That affects future profiles only; it must
not overwrite preferences chosen by users. Applying or reverting requires approval.

`20260928000200_initial_finance_tracker.sql` is the empty-project baseline. It creates Profiles, Categories, Payment Methods, and Transactions with ownership RLS and MFA-aware session checks.

`20260928031516_personal_finance_platform.sql` is the additive production migration applied to the existing P.R.I.S.M. Supabase project on 2026-09-28. The remote migration history records this version. It adds Accounts, Objectives (Goals and Savings), Milestones, Contributions, Person Debts, and Repayments. It preserves all existing rows and adds an optional account reference to Transactions.

`20260928032448_exact_money_validation.sql` removes column-level numeric rounding before currency checks and validates milestone precision. It was also applied to production on 2026-09-28.

`20260928043611_focused_crud_integrity.sql` prevents deletion of financial accounts that still have linked transactions, adds the supporting relationship index, and requires an explicit server-side confirmation for authenticated self-deletion. It was applied to production on 2026-09-28 as remote migration version `20260928081917`.

`20260928082016_harden_self_delete_rpc.sql` moves the privileged portion of self-deletion back into the unexposed `prism_private` schema and leaves only a security-invoker wrapper in the public API. It was applied to production on 2026-09-28.

Apply the baseline only to an empty non-production Supabase project after replay validation. The live project predates local migration tracking; its baseline tables already existed before the additive migration. Do not push the baseline SQL onto that production project. Historical schema snapshots and the deferred event-ledger proposal live in `../reference/` and are intentionally outside the executable migration directory.

## New forward migrations

- `20260930135217_financial_foundations.sql`: profile timezone, transfers, cash-account/transfer allocation links, locking validators, exact-money invoker views and account summaries.
- `20260930135222_reporting_and_planning.sql`: ordinary reporting views, budgets, recurring rules, atomic/idempotent import and occurrence RPCs, server pagination, indexes, RLS/grants and realtime registration.
- `20260930135716_financial_relationship_indexes.sql`: eleven composite relationship indexes, removal of two redundant indexes introduced by the preceding forward migrations.
- `20260930141104_canonical_financial_transport.sql`: canonical native-currency text scale for every exact view, including historical JPY values with redundant zero decimals; no stored values are changed.

All four replay after the immutable historical chain and were applied to the intended production project on 2026-09-30 under these matching remote versions. Apply only these forward changes to the existing production project. The harden-self-delete local version `20260928082016` is recorded remotely as `20260928082111`; preserve this history difference rather than replaying old migrations. Exact view reads preserve all historical monetary values; existing link classification assumptions are documented in the root README.

## Period analytics and stabilization (2026-10-01)

- The existing local `20261001033902_analytics_drilldown_filters.sql` was already recorded remotely as `20261001035741`. Preserve that history difference and do not replay it on production.
- `20261001083346_period_analytics_preferences.sql` adds the validated profile default, its narrow column update grant, exact daily ordinary-activity totals, and complete category/payment usage counts. Both views use caller permissions and inherit ownership, session and MFA restrictions.
- `20261001083350_present_financial_progress.sql` excludes future contributions and repayments from computed present progress, preserving stored amounts and existing view columns/grants.

The two stabilization migrations were tested by replay, applied additively to production, and use matching local/remote versions. Financial record counts and checksums were unchanged. Database types were regenerated from the deployed schema. Continue applying only new forward migrations to the existing project; its historical baseline contract above still applies.

## Phase 1 local proposal (2026-10-10; unapplied)

`20261009162324_protect_debt_repayment_history.sql` adds a private invoker trigger
that rejects authenticated parent-debt deletion while any repayment exists. It
changes no rows, money, public columns, grants or RLS policies. Empty debt removal
and the existing privileged, confirmed whole-account erasure remain available.
Full synthetic replay and native concurrency/HTTP tests are recorded in
[Phase 1 evidence](../../docs/phase1-stabilization.md).

This file has **not** been applied remotely. Rehearse only this forward addition
on an authorized staging copy after resolving historical migration differences,
reviewing the Auth deletion overload, and verifying backup/restore. Do not replay
the baseline, repair timestamps, or run a production reset. If rollback is needed,
review a new forward file with `drop trigger protect_debt_repayment_history on
public.person_debts; drop function prism_private.protect_debt_repayment_history();`
in a transaction. That removes protection; it does not restore subsequently
deleted history. No rollback is needed for data from this proposal because it
does not mutate data. Deployment and database application each require approval.

## Phase 2 local shadow ledger (2026-10-10; unapplied)

`20261009220402_shadow_double_entry_ledger.sql` was created by the Supabase CLI.
It adds separate ledger accounts, financial events, journals, exact journal lines
and goal allocations with owner/currency constraints, immutable posting,
transactional request identity, inverse reversals and session/MFA RLS. Public
invoker wrappers call reviewed private definer write functions; clients receive
SELECT only on ledger tables and exact-text views. Legacy rows/views remain
unchanged; nothing automatically posts to this shadow ledger.

It is **unapplied remotely**. Full synthetic replay and native/HTTP evidence are
recorded in [Phase 02](../../docs/phase2-accounting.md). FX postings and historical
guesses are rejected. Review the [ADR](../../docs/adr/0002-shadow-ledger.md) and
[recovery runbook](../../docs/phase2-ledger-recovery.md) before any staging request.
Do not baseline/reset/normalize production migration history. After financial
writes change, recovery includes immutable receipts and accepted commands; a
code rollback or table drop is not a financial data recovery plan.

## Phase 4 planning (local, unapplied)

`20261010024257_phase4_planning.sql` adds budget rollover/threshold options, owner-scoped reserve and debt assumption tables, exact security-invoker views, and guards preserving existing debt repayment history. It introduces no financial posting RPC, counter, backfill or accrual. The authenticated app role cannot delete/rewrite repayments or recast a debt with repayment history; confirmed privileged account erasure is preserved. Review these semantics before rollout.

See `../../docs/phase4-budgeting-debt.md` for the entry decision (Phase 2 absent), synthetic replay/HTTP verification, file manifest, acceptance boundaries and release/recovery plan. **Not applied to hosted Supabase.** Reconcile historical versions first and apply only this new forward file after separate approval, backup/restore verification and a disposable staging rehearsal. Deploy the matching client only after the schema is present.


## Phase 5 connected actions (local, unapplied)

`20261010062259_phase5_connected_actions.sql` adds owned goal cadence plans,
plain-text financial notes, wall-clock reminders, private occurrence receipts
and in-app preferences. Composite foreign keys enforce owner alignment;
reference deletion nulls only the link and retains the note/reminder. Grants,
RLS and restrictive session/MFA checks protect each table; cadence amounts use
an exact-text invoker view. The invoker contribution RPC uses a stable retry
identity and the existing transfer/financial guards.

The existing exact contribution view retains its columns and permissions while
excluding future linked source movements from effective present progress. No
stored financial amounts, posting history, profile preferences or legacy
migration bytes are rewritten. Notes, receipts and reminders never post money.

This migration is **unapplied remotely** and depends on the authoritative
Phases 1–4 integration chain. Its normalized hash is recorded in
[the Phase 5 inventory](../../docs/phase5-migration-inventory.json); complete
local evidence and recovery/authorization gates are in
[the Phase 5 handoff](../../docs/phase5-actions.md).

Do not replay the initial baseline against an existing project. Reconcile actual
hosted catalogue/receipts and historical timestamp aliases first, then rehearse
only approved missing forward files in order on an isolated authorized target.
Verify PostgreSQL 17 behavior, RLS/Auth/MFA, exact HTTP text, CORS count headers,
orphan handling and the matched client before deployment. No hosted application
or release is authorized here.

A failure before commit rolls back the whole migration; native injected-failure
probes test retry and preservation of all thirteen legacy tables and exact cash.
After a successful application, prefer a reviewed forward fix. Disabling the
new routes can pause use while preserving private data. Dropping the new tables
would erase notes/reminders/receipts and requires a separate backup/export,
restore rehearsal and approval. Reverting a client or dropping a table cannot
undo posted financial history. Hosted backup/PITR and recovery remain unverified.

The authorized Phase 1–5 local Git checkpoint and Phase 6 entry checklist are
recorded in [the Phase 5 handoff](../../docs/phase5-actions.md#8-phase-15-checkpoint-and-phase-6-entry-checklist).
Local commit acceptance does not authorize applying this migration to a hosted target.
