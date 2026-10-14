# Conditional release and recovery playbook

Status: **NO-GO**. Production is preserved at `d1438197a33d179cedd6c54bad3bfcf9a06db31f`,
deployment `dpl_7ybY6ao53z2BG6yhhyrDpKX7CGNk`, canonical https://prism.ismailstudio.my/.
This mission changed only Vercel's necessary reversible release setting:
`autoAssignCustomDomains: true` to `false`. The checked live alias/SHA did not change.
No Supabase Auth/schema/customer-data change was made. Public Auth metadata currently
reports signup enabled; registration/confirmation/finance acceptance is unverified.

## Preconditions and publication strategy

1. Reverify the immutable current candidate, main, reviews/rules and exact-head CI.
   Check every G01-G13 result and evidence; only PASS authorizes release. Revalidate
   provider permissions, cost, scoped Auth/security settings and recovery custody.
2. Verify Vercel `ismailstudio/prism`, team `team_y1FMLs1LWgVb2dOvegEGYVkf`, project
   `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr`, canonical domain and production Supabase
   `hyhsppiitijkuvpyswce`. Check current deployment and any pending builds/hooks.
   Confirm no Supabase integration can replay migrations when main is merged;
   production SQL/schema/grant operations remain outside this mission's authority.
3. The candidate disables automatic Git deployments for all branches in
   `vercel.json`; the provider separately disables automatic custom-domain assignment.
   Use one deliberate manual release route. Do not remove these safeguards to
   obtain a premature build or merge. They preserve the served baseline today.
4. After all gates PASS, merge the reviewed development candidate using permitted
   GitHub controls. Reverify the resulting main SHA and its complete CI before
   building production. Do not push main directly, force-push or trigger a duplicate
   Git/CLI release. A new engineering change invalidates its relevant acceptance.
5. Verify CLI/project context explicitly and read current command help. Stage a
   production build with domains unassigned (`vercel deploy --prod --skip-domain`),
   inspect trusted deployment/source identity and protected access controls, test
   that actual production artifact safely, then deliberately promote that same
   artifact. A preview promotion can rebuild with different environment values;
   it is not proof that the same tested artifact was released. Keep secrets masked
   and never publish pulled environment files or protection credentials.
6. Reverify the canonical HTTPS deployment/SHA and complete the minimal permitted
   self-created production synthetic smoke, all L01-L04 and an actual bounded
   observation window. No present receipt claims these steps occurred. Record the
   exact chosen observation duration/start/end, aggregate errors and recovery state.

## Compatibility and recovery

The candidate preserves the baseline financial domain, migrations, Auth hooks,
Supabase client and private-cache security source. Its repairs are frontend state
and release controls. The previous served build remains the candidate for a
non-destructive deployment rollback; existing data/schema must remain untouched.
Fresh local restore is synthetic PostgreSQL 18 evidence and does not replace
current independently custodied production recovery or approved RPO/RTO.

If a serious post-release Auth/finance/isolation/availability defect is confirmed,
stop roll-forward. Verify the current baseline deployment still exists and is
compatible, then use the permitted provider-native deploy-level rollback to
`dpl_7ybY6ao53z2BG6yhhyrDpKX7CGNk` (deployment hostname
`prism-livb0o3zb-ismailstudio.vercel.app`). Independently recheck canonical SHA,
public routes and safe synthetic/private-cache behavior. Never execute financial
deletion, migration rollback or restore a customer database under this authority.

Restoring automatic assignment to its original `true` value requires a reviewed
release intention after GO. Do not weaken password, MFA or CAPTCHA controls to
make old code work. If compatibility, provider permission or recovery is uncertain,
keep production stable and report the exact operator action. No rollback was needed
or executed during this blocked mission.

References: [Git configuration](https://vercel.com/docs/project-configuration/git-configuration),
[promotion](https://vercel.com/docs/deployments/promoting-a-deployment),
[instant rollback](https://vercel.com/docs/instant-rollback).
