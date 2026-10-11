# Current security model

This replaces obsolete AI/report setup instructions. Current setup and checks are in the [README](../README.md).

All financial tables use owner RLS plus restrictive `prism_private.session_allowed()` checks. Session IDs must refer to live Auth sessions; anonymous Auth users are denied. A verified MFA factor requires `aal2`. The profile MFA field is display-only, not an access-control input and not client-writable.

Exact views and public financial RPCs run as the caller. New trigger functions use empty search paths and no public execution grants. The deletion contract uses a private privileged function and a public security-invoker wrapper validating explicit confirmation. Auth-user deletion cascades through owned rows, including new entities. On 11 October 2026, the authorized production mission verified and revoked the unexpected authenticated EXECUTE grant on `prism_private.delete_own_account()` in `hyhsppiitijkuvpyswce`. Fresh hosted checks deny that overload to anon/authenticated and preserve the confirmed-text overloads. The Data API dashboard exposes public/graphql_public and excludes prism_private. No hosted deletion RPC was invoked. See the [production mission record](release-validation/production-mission-2026-10-11.md) for exact repair, evidence and remaining recovery/Auth/launch gates. Catalog permission evidence does not establish a completed hosted Auth/MFA journey.

Composite foreign keys preserve owner, currency, and category direction. Referenced accounts cannot be deleted. Parent-row locks serialize financial-event reuse and repayments. Native PostgreSQL tests confirm real lock waiting and rejection after the competing commit; PostgREST HTTP tests confirm exact text transport and anonymous denial.

Finance/platform caches are cancelled and removed on identity/token changes and deletion. Cancelled reads and late optimistic responses cannot recreate removed query entries. Public FX data may remain. Browser storage holds preferences, Auth sessions, and setup dismissal, not financial rows.

Recovery preserves MFA gating. Supabase TOTP has no downloadable recovery codes; enroll another authenticator before losing the first. Password reset does not remove MFA. Configure Site URL, redirects, Google, SMTP, and password policy in Supabase Auth. Never put service-role credentials in Vite variables.

Vercel headers preserve frame denial, nosniff, referrer and permissions policy, and add a tested production CSP. Review live security advisors after schema changes. Actual live checks, provider configuration limits, and fixture-only tests are distinguished in the upgrade report.
