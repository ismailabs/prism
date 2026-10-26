# Conditional release and recovery playbook

Updated 2026-10-14 14:30:46 UTC. **NO-GO.** Hosted staging is now available, but the
owner retained the mandatory breach-password protection requirement and has not
performed human/operator acceptance. Recovery targets/custody/current point and
remaining Auth/product acceptance are unresolved. All mandatory G01–G13 must
genuinely PASS; staging success alone never authorizes production operations.

**Current owner restriction:** continue in staging/local only; do not access or
modify PRISM production. The future sequence below is not executable while that
restriction remains. A genuine resume must satisfy both current owner scope and
actual provider controls, without repeated routine approval or invented attestations.

## Dated production and current staging references

The last production receipt used here is **14 October 2026, 09:47 UTC**:
**ismailstudio/prism**, project **prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr**, team
**team_y1FMLs1LWgVb2dOvegEGYVkf**; canonical https://prism.ismailstudio.my/;
deployment **dpl_7ybY6ao53z2BG6yhhyrDpKX7CGNk**, source
**d1438197a33d179cedd6c54bad3bfcf9a06db31f**, production Supabase
**hyhsppiitijkuvpyswce**. Automatic custom-domain assignment was false, previews
disabled and hooks empty. This mission's prior reversible release-control change
was automatic custom-domain assignment true → false; the served alias did not change.
Existing 09:20 public Auth metadata reported signup enabled/confirmation required.
No production Auth/schema/customer-data change was made. No fresh production check
is implied under the current restriction.

Isolated staging uses **zwqcdfzfsudqccclficx**, separate Vercel project
**prj_nrfjV3bBN8WnVcGINUUZlLL4HuYe** and
https://prism-staging-acceptance-ismailstudio.vercel.app/.
Tested artifact **dpl_EAGPrj4fQ7zknLtTb58GdxsiePd8** is pinned to
**5e9d034cdd6bf516fc7bf335cf4fcbca7efae784**; final edits/CI/artifact refresh remain
pending. Eighteen migrations, 10/10 hosted finance, 4/4 security, 37 public-browser,
17 signed-in UI and five real inbox recovery checks have receipts. G06/G08 are
still incomplete; see [scope and limits](public-launch-staging-and-human-acceptance.md).

## Future release sequence — only after genuine GO and permitted scope

1. Freeze the final immutable PR #6/successor SHA. Review the diff/ancestry,
   current GitHub rules/reviews, complete exact-head CI and artifact integrity.
   Require every G01–G13 to be evidence-backed PASS, including required security,
   actual human/operator records and accepted recovery capability.
2. When current owner scope permits production inspection, verify the exact
   project/team/domain/deployment/Supabase identity, pending builds/hooks, env scopes,
   Auth redirects and release controls. Confirm no integration replays migrations.
   Production SQL, RLS/grants, customer-row reads/exports and database restoration
   remain unauthorized under this mission; do not infer permission from GO.
3. Keep automatic Git deployments disabled in vercel.json and automatic custom-domain
   assignment disabled. Use one deliberate manual production release route.
   Do not point the canonical domain at staging or copy staging credentials into production.
4. Merge the reviewed candidate through permitted GitHub controls without force-push
   or direct main push. Independently verify resulting main SHA and release CI.
   A code/config change requires affected acceptance refresh before continuing.
5. Recheck supported CLI/provider commands and explicit project context. After
   all gates and current permissions allow it, stage the production build without
   assigning domains (the previously reviewed route is
   `vercel deploy --prod --skip-domain`). Inspect trusted source/deployment identity and effective
   production configuration; test that actual protected artifact before promotion.
   Preview promotion may rebuild with different env values and is not same-artifact proof.
6. Deliberately promote the validated production artifact through allowed controls.
   Verify canonical DNS/TLS/headers/public routes and trusted deployed SHA.
   Perform only the minimal authorized self-created synthetic production smoke;
   never use existing customers. Record L01–L03, including sign-out/cache and denials.
7. Record an actual bounded observation window (proposed 30–60 minutes, final duration
   recorded when performed), aggregate health/errors and remaining incident capacity.
   Complete L04 and the operator handoff. Do not promise background monitoring
   beyond the available execution capability. Only full pre/post-release PASS
   permits **PUBLICLY LAUNCHED**.

## Recovery and rollback readiness

The current engineering changes are scoped frontend state/privacy wording, test
harnesses and release controls. Baseline financial domain, migrations, Auth/client
and private-cache safeguards are preserved; final diff compatibility still needs review.
A deployment rollback does not undo accepted financial writes or recover database/Auth state.

The supplied encrypted bundle has **40 matching manifest hashes** and a valid
signature using its declared bundled public key. Its database point is
**13 October 2026, 02:11:48 UTC**, Auth delta **06:41:50 UTC**, with known later
configuration drift. No customer payload was decrypted/restored in this mission.
An October 13 bundle is not evidence of today's accepted recovery point.
Current backup frequency, independent custody, recovery permission and configuration
correspondence remain UNKNOWN. Historical rehearsal success and local synthetic
restore tests do not close those current owner/operator obligations.

**Provisional, NOT APPROVED:** compatible application rollback 30 minutes;
database RPO 24 hours; full recovery RTO 24 hours. Verify integrity, frequency,
custody, access/permission and feasible coverage before owner acceptance. No new
customer-data export/decryption or production restore is authorized. Use the
[owner acceptance form](public-launch-owner-acceptance.md) for non-secret evidence.

After a future authorized release, if a severe application/Auth/finance/isolation
defect is confirmed, stop rollout. Subject to current authority/provider permission,
recheck that **dpl_7ybY6ao53z2BG6yhhyrDpKX7CGNk** still exists and is compatible,
then use the approved provider-native **deployment-only** rollback. Its historical
hostname is prism-livb0o3zb-ismailstudio.vercel.app. Verify the canonical restored
SHA and permitted safe smoke/health. Never erase financial rows, restore the customer
database, reverse migrations or weaken MFA/CAPTCHA/password protection to match old code.
If compatibility or permission is uncertain, preserve the current state and surface
the exact operator action; no rollback has occurred during this mission.

Restoring automatic domain assignment requires intentional reviewed release scope
after GO. Do not restore it merely to obtain a build or automatic deployment.

References: [Git deployment controls](https://vercel.com/docs/project-configuration/git-configuration),
[same-artifact promotion](https://vercel.com/docs/deployments/promoting-a-deployment),
[instant rollback](https://vercel.com/docs/instant-rollback).
