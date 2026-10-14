# PRISM public launch continuation checkpoint

Updated 2026-10-14 16:49 UTC. Release decision: **LAUNCH BLOCKED / NO-GO**.
The existing isolated worktree and branch **codex/public-launch-20261014** are
retained. The missing hosted-staging dependency is cleared; full hosted/human/
security/recovery acceptance and final candidate refresh remain unfinished.
No production merge, build, promotion or public-launch claim is authorized.

## Candidate and retained provenance

- Repository: https://github.com/ismailabs/prism; candidate [PR #6](https://github.com/ismailabs/prism/pull/6).
- Current verified hosted/source checkpoint: **5e9d034cdd6bf516fc7bf335cf4fcbca7efae784**.
  Pending deletion-copy/harness/document changes require a new final SHA, exact-head
  CI, staging artifact refresh and affected retests; root owns that publication.
- The 5e9d034 runtime audit has zero findings; five inherited high development-chain
  findings retain their technical [security disposition](public-launch-security-decisions.md).
  That record is not a clean full audit or a human risk waiver; refresh affected
  audit/source evidence on the final candidate.
- Original PR #5: **345d26caa904c088c76f5c40c4435f6509260ffc**. Its worktree/source
  are preserved. Initial repair commit **db5a208571c4aa10bb082cfdde79bc14231ee9bb**
  and earlier CI receipts remain historical checkpoints.
