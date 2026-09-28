# Active migration baseline

`20260928000200_initial_finance_tracker.sql` is the empty-project baseline. It creates Profiles, Categories, Payment Methods, and Transactions with ownership RLS and MFA-aware session checks.

`20260928031516_personal_finance_platform.sql` is the additive production migration applied to the existing P.R.I.S.M. Supabase project on 2026-09-28. The remote migration history records this version. It adds Accounts, Objectives (Goals and Savings), Milestones, Contributions, Person Debts, and Repayments. It preserves all existing rows and adds an optional account reference to Transactions.

`20260928032448_exact_money_validation.sql` removes column-level numeric rounding before currency checks and validates milestone precision. It was also applied to production on 2026-09-28.

`20260928043611_focused_crud_integrity.sql` prevents deletion of financial accounts that still have linked transactions, adds the supporting relationship index, and requires an explicit server-side confirmation for authenticated self-deletion. It was applied to production on 2026-09-28 as remote migration version `20260928081917`.

`20260928082016_harden_self_delete_rpc.sql` moves the privileged portion of self-deletion back into the unexposed `prism_private` schema and leaves only a security-invoker wrapper in the public API. It was applied to production on 2026-09-28.

Apply the baseline only to an empty non-production Supabase project after replay validation. The live project predates local migration tracking; its baseline tables already existed before the additive migration. Do not push the baseline SQL onto that production project. Historical schema snapshots and the deferred event-ledger proposal live in `../reference/` and are intentionally outside the executable migration directory.
