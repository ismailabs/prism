# Active migration baseline

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
