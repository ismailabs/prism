# PRISM public-launch decision

**LAUNCH BLOCKED.** The authorized code repairs, local/native regression, branch
publication, both engineering-head full CI runs and artifact review are complete.
Production serves the previous main build; PR #6 is open and unmerged. This report
pins engineering commit `db5a208571c4aa10bb082cfdde79bc14231ee9bb`. Later documentation
head verification is recorded in the current PR description and local final receipt;
release always requires independently matching the latest immutable head and checks.

## Identities and evidence

- Candidate: [PR #6](https://github.com/ismailabs/prism/pull/6), branch `codex/public-launch-20261014`,
  based on independently verified PR #5 `345d26caa904c088c76f5c40c4435f6509260ffc`.
- Main/live SHA: `d1438197a33d179cedd6c54bad3bfcf9a06db31f`; Vercel deployment
  `dpl_7ybY6ao53z2BG6yhhyrDpKX7CGNk`; https://prism.ismailstudio.my/.
- CI: [push](https://github.com/ismailabs/prism/actions/runs/38512935091),
  [PR](https://github.com/ismailabs/prism/actions/runs/38513067418); both 45/45 steps
  successful on the engineering head, with 261 browser, 166 unit, 14 Auth, 5 PWA
  and 481 responsive checks. No skipped or failed step is counted as PASS.
- Artifact 11870209466: SHA256 `1af961709cfe690e8eebc53bf885127f1a26581185019c45670cd4c8d8c7fbf0`,
  independently downloaded/verified; 224 members, 37 logs, 64 zero-violation route
  axe reports. PR checkout `4aaff1180ef58c3d89923381f930b9ba0133ba30` and candidate
  share tree `067321e168592a85f5fcf250e5c769535cd6f9a2`.

## Gate matrix

| Gate | State | Evidence or exact remaining requirement |
| --- | --- | --- |
| G01 | PASS | Independent refs/ancestry, reviewed diff, open PR; main unprotected/rulesets empty, no required reviewer found |
| G02 | PASS | Independently checked Vercel automatic domain assignment false; Git deployments disabled; baseline still served |
| G03 | PASS | Both complete engineering-head CI runs and downloaded matching-tree artifact; latest documentation head must also pass |
| G04 | BLOCKED | Runtime audit zero and secret scans pass; hosted password control/current Auth acceptance unresolved |
| G05 | BLOCKED | No connected isolated staging; Free organization has two active production projects and no PRISM branch |
| G06 | BLOCKED | Actual isolated registration/inbox/recovery/MFA/OAuth/CAPTCHA success and denial receipts required |
| G07 | BLOCKED | Native denials/read-only hosted catalog pass; actual hosted staging A/B ownership acceptance missing |
| G08 | BLOCKED | Local/full fixture routes and language/theme/a11y pass; exact hosted candidate write/read/mobile-network acceptance missing |
| G09 | BLOCKED | Actual named physical Windows/Android/iOS, screen-reader and Malay review observations absent |
| G10 | BLOCKED | Actual named/dated operator/privacy/contact/operations and required provider public-use acceptance incomplete |
| G11 | BLOCKED | Correct live SHA/rollback identified; current independent recovery/RPO/RTO and automation acceptance incomplete |
| G12 | BLOCKED | Existing signup setting enabled; required control and safe public-flow acceptance unresolved under current plan |
| G13 | BLOCKED | Mandatory pre-release gates are not all PASS; conditional merge/release is unauthorized |
| L01 | BLOCKED | Previous HTTPS build verified; candidate was not released |
| L02 | BLOCKED | Production synthetic signup/confirmation/finance smoke reserved until GO |
| L03 | BLOCKED | Candidate production security/privacy smoke reserved until GO |
| L04 | BLOCKED | No post-launch observation window or launch claim; operations/recovery acceptance missing |

## Changes, test boundaries and security

Setup accurately reports skipped categories; partial retries preserve successful
writes without duplicates. Transaction search belongs to its current URL visit,
so clear/navigation/Back/Forward retain correct context. Seven new regressions pass;
the source-preserving financial/domain/Auth/cache/migration/dependency boundaries
remain. All 19 phase3 browser cases, 27 local core/database/native/recovery commands
and the separate precision-repair check pass. Failed product probes and corrected
harness selectors remain in the audit; assertions/deadlines were preserved.

The 2005-row report uses exactly three bounded owner/date pages and retains exact
20.05. Local render sample was 2276 ms; CI sample 1219 ms. These are synthetic local
measurements, not hosted/mobile field results. Automated axe is not human acceptance.

Transaction-enforced read-only production metadata shows 25 RLS tables, 19 invoker
views, 25 restrictive session/MFA policies, no privileged client membership and
private reservation client denial. Nineteen historical/upgrade receipts are retained
without replay/renumbering. No production SQL write, customer/Auth-row read, financial
export, service-role bypass, migration, policy/grant change or synthetic write occurred.
Raw provider/catalog snapshots and all real configuration values remain unpublished.

Five inherited high build-tool packages share the unpatched braces advisory; runtime
audit is zero. Fixed trusted globs, no customer patterns or deployed watcher and
bounded secrets-free CI constrain the known path. This is a documented technical
disposition, not a patched/clean full audit or invented human waiver. Six FK and
fifteen unused-index INFO notices do not justify production DDL.

## Correct production state and recovery

The live app was not replaced. The only production setting change was the necessary
reversible Vercel release freeze: automatic custom-domain assignment true to false,
independently checked against the unchanged baseline alias/SHA. Supabase public
settings already report signup enabled, email confirmation required and email/Google
enabled; this differs from older notes. Enabled metadata does not prove signup,
recipient delivery or financial acceptance. No Supabase Auth setting was changed.

No purchase or upgrade was made. Supabase is Free; Vercel is active Hobby; GitHub's
public standard Ubuntu workflow is free. Actual intended public/commercial use and
quota/incident responsibility still require operator acceptance.

The [recovery playbook](public-launch-deployment-playbook.md) retains the verified
served build as the schema-compatible deploy-level rollback candidate. No rollback
was needed/executed. Do not weaken Auth or touch customer data for rollback. Local
synthetic restore does not certify current independent production recovery custody.

## Exact continuation

1. Connect a separate permitted zero-cost hosted Supabase test environment and
   scope Preview client/server settings, redirects, CAPTCHA and synthetic recipients
   to it. Do not reuse PRISM production, Hearthline or customer recovery data.
2. Resolve the supported server password-protection requirement on the actual plan.
   The provider's leaked-password control requires Pro or above; no upgrade or
   client-only substitute is authorized by this mission.
3. Complete the [real hosted/human/operator record](public-launch-staging-and-human-acceptance.md),
   including recipient delivery, A/B isolation, actual device/AT/language review,
   published notice approval, monitored contacts, incident/quota ownership and
   independently retained recovery/RPO/RTO acceptance. Preserve the owner's existing
   choice to omit postal address/email; do not request them again or invent them.
4. Resume M4/M5 from current PR #6, independently recheck head/main/CI/providers,
   and release only when every G01-G13 gate PASS. Use one staged production artifact
   and deliberate promotion, followed by actual minimal L01-L04 acceptance. Until
   then keep Production stable and the release freeze in place.
