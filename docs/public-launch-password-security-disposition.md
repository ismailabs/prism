# Password-security disposition for public launch

Research checked: **2026-10-14T12:54:39Z**. Reviewed source:
`5e9d034cdd6bf516fc7bf335cf4fcbca7efae784` (PR #6).
Hosted password-denial evidence updated: **2026-10-14T12:58:16.276Z**.
Hosted MFA/session evidence updated: **2026-10-14T13:44:29.752Z**.
This is a decision record, not an owner approval or a release-gate PASS.

Supabase Free does not include the provider's leaked-password protection. That
control rejects passwords found in a known-breach database; the current official
[password-security documentation](https://supabase.com/docs/guides/auth/password-security)
still requires Pro or above. Stronger length and character rules are available,
but a long password can also have been leaked. A browser password check can be
bypassed by calling Auth directly and cannot substitute for server enforcement.

The mission's fresh production advisor receipt at **2026-10-14T12:53:43Z** for
`hyhsppiitijkuvpyswce` reports WARN `auth_leaked_password_protection`: protection
remains disabled. Its separate INFO for private `report_reservations` having
RLS without a policy is the reviewed intentional client-denial design; it is
not justification to grant access. This workstream did not read production
users or change provider settings.

The root workstream reports all 18 exact source migrations replayed into staging
`zwqcdfzfsudqccclficx`, with Auth **v2.197.0** and PostgreSQL **17.11**. Current
staging UI observations: email confirmation required, anonymous sign-in disabled,
Google disabled, secure email change enabled, secure password change disabled,
require-current-password disabled, and leaked-password protection disabled with
the Pro-only restriction. The root applied a staging-only server policy of
**minimum 8 characters, requiring letters and digits** through the authenticated
Supabase UI. Three direct hosted Auth signup requests were rejected with
HTTP **422** / **`weak_password`**, as recorded in the local receipt
`artifacts/public-launch/staging-password-denials.json`:

| Synthetic password class (values excluded) | Actual hosted outcome |
|---|---|
| 7-character alphanumeric | Rejected: 422 `weak_password` |
| 12 letters only | Rejected: 422 `weak_password` |
| 12 digits only | Rejected: 422 `weak_password` |

These are real server signup-denial results, not fixture assertions. Allowed
public registration and genuine Gmail inbox confirmation passed for A/B. At
**14:09 UTC**, B's actual inbox recovery/PKCE flow also rejected a weak password
update, accepted a privately generated strong password, denied the old password
and reused recovery link, and rejected the revoked session. Receipt:
`artifacts/public-launch/staging-recovery-acceptance.json` (**5 checks PASS**).
No production password-rule change or equivalent breached-password protection
is established by this staging result.

## Why the missing protection matters

An attacker can try passwords leaked from another service against PRISM. A user
who reused one of those passwords and has not enabled MFA could lose access to
their private finance workspace. Email confirmation verifies ownership during
registration; it does not prevent a later correct-password login by an attacker.
Rate limits and CAPTCHA reduce automated attempts but do not make a leaked
password safe. MFA helps only when it is enrolled and the server requires it.
No actual account compromise or customer-data exposure was observed in this
research; a missing control is not proof of an exploit, and the residual risk
still needs an explicit disposition.

## Supported controls and evidence boundaries

| Control | Enforcement and current evidence | Remaining verification |
|---|---|---|
| Minimum length and character requirements | Staging server policy is minimum 8, letters and digits. Three direct signup denials returned 422 `weak_password`; allowed public registration and weak recovery-password update denial passed. | Record final production rules separately; staging results are not production proof or a breach check. |
| Verified email | Staging requires confirmation. A/B ordinary public signup and actual Gmail INBOX confirmations passed; unconfirmed signin was denied. Secure email change is enabled. | Secure email-change behavior and final production configuration remain separate; historical production metadata does not prove these flows. |
| Auth rate limits | Supabase enforces endpoint limits; exhaustion returns HTTP 429. Documentation defaults are not this project's settings. [Rate-limit documentation](https://supabase.com/docs/guides/auth/rate-limits). | Record actual project limits and a bounded staging denial test; avoid unnecessarily consuming email quota. |
| TOTP MFA | The [TOTP API is free](https://supabase.com/docs/guides/auth/auth-mfa/totp). Genuine hosted enrollment, wrong/foreign-factor denial, AAL1 read/write denial, AAL2 own access and protected unenrollment passed at 13:44 UTC. Enrollment remains optional. | Retain the actual receipt and refresh affected tests after changes. Do not claim all users have mandatory MFA or that it replaces breach checks. |
| CAPTCHA | Supabase supports [server CAPTCHA verification](https://supabase.com/docs/guides/auth/auth-captcha) for signup, signin and recovery. Candidate forms pass the token when configured. | Actual staging provider/hostname configuration plus genuine success and missing/invalid/expired-token denial. Fixtures do not prove a human challenge was completed. |
| Recovery and password changes | Staging secure-password-change/current-password settings are OFF. Genuine inbox recovery, PKCE callback, weak-update denial, strong update, global signout, old-password denial and reused-link denial passed at 14:09 UTC. | Expired confirmation links remain blocked by actual email quota (429); an earlier expired PKCE state was retained and followed by timely B success. Enabling additional password-change controls requires compatibility tests. |
| Revoked sessions | Actual hosted refresh succeeded; real global signout then denied old unexpired-session reads, writes and refresh. A signed in normally afterward. Receipt: `artifacts/public-launch/hosted-backend-security.json`. | Keep production configuration and final candidate identity separate; repeat affected tests when controls change. This is genuine staging proof, not production smoke. |

Provider inactivity/time-boxed sessions and single-session enforcement require
Pro or above; they are not Free-plan compensations. See
[session controls](https://supabase.com/docs/guides/auth/sessions). PRISM's existing
session-record check is a separate application/database control.

## Free alternatives investigated

The [Auth Hooks plan table](https://supabase.com/docs/guides/auth/auth-hooks)
lists Before User Created and Custom Access Token on Free. The
[creation hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)
receives user/request metadata and runs only when creating a user. It does not
document a plaintext-password input or password-reset/change coverage. Password
Verification Attempt is restricted to Teams/Enterprise; its
[documented input](https://supabase.com/docs/guides/auth/auth-hooks/password-verification-hook)
is `user_id` and `valid`, not a password to check against a breach list.

**No supported Free equivalent covering signup, recovery and password changes
was established.** Do not place passwords in user metadata, add an easily
bypassed frontend/proxy check, or use privileged keys to manufacture this proof.
Mandatory MFA for everyone would require a separately reviewed product and
authorization change; the current optional-MFA design cannot be described that
way. This mission does not authorize production RLS or grant changes.

For new Free staging projects, the default SMTP templates are locked under the
[3 June 2026 provider change](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).
Existing zero-cost custom SMTP is a supported route for reviewed templates;
its credentials, quotas and actual inbox delivery still require verification.
This limitation does not justify disabling email confirmation.

Credential scope remains a separate operational boundary: the locally
authenticated Supabase CLI belongs to an unrelated organization/project and is
excluded from PRISM operations; its token was not extracted. The connected MCP
does not expose an Auth-configuration update tool. The root is using the
authenticated staging dashboard and inspecting SMTP controls read-only to
identify any necessary secure owner handoff. No SMTP credential or unrelated
provider identity may be repurposed as isolation or delivery proof.

## Options, recommendation and owner decision

| Option | Cost and consequence |
|---|---|
| Keep the current requirement and defer release | No additional purchase. Continue staging and engineering; keep G04/G12 BLOCKED until the control or a genuinely approved security disposition exists. **Safest choice within the present spending boundary.** |
| Explicitly accept the named residual risk with verified Free controls | No provider upgrade for the controls above. The owner must approve the actual final policy, optional-MFA limitation and residual credential-reuse risk. This does not create breached-password protection or automatically pass any gate. |
| Separately authorize Pro later | Official [pricing](https://supabase.com/pricing) starts at **USD 25/month**, with the first project included and additional projects from **USD 10/month**, plus applicable usage. Actual organization/project charges must be checked before any purchase. Buying or upgrading is not authorized in this mission. |

Hosted password-update denial, valid signup, real inbox confirmation, recovery
and MFA acceptance now have the staging receipts above. Complete the remaining
provider/expiry acceptance and preserve the public-release freeze. The owner has
decided to retain breach protection as mandatory. No claim of equivalent protection
or waived criterion is justified by these compensating controls.

**Current owner instruction, reported by the root:** retain the breached-password
protection requirement and keep release blocked; no waiver has been provided.
Only the product owner could change that instruction after reviewing a justified
disposition and actual hosted evidence. Any future decision must record its date,
scope and change to the approved acceptance criterion. Approval of a risk
disposition cannot clear other vulnerabilities or missing
Auth, isolation, human, operator or recovery evidence. G04/G12 remain BLOCKED
until the root gate review establishes all applicable requirements as PASS.

Owner residual-risk waiver: **UNPROVIDED; REQUIREMENT RETAINED**. Current provider/configuration observations:
**PARTIAL RECEIPTS AVAILABLE** as recorded above. The applied staging password policy
has **THREE HOSTED SIGNUP DENIALS VERIFIED**. Password-update, valid signup,
inbox and remaining Auth behavior belong to root's separate acceptance records;
genuine hosted MFA/refresh/revocation tests have passed as recorded above.
Root reports that the owner has retained the breached-password protection
requirement: **NO WAIVER PROVIDED; RELEASE BLOCKED**.
