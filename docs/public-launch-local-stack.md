# Isolated local Supabase acceptance

Hosted staging remains **BLOCKED**. The authenticated Supabase new-project page
for the existing Free organization explicitly reports that its administrator/owner
has reached the limit of **two active free projects**. It requires pausing, deleting
or upgrading an existing project before another free project can be created. Both
connected projects are production resources and remain untouched. The advertised
MCP cost-discovery tool also returns `MCP tool get_cost was not returned by tools/list`.
No paid provision, quota workaround or project pause/delete is authorized or performed.

The Windows machine has Supabase CLI 2.117.0 but no Docker/Podman runtime or installed
WSL. An actual `supabase start` in a fresh ignored local directory failed with
`LegacyDockerLifecycleInspectError` and `docker: command not found (podman also not found)`.
[Supabase's native runtime](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes)
does not support Windows. Existing native PostgreSQL/PostgREST tests remain real
synthetic database/HTTP evidence; they do not constitute a full local Auth service.

The added `local-supabase` CI job runs actual local Supabase services on a disposable
standard Linux runner. It installs official CLI 2.117.0 with independently retrieved
release digest `69c05f85b9e47ee706d30f1a6ca8a526b4e337bfd12c7ef1ef522d24e7280d24`,
creates a separate Docker network, checks that every published port binds only to
loopback, and replays the eighteen source migrations into its fresh PostgreSQL 17.
It copies no customer seed, production snapshot or mock Auth schema. Lifecycle
commands refuse a different local project or any hosted project link.

The acceptance script uses only a local anon/publishable client key. Synthetic
identities register through real local GoTrue; no admin-created-user shortcut or
service-role access is used. It tests server password denial, required confirmation,
local SMTP capture, reused and actually expired actions, normal/wrong sign-in,
PKCE code exchange and redirect fallback, real A/B ownership and invoker views,
exact decimal transport/precision rejection, TOTP challenge/AAL restrictions,
recovery/password change and prior-session/global sign-out denial.

The first actual local-stack run on candidate `0989ddb5` started five real services
with three loopback-only published ports. Seven acceptance groups passed, including
real signup/confirmation, A/B ownership, exact money, TOTP/AAL and recovery revocation.
It failed at PKCE because the harness expected HTTP 302 while pinned GoTrue returned
HTTP 303 See Other. The correction retains the strict status, callback origin, code
exchange and resulting identity/session assertions. The original failed receipt is
preserved in [the CI run](https://github.com/ismailabs/prism/actions/runs/38536631129).

Status is **PENDING actual exact-head retest** until that job and the existing complete
verification job finish successfully. Read the current PR #6 head/checks and its
redacted receipt; source and prepared commands alone are never a test result.
All failures must remain recorded and affected acceptance must be repeated after
a repair. Tokens, passwords, TOTP secrets, Auth messages, storage state, raw CLI
output, keys and database directories are excluded from the artifact allowlist.
Only schema hashes, runtime/binding metadata and redacted acceptance results may
appear in required logs and the optional one-day artifact.

Even a successful local job cannot satisfy hosted signup, real recipient delivery,
Google OAuth, Turnstile, mobile-network, physical-device/AT, operator/privacy or
current recovery acceptance. Local stronger password settings do not change or
certify production settings or resolve the hosted leaked-password warning. Keep
G04-G13 and L01-L04 **BLOCKED** until their genuine external receipts exist.

The existing recovery bundle's forty manifest hashes match and its detached
signature verifies against its declared public key. No payload was decrypted or
restored. Its database point is dated October 13 02:11 UTC and its Auth snapshot
October 13 06:41 UTC; the latter disables signup while current public metadata
reports signup enabled. Current independent private-key custody, accepted RPO/RTO
and snapshot/configuration reconciliation remain unverified. G11 remains **BLOCKED**;
bundle integrity cannot authorize restoring customer data or old Auth settings.
