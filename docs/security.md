# Historical security notes — superseded for setup

Do not apply the legacy SQL referenced below. The live schema differs and Reports is permanently removed. Use [Phase 1 safety procedures](codex/PHASE_1_SAFETY.md) and the [verified baseline](codex/PHASE_1_REPORT.md). The remainder is historical evidence, not current setup instructions.

Apply `supabase/migrations/001_prism_schema.sql` once through the Supabase SQL editor or your migration pipeline. The filename follows the requested build specification. The connected project was inspected read-only: its public schema was empty when this implementation was prepared. No remote schema changes were made during development.

## Auth configuration

In Supabase Authentication, set the production Site URL and allow both that origin and `http://localhost:5173` as redirect URLs. Enable Email/Password authentication and email confirmations. Configure an SMTP provider for production email delivery. Set the minimum password length to at least eight characters; the registration UI also requires a letter and a number.

Enable Google in Authentication → Sign In / Providers, supply the OAuth client ID and client secret from Google Cloud, and register the Supabase provider callback URL in Google Cloud. Google secrets belong in Supabase, never in frontend variables. OAuth uses PKCE and returns to the current application origin.

Under Authentication → Multi-Factor Authentication, enable TOTP enrollment and verification. Supabase supplies and verifies the TOTP secret; SQL cannot enable an Auth service setting. The app supports enrollment, QR/manual key display, verification, multiple authenticators, cancellation cleanup, and unenrollment. Store a second authenticator on a secure backup device if recovery is needed. Supabase does not supply TOTP recovery codes through this flow.

## Database protection

All five public tables and the private reservation ledger have RLS enabled. The ownership checks use `auth.uid()`; profiles use their primary-key `id` as the owner. Restrictive policies additionally check that the JWT's `session_id` still belongs to a live, unexpired Auth session. If the account has a verified MFA factor, every read/write requires `aal2`. Anonymous Auth accounts are rejected.

The trigger on `auth.mfa_factors` synchronizes `profiles.mfa_enabled` after enrollment, verification, or removal. The field is display-only: it is not trusted for access decisions, and clients lack column-update permission. A trigger on `auth.users` creates a profile. Metadata supplies only the display name, never permissions.

Composite foreign keys ensure transactions can only reference their owner's categories and payment methods, and category type must match transaction type. Removing a category or payment method clears its transaction references while preserving financial history. Deleting an Auth user cascades to every owned row. Category type changes fail while existing transactions reference the old type, so users must recategorize those transactions first.

Account deletion is intentionally not exposed by the current UI. The active baseline migration contains a proposed MFA-gated RPC, but it has not yet been validated against a real Supabase Auth environment; therefore it is deferred and must not be advertised as available.

Security-definer implementation functions are confined to `prism_private` with an empty `search_path`, explicit grants, and explicit caller checks for callable operations. Public RPC wrappers run as the caller. Do not add `prism_private` to the exposed API schemas. Trigger functions cannot be called as ordinary RPCs.

Explicit table grants are included because new tables are no longer automatically exposed by current Supabase defaults. The migration registers the finance tables with the existing `supabase_realtime` publication. RLS continues to guard subscriptions; listeners also refetch after focus/reconnect because deletes do not always include filterable old-row information.

## Server secrets and AI reports

Only `VITE_SUPABASE_URL` and the public `VITE_SUPABASE_ANON_KEY` are browser variables. `SUPABASE_SERVICE_ROLE_KEY`, `HIGGSFIELD_API_KEY`, and `EXCHANGE_RATE_API_KEY` must remain in Vercel's server environment. Never prefix server secrets with `VITE_` or commit `.env.local`.

The authenticated report reservation RPC permits at most two active jobs and ten reservations per rolling 24 hours. An advisory transaction lock serializes reservations for each user. A private ledger prevents clients from resetting the quota. Jobs older than an hour are expired before checking the active-job limit. Reservations consume quota even if a provider request later fails, preventing retry loops from creating unlimited upstream requests.

Clients can read only their own report rows and cannot alter provider request IDs or URLs. The server validates the signed user session, then uses the service-role key for processing updates scoped by both report ID and owner ID. The service-role key bypasses RLS, so owner checks in every server operation are mandatory. Database quotas apply to authenticated reservation calls; trusted administrative code must preserve them.

## Verification and deployment

Run `npm test` for the included finance and API tests. This checkout does not include the previously documented `supabase/tests/security.mjs` database test harness. The unit tests do not verify live SQL execution, RLS policies, Auth providers, or migration state; those require separate database and authenticated end-to-end checks.

Review Supabase Security Advisors after migration. Confirm a newly registered account creates its profile, create a transaction, sign out and back in, enroll TOTP, and verify that an AAL1 session cannot read finance rows until challenged. Verify Google OAuth on each deployed origin.

References: [Supabase TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp), [MFA enforcement](https://supabase.com/docs/guides/auth/auth-mfa), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [explicit Data API grants](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
