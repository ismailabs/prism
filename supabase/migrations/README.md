# Active migration baseline

`20260928000200_initial_finance_tracker.sql` is the only executable baseline. It creates the currently shipped Profiles, Categories, Payment Methods, and Transactions product model with ownership RLS and MFA-aware session checks.

Apply it only to an empty non-production Supabase project after replay validation. Historical schema snapshots and the deferred account/event-ledger proposal live in `../reference/` and are intentionally outside the executable migration directory.
