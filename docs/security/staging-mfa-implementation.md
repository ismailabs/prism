# Mandatory MFA staging implementation — 18 October 2026

Scope: PR #6 development and isolated `zwqcdfzfsudqccclficx` only. Production is not authorized. This does not implement breached-password rejection or accept the residual risk.

The new financial guard requires a live, unexpired AAL2 session, a current approved native TOTP factor, two approved verified factors, confirmed email and matching ownership. Approval requires native recent mailbox proof and recent TOTP verification. A Free Custom Access Token hook rejects unapproved factor activation without independent mailbox proof; native transaction rollback must pass the real Auth test before hosted activation. Previously activated accounts cannot restart enrollment after losing all approved factors.

Replacement requires an existing approved factor plus fresh mailbox proof. Native un-enrollment remains possible, but losing either of the last two approved factors closes financial access. Losing every factor has no email-only or administrative recovery bypass. Independent physical custody cannot be established by software; the acknowledgement is not human-test evidence. Total-loss recovery and public-release acceptance remain BLOCKED.

Financial Realtime publication is removed; Data API ownership/RLS remains authoritative. Sessions expire for financial access after 24 hours; deletion additionally requires TOTP proof from the last five minutes. Existing user IDs, financial owner IDs and verified factors are preserved.

Verification is in progress. `scripts/mandatory-mfa-db-test.mjs` is an adversarial SQL fixture suite, not native Auth proof. `scripts/local-supabase-acceptance.mjs` exercises real GoTrue, PKCE email actions, MFA rollback, backup replacement, recovery and direct PostgREST on a disposable loopback-only Linux stack. Neither local SMTP capture nor UI fixtures prove hosted email delivery, Google client permission, physical authenticator separation or production readiness.

No launch gate is marked PASS by this document. Final receipts and hosted limitations will be recorded after verification.
