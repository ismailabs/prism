# Real hosted backend acceptance

Environment: isolated Supabase staging `zwqcdfzfsudqccclficx`, API
`https://zwqcdfzfsudqccclficx.supabase.co`. Backend source baseline and checkout:
`5e9d034cdd6bf516fc7bf335cf4fcbca7efae784` (PR #6). Root reports staging Auth
v2.197.0, PostgreSQL 17.11 and all 18 reviewed migrations applied. The harness
independently verifies the 18 canonical committed source hashes before requests.
These are staging results and cannot authorize production release.

Root's protected preview for that application source is
<https://prism-staging-hsq305blz-ismailstudio.vercel.app/>; its browser/artifact
acceptance and final candidate refresh are separate records. The root's pending
Settings deletion-notice copy repair does not change this SQL/domain/data-I/O
baseline. The harness declares its precise source guard scope in every receipt;
final UI and CI validation remain the root's responsibility.

## Identity, safety and provenance

Root created A and B through ordinary public GoTrue signup, observed actual
Gmail inbox confirmations and performed normal signin. This harness independently
restored their genuine sessions and verified each identity and confirmed-email
state against the hosted Auth server. It did not create admin-confirmed users,
use a service-role/secret key, write SQL, change provider configuration, send mail
or contact production. API keys, actor identities, passwords, tokens, TOTP
secrets and session state remain only in the already ignored private files.

The executable [hosted-supabase-acceptance.mjs](../scripts/hosted-supabase-acceptance.mjs)
requires the exact staging project/ref/key scope and guards **every** SDK request
against another origin or API surface. HTTP redirects are forbidden. Fixture
identities use a deterministic staging-specific namespace; temporary records are
removed by ordinary owning users using exact IDs. Existing oracle records are
reused rather than blindly reset. No privileged permission makes a denial pass.

## Observed results and retained failures

| Receipt / UTC window | Actual outcome |
|---|---|
| `artifacts/public-launch/hosted-backend-finance-1791985110622-49882d12.json`, 13:38:30–13:38:31 on 14 October 2026 | FAIL before any request: guard included the root's reviewed Settings privacy-copy edit. Guard scope was corrected to declare the tested backend boundary. The no-network failure receipt is retained. |
| `artifacts/public-launch/hosted-backend-finance-1791985210939-7b996e48.json`, 13:40:10–13:41:21 | 9/10 groups PASS; 321 real staging requests. Recurrence confirmation/retry succeeded, then the harness incorrectly filtered the older exact-money view by its later-added `recurrence_id` column, returning 42703. Original FAIL remains intact. |
| `artifacts/public-launch/hosted-backend-finance-recurrence.json`, 13:43:21–13:43:28 | Corrected affected group PASS, plus fresh safety/identity checks; 15 requests. It resolves the owned source transaction IDs, then asserts the same exact amount/date, one-row retry result and foreign-user denial. Marked explicitly as a partial retest. |
| `artifacts/public-launch/hosted-backend-security.json`, 13:44:21–13:44:29 | 4/4 groups PASS; 28 requests. Genuine hosted MFA, assurance restrictions, session refresh, revocation and restored own signin. |
| `artifacts/public-launch/hosted-backend-finance.json`, 14:01:42–14:02:51 | Final complete finance rerun **10/10 groups PASS**, using the corrected final harness; 299 requests. Existing tagged fixtures were reused, temporary records cleaned and the retained oracle reverified. Timestamped immutable copy: `hosted-backend-finance-1791986502577-9c28cd54.json`. |

The final complete finance and security runs pass **10/10** and **4/4** groups,
respectively, under harness SHA256
`287a12e25dc935b73d7fd7f8769578d65252a110beb72c8edf574a5539c3ae54`.
This does **not** relabel either earlier failure as PASS. Timestamped immutable
copies and hashes preserve the failed attempt, repair, affected retest and final
complete rerun. Across all attempts, **663** requests targeted isolated staging.
The final finance run's median transport latency was 202 ms and p95 320 ms;
these API observations are not physical-device or mobile-network acceptance.

Node syntax and explicit `no-undef` / `no-unused-vars` checks passed. Repository
lint ordinarily ignores `.mjs`; its ignored-file warning is not counted as a
lint pass. A private-value scan of the script, assigned documents and redacted
receipts found no actor email/password/identity/token, API key or private verifier
values. No Git commit/push or production action was performed by this workstream.

## Financial and permission evidence

The retained A fixture comes directly from `e2e/calm-precision.spec.ts`:

- Everyday opening 1000 + income 5200 − rent 2200 − groceries 860 − transfer
  200 − debt repayment 100 = **MYR 2840.00**.
- Reserve opening 2000 + transfer 200 = **MYR 2200.00**.
- Ordinary recorded flow is **MYR 2140.00**, independently of cash openings,
  transfers, earmarks and principal. Goal earmark 3000 / target 5000 = **60%**;
  debt 1000 − repayment 100 = **MYR 900.00**.
- Transaction dates are 10 October 2026, transfer/earmark 11 October and
  repayment 12 October. Use October 2026 for browser assertions. Retained names
  begin `PRISM hosted 20261014`; accounts end `Everyday account` / `Reserve account`,
  the goal ends `Emergency fund`, and the debt ends `Synthetic lender`.

Actual hosted checks also passed:

- A cannot read, insert, update or delete six concrete B resources; B rechecks
  that each record is retained and denied inserts created no row. Owned-category
  reassignment to B is rejected. B's fixtures stay private and separate from A.
- Anonymous SELECT denial across 25 base tables and 19 invoker views; reciprocal
  owner-filter denial across all 44 surfaces. Six B resources have real rows;
  empty shadow surfaces additionally depend on reviewed catalog/native evidence.
- Huge MYR/USD/EUR/JPY amounts remain exact decimal text, including amounts above
  JavaScript's safe-integer range. Eight account/transaction precision violations
  are rejected without silent rounding; supplementary rows were cleaned up.
- Recurrence remains unposted until explicit confirmation. Wrong-date and
  foreign-rule calls are denied; retries return the original ID with one posting.
- Import RPC accepts decimal strings, deduplicates same-batch retries and selected
  semantic duplicates, rejects JSON-number money, rolls back an invalid batch
  completely and denies a foreign account.
- Budgets, reserve/debt/goal plans, private searchable notes, reminders, DST
  gap/fold denials and notification receipt retries preserve the cash oracle.
- Private-schema API calls are denied; self-deletion without confirmation,
  anonymous sensitive RPCs and direct ledger writes are denied. Repayment rewriting,
  debt-history erasure and deletion of an account with source activity are denied.
  Owned pagination and daily analytics retain exact source values and isolation.
- Actual TOTP enrollment verifies a real code, rejects wrong codes and B's foreign
  factor challenge, denies stale AAL1 reads/writes and permits AAL2 own cash.
  Unenrollment and refresh succeeded. Real global signout denied reads, writes
  and refresh from the otherwise unexpired old session. A then signed in normally;
  its fresh private session was saved for the root browser workstream.

## Remaining boundaries and next action

This workstream does not supply Google OAuth, CAPTCHA, recovery-email/expiry
acceptance, browser CSV/formula export, every route, PWA/offline/mobile behavior,
physical devices, assistive technology, Malay review, operator signoff, current
recovery custody or final production smoke. Root owns those records. Password
breach protection remains unavailable under the approved cost boundary; the owner
has retained the requirement, and release remains **BLOCKED**.

Run only within the authorized staging mission:

```text
node scripts/hosted-supabase-acceptance.mjs
node scripts/hosted-supabase-acceptance.mjs --only=recurrence
node scripts/hosted-supabase-acceptance.mjs --only=oracle
node scripts/hosted-supabase-acceptance.mjs --security
```

The security phase revokes A's sessions and briefly changes A's MFA state; coordinate
with the browser workstream first. It restores ordinary signin at the end and
keeps private updated sessions out of artifacts. B was released to the root for
recovery testing after this run. Do not run concurrent financial writes, resets,
recovery or revocation on these actors. A final candidate/configuration change
requires affected verification and fresh provenance before gate closure.

The root's subsequent review tightened the oracle to assert the exact 5000.00
target, 3000.00 earmark, 1000.00 principal and 100.00 repayment plus bigint
cross-multiplication, avoiding truncated percentage acceptance. The focused hosted
oracle retest passed both guard/oracle groups at 16:46 UTC with 23 actual requests.
Temporary cleanup now retains its identity until an owning-session absence recheck
succeeds, so a transient deletion failure remains retryable. These harness repairs
do not change financial/domain/Auth/migration source or constitute full release GO.

At 16:49 UTC the complete tightened finance harness passed **10/10 groups** with
**310 real guarded requests**, median157ms/p95280ms. Its new byte hash is
`dfcd614b20c371a35fe39ecb3306009cd01c78948eea2c16e35675630fdd4531`;
the [published receipt](public-launch/evidence/hosted-backend-finance.json) replaces
the latest alias above, while the earlier timestamped attempts retain their original
hashes and provenance. Transport samples are observed staging API latency, not a
physical mobile-network service commitment.
