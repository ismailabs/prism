# Security and authorization decisions

This record is technical evidence and grants no new legal, human or spending authority.

## Release freeze: Vercel production domain assignment

Verified target: `ismailstudio/prism`, team `team_y1FMLs1LWgVb2dOvegEGYVkf`, project
`prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr`. The authenticated CLI independently matched
the project to GitHub repository ID `1392802844`, production branch `main`, zero
deploy hooks, disabled automatic previews and `autoAssignCustomDomains: true`.
Current production is `dpl_7ybY6ao53z2BG6yhhyrDpKX7CGNk` at
`d1438197a33d179cedd6c54bad3bfcf9a06db31f`.

Intended narrow change: set `autoAssignCustomDomains` to `false` to stop future
production builds from automatically replacing the current custom-domain release.
This changes a reversible release setting and does not alter existing deployment
aliases, Auth, schema or customer data. The mission expressly permits necessary,
checked, reversible, non-destructive release controls. Provider action remains
subject to actual connector permission. Status: **APPLIED AND INDEPENDENTLY VERIFIED**
at `2026-10-14T04:03:51Z`: `autoAssignCustomDomains: false`; production deployment
and SHA remain exactly as recorded above. The Git-controlled candidate additionally
sets `git.deploymentEnabled: false`, covering `main` and development branches.

After applying, independently re-read the project setting and canonical deployment;
confirm the current alias/SHA and public HTTPS remain stable. If the action affects
the live alias unexpectedly, restore the previous `true` value through the same
approved narrow project update and reverify. Restoring automatic assignment later
is permitted only after G01-G13 PASS and an intentional tested-artifact promotion;
do not restore it merely to make an unsafe merge publish.

References: [Vercel project update API](https://vercel.com/docs/rest-api/projects/update-an-existing-project),
[Git deployment configuration](https://vercel.com/docs/project-configuration/git-configuration),
[promotion](https://vercel.com/docs/deployments/promoting-a-deployment).

## Open provider and external gates

- Supabase organization `zwgtqvqlmcwbjssyoysv` is on Free; both connected projects
  are occupied by production PRISM and unrelated Hearthline. No PRISM development
  branch exists. Do not change, pause or reuse Hearthline to obtain test capacity.
- Leaked-password protection is currently disabled in the security advisor and
  [requires Pro or above](https://supabase.com/docs/guides/auth/password-security).
  No paid upgrade, fabricated pass or client-only substitute is authorized.
- A transaction-enforced read-only metadata review confirms the private
  `prism_private.report_reservations` table has RLS and no policies, with no anon or
  authenticated read/write grants. It implements client denial; no policy change
  is justified. All 25 public base tables have RLS, all 19 views have invoker security,
  and all 25 session/MFA policies are restrictive. Client roles have no superuser,
  bypass-RLS, login, create-role or inherited membership path. Raw catalog output
  remains ignored/local; the public summary contains only relevant safe controls.
- Historical approval to continue engineering supplies no actual physical-device,
  screen-reader, Malay reviewer or named operations/legal sign-off. Those gates
  remain open. Existing private contact/publication preferences are preserved.
- No production SQL writes, real-customer financial rows, Auth user lists or encrypted
  financial recovery payloads are used. Hosted finance acceptance needs an isolated
  staging target before any synthetic provider writes.

## Fresh public configuration discrepancy

The live public Auth settings report `disable_signup: false`, email confirmation
required and email/Google enabled, observed on 14 October. Older acceptance notes
said signup was disabled. This mission did not enable signup or change Supabase
Auth configuration, and does not treat an enabled setting as working registration,
inbox receipt or finance acceptance. Keep this distinction in the final report;
verify the full current controls in isolated staging. No production synthetic
account, password, CAPTCHA or financial write was attempted before GO.

## Dependency disposition

Fresh full audit still finds five high development-chain packages, all inheriting
`GHSA-vfj7-8cjw-p6xm` (braces <= 3.0.3); the runtime-only audit reports zero findings.
The [current advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no patch.
Reviewed fixed repository globs, no customer-controlled build patterns, no deployed
watcher, secrets-free fixture CI and its 45-minute limit constrain the known path.
This is an unresolved build-tool risk with technical disposition; it is not a clean
full audit, human waiver or identified deployed customer-input exploit. Recheck
before release and expire the disposition immediately if those inputs change.
No dependency or lockfile change, forced major upgrade or paid review was used.