- Complete 5e9d034 [push CI](https://github.com/ismailabs/prism/actions/runs/38537839156)
  and [PR CI](https://github.com/ismailabs/prism/actions/runs/38537844275) passed all
  four jobs: 166 units, 261 browser cases, 14 Auth fixtures, 5 PWA, 481 responsive
  checks, 64 zero-violation axe scans and ten real isolated local Supabase groups.
  Both downloaded artifact digests and canonical source hashes were verified.
  Local SMTP, viewport emulation and fixture results retain their original limits.
- Earlier engineering runs **38512935091/38513067418** passed 45-step verification.
  They do not replace later exact-head evidence. The committed
  [public-launch-evidence.json](public-launch-evidence.json) is an older checkpoint;
  use the refreshed final local ledger/current PR evidence for the final candidate.
- The full mission package/specs/checklists/templates and three historical sources
  were read before implementation. Historical source authority never overrides
  current customer-data, provider-permission, cost or production-access boundaries.

## Actual hosted progress

Separate Supabase **prism-staging / zwqcdfzfsudqccclficx** now serves synthetic-only
testing. Separate Vercel **prism-staging / prj_nrfjV3bBN8WnVcGINUUZlLL4HuYe** hosts
[the stable protected preview](https://prism-staging-acceptance-ismailstudio.vercel.app/).
The tested 5e9d034 artifact is **dpl_EAGPrj4fQ7zknLtTb58GdxsiePd8**.
At 13:22 UTC, anonymous access redirected (302), authorized access returned 200.
Actual asset/backend checks target staging; no service-role/foreign backend was used.

Eighteen reviewed source migrations have staging-specific provider receipt mappings
(12:50 UTC); original files and production history were preserved. Genuine ordinary
A/B signup, actual Gmail confirmation and sign-in established the synthetic actors.
Hosted finance **10/10**, security **4/4**, public browser **37**, signed-in UI **17**
and real inbox recovery **5** checks passed between 13:12 and 14:09 UTC.
Public/signed-in axe scans were **20/16** with zero violations. The final finance
oracle remains exact: cash **2840.00/2200.00**, ordinary flow **2140.00**, goal **60%**,
debt **900.00**. Retained failed harness/PKCE/attempt receipts and affected retests
are not erased or retrospectively relabelled.

See [hosted staging scope/limits](public-launch-staging-and-human-acceptance.md)
and [backend evidence](public-launch-hosted-backend-acceptance.md).
These groups do not complete every G06/G08 requirement or the final-head refresh.
API median/p95 **202/320 ms** does not prove representative mobile performance.

## Production and recovery boundary

**Historical production verification: 14 October 2026, 09:47 UTC**, from local
blocked-audit-production.json: deployment **dpl_7ybY6ao53z2BG6yhhyrDpKX7CGNk**,
SHA **d1438197a33d179cedd6c54bad3bfcf9a06db31f**, automatic custom-domain assignment
false, previews disabled, zero hooks. The candidate disables Git auto-deployments.
Existing 09:20 public metadata reported signup enabled with email confirmation;
this mission did not enable production signup. These are dated receipts, not a
fresh production inspection. **Latest owner scope prohibits new production access
or modification.** No customer rows, customer-data export/decryption or production
restoration is authorized.

Local recovery review verified **40** hashes and a signature by the declared bundled
key. Database point **13 October 02:11:48 UTC** and Auth delta **06:41:50 UTC** are
historical, with configuration drift. Frequency, independent current custody,
recovery permission and a current acceptable point remain UNKNOWN.
Provisional **30-minute app rollback / 24-hour RPO / 24-hour full recovery RTO**
remain **NOT APPROVED** until supported by actual process and evidence.

## Remaining critical path

| Area | State at this checkpoint | Next evidence |
| --- | --- | --- |
| Staging identity/schema/backend ownership | Established for 5e9d034 | Refresh final artifact/source binding and affected checks after publication |
| Hosted Auth/integrations G06 | BLOCKED | Expired confirmation after actual quota permits; private Turnstile server setup + genuine success/denials; Google setup/test; production SMTP parity remains unclaimed |
| Hosted product G08 | BLOCKED | Remaining frontend workflows, private EN/MS/themes/mobile, CSV/PWA/failure recovery and representative performance |
| Security G04/G12 | BLOCKED | Required breach-password protection; owner explicitly retained requirement, no waiver or paid change |
| Human/operator/recovery G09–G11 | BLOCKED | Actual owner/device/Malay/contact/retention and current custody/frequency/permission evidence |
| Final GO G13 and release/L01–L04 | BLOCKED | All mandatory gates PASS, final immutable SHA/CI/artifact and current permitted production scope |

At 14:16 UTC root created the free staging-only **PRISM staging** Turnstile widget:
one stable hostname, Managed/no clearance. The 14:19 receipt still lacks private
server configuration and real challenge acceptance; Google remains unconfigured.
Follow the [provider handoff](public-launch-provider-handoff.md) for genuine
private account actions and the single [owner form](public-launch-owner-acceptance.md)
for human evidence. No keys or real inbox links belong in replies/artifacts.

Next safe executable action: publish the reviewed candidate updates, run full
final-head CI, refresh protected staging and complete remaining independent hosted
work. Retain security/provider/human blockers accurately; do not repeatedly retry
a quota or invent approval. Root maintains the final authoritative gate register.
The [conditional playbook](public-launch-deployment-playbook.md) records future
release/rollback steps, executable only when gates and current scope permit.

## Subsequent engineering evidence

The safer share-session public runner passed 37 checks, 100 viewport widths and
20 zero-violation axe scans at 16:06 UTC. Focused real PWA tests passed public-only
cache, offline private-screen denial, browser restart and reconnect. Those tests
then found that mobile sign-out was hidden by the existing layout. This revision
adds the localized sign-out action to the mobile drawer using the existing Auth
handler. All 21 phase-3 cases passed, including two EN/MS logout/history/private-link
regressions. Complete final-artifact hosted workspace acceptance is still pending.

At 16:27 UTC C's normal signup and actual Gmail INBOX receipt succeeded after the
earlier quota denials. No session was issued or Auth policy changed. Its first-use
expired-link check must wait until after 17:28:44 UTC; do not predeclare it PASS.
Fresh Email settings show the unchanged 3600-second lifetime and Free-only breach
limitation. New staging project metadata also confirms Auth protection, no Git link,
no Production variables, automatic-domain assignment off and development self-trust
withdrawn. The [credential incident](public-launch-staging-credential-incident.md)
is disclosed and contained within preview admission, without a global revoke claim.

The committed [checkpoint](public-launch-final-report.md) and
[safe receipts](public-launch/evidence/) preserve actual results before publication.
The root's subsequent PR description and ignored final ledger carry the exact
published-head CI/deployment/test receipts, superseding this dated checkpoint.
