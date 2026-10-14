# Isolated staging and external acceptance

Updated 2026-10-14 14:30:46 UTC. **Hosted staging is established; public release is
still BLOCKED.** This supersedes the earlier missing-project/free-slot handoff.
The following receipts apply to **5e9d034cdd6bf516fc7bf335cf4fcbca7efae784**,
[PR #6](https://github.com/ismailabs/prism/pull/6). The deletion-copy repair,
additional harnesses and documentation still require final-head CI and refreshed
staging artifact evidence. No result below certifies that future head.

## Verified hosted checkpoint

| Resource | Observed identity or control |
| --- | --- |
| Supabase | Separate synthetic-only prism-staging, **zwqcdfzfsudqccclficx**, API https://zwqcdfzfsudqccclficx.supabase.co |
| Vercel | Separate prism-staging, **prj_nrfjV3bBN8WnVcGINUUZlLL4HuYe** |
| Protected preview | https://prism-staging-acceptance-ismailstudio.vercel.app/ |
| Tested artifact | **dpl_EAGPrj4fQ7zknLtTb58GdxsiePd8**, source **5e9d034cdd6bf516fc7bf335cf4fcbca7efae784** |
| Protection/binding | 14 October 13:22 UTC: anonymous 302, authorized 200. Browser asset review and signed-in requests target staging; no production/service-role key or foreign backend request recorded. |
| Schema | 18 reviewed source migrations applied only to staging; source hashes and provider receipt mappings retained at 12:50 UTC. Original files and production migration history were preserved. |
| Test actors | A/B created through ordinary public GoTrue signup, actual Gmail confirmations and normal sign-in; no admin-confirmed or privileged authorization shortcut. |

The staging schema receipt maps original source versions to new provider versions
named with the original timestamp/name, such as
**source_20260928000200_initial_finance_tracker**. These are staging-specific receipts, not
permission to renumber/replay production history. Never import customer rows.
Use your permitted Vercel account if the preview access screen appears.
Credential values, private addresses, action links and session state stay private.

## Actual hosted results, with limits

| Evidence / 14 October UTC | Accepted scope |
| --- | --- |
| staging-schema-receipt.json, 12:50 | All 18 source/migration mappings retained. |
| staging-confirmation-b-acceptance.json, 13:12 | Actual received confirmation, allowed PKCE callback/code exchange, consumed-link denial, normal confirmed sign-in and owned profile. A inbox receipt retained separately. |
| hosted-public-browser-acceptance.json, 13:27–13:29 | 37 checks PASS: five public routes in EN/MS and both themes, five emulated widths, all 16 anonymous private-route guards; 20 axe scans with zero violations. |
| hosted-backend-security.json, 13:44 | 4/4 groups PASS: real TOTP, wrong/foreign factor denial, AAL1 restrictions/AAL2 own access, refresh, unenrollment, global revocation and restored own session. |
| hosted-signed-ui-probe.json, 13:57–13:59 | 17 checks PASS: ordinary UI sign-in, hosted dashboard oracle and all 16 private destinations; 16 axe scans with zero violations, zero runtime errors/foreign backend requests. |
| hosted-backend-finance.json, 14:01–14:02 | 10/10 groups PASS: exact cash/flow oracle, A/B CRUD denial, anonymous/view denial, MYR/USD/EUR/JPY precision, recurrence, import dedup/atomicity, planning/actions and sensitive RPC/history guards. |
| staging-recovery-acceptance.json, 14:09 | Five checks PASS: actual inbox recovery/PKCE, server weak-password rejection, prior-session revocation, old-password/consumed-action denial and new-password sign-in. |

These redacted receipts remain in local artifacts/public-launch; see the
[hosted backend record](public-launch-hosted-backend-acceptance.md) for source
guards, exact requests and preserved failures/retests. All listed runs used
synthetic records without production access or privileged authorization keys.
The oracle remains flow **2140.00**, cash **2840.00/2200.00**, goal **60%**, debt
**900.00**. Finance API median **202 ms**, p95 **320 ms** is measured transport,
not physical-device or representative mobile-network acceptance.

## Unfinished mandatory acceptance

- **G06:** real CAPTCHA and configured Google are not accepted. Root created the
  separate free PRISM staging Turnstile widget at **14:16 UTC**, sole stable
  staging hostname, Managed/no clearance. The **14:19 UTC** receipt still reports
  private Supabase server configuration and genuine challenge testing incomplete.
  Google is not configured. Expired confirmation was blocked twice by actual
  HTTP 429 email quota; the temporary expiry setting was restored. Do not bypass
  quotas, replace real challenges with fixtures or claim production SMTP parity.
- **G08:** backend groups and route/read probes do not complete every hosted
  frontend write/read workflow, locale/theme/private-layout matrix, CSV
  export/formula protection, network failure/PWA/mobile performance requirement.
  Complete affected UI acceptance and refresh the actual final artifact.
- **G04/G12:** required server breach-password protection remains absent. The owner
  explicitly retained that requirement and kept release BLOCKED; no client-only
  substitute, paid purchase or inferred risk waiver is accepted.
- **G09–G11:** physical devices/AT/Malay, operator/contact/retention and current
  recovery acceptance remain unprovided. The October 13 encrypted bundle proves
  historical integrity, not current frequency, custody, permission or recovery point.

The owner will use **one** [consolidated acceptance form](public-launch-owner-acceptance.md).
Private provider setup is isolated in the [provider handoff](public-launch-provider-handoff.md).
Preserve Ismail/Malaysia and the intentional omission of public postal address/email.
Never publish credentials or recovery-storage links. No human result is inferred
from automated scans, general permission to continue or this handoff.

## Next safe action and release boundary

Finish reviewed candidate edits and final-head CI, rebuild the protected staging
artifact, recheck source/backend/env/redirect binding and rerun affected hosted
acceptance. Continue independent staging/local work while provider/human gates
remain blocked; preserve earlier failed receipts. Latest owner scope prohibits
new production access or modification. Keep the dated production freeze receipt
as historical evidence (**14 October 2026, 09:47 UTC**, see the playbook), and do
not merge/build/promote production until every
mandatory gate genuinely PASS and current owner/provider controls allow it.
