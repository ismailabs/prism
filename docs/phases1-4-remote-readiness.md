# Remote CI and staging prerequisites

10 October 2026. This checklist documents local readiness and future authorization requirements. It does not authorize publication, a hosted configuration change, deployment, migration or Phase 5 implementation.

## Local review completed

- The exact 86-file accepted patch was rehashed and compared with the complete working-tree and staged diff before the implementation commit. Every manifest/evidence hash matched; all 105 original audited source files and original phase branches/worktrees were preserved.
- The implementation commit `78505b5bacc17a1b41c7b96c56e33c2d964e2a89` has parent `72da622305754328f02ec8f5d2ca8b71a221ee17`. Its complete binary diff has the accepted patch SHA-256 `290E59A0AAF41C940712333C20C434D50473854EB2F69E10F136449895EAA457`.
- Checkout, Node setup and artifact actions are pinned to the exact public v4 tag commits resolved during this review; checkout does not persist credentials. Workflow permissions are only `contents: read`; the job has a 45-minute timeout.
- Every financial/unit/browser/build gate retains its failure status through explicit Bash `pipefail` and `tee`. A local process exiting 7 remained exit 7; a successful probe remained exit 0. Hosted browser opt-in/storage-state variables are rejected before fixture tests run.
- `if: always()` uploads an explicit allowlist of synthetic gate logs, reconciliation/oracle JSON, screenshots and Playwright failure output for seven days. It excludes hidden files, environment files, database clusters, caches and authentication-state exports. No failure is converted to success, skipped or retried away. The upload action behavior is documented by [GitHub](https://github.com/actions/upload-artifact/tree/ea165f8d65b6e75b540449e92b4886f43607fa02).
- Actionlint 1.7.12 validates the workflow. The full job and GitHub artifact upload have not run remotely. Cancellation/runner loss may prevent even an always-running artifact step; existing console output remains separate evidence.
- The source dry run exposed an excluded frontend JSON import. Local `.vercelignore` now admits only `supabase/tests/ledger-history.synthetic.json` from that tree and excludes SQL, other test fixtures, audit documents/scripts, browser output, generated builds and caches. No financial code or fixture bytes changed. The actual Vercel CLI 59.23.2 manifest validates these exclusions, and the manifest-only isolated source build passes. [Vercel documents that this dry run neither uploads code nor creates a deployment](https://vercel.com/changelog/dry-run-deployments-with-vercel-cli).

## Before any branch publication or remote CI

- [ ] Obtain explicit authorization to push the exact reviewed local HEAD and, separately, open a PR. Do not push `main`, force-push, or rewrite the original phase checkpoints.
- [ ] Reinspect the live Vercel target and Git settings. The read-only API result resolves project `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr` in team `team_y1FMLs1LWgVb2dOvegEGYVkf`, now named `prism`; older local metadata says `prism-finance-app`. It links to `ismailabs/prism-finance-tracker`.
- [ ] Resolve the automatic deployment boundary before pushing: `gitProviderOptions.createDeployments = enabled`, production branch `main`, `autoAssignCustomDomains = true`, ignored build command `null`, and `deploymentChecks = null` in the inspected project API. Preview protection is `all_except_custom_domains`. No setting was changed. These fields do not prove other organization/deployment policies are absent. [Vercel deploys Git pushes by default](https://vercel.com/docs/git/vercel-for-github); a CI-only push must not silently authorize a preview.
- [ ] Choose and authorize deployment suppression/isolation or an explicitly approved preview. A deployment check gates production assignment; it does not by itself suppress preview builds. Inspect required GitHub checks/branch rules and any provider deployment policies before release. [Deployment checks documentation](https://vercel.com/docs/deployment-checks).
- [ ] Confirm GitHub Actions is enabled for the repository, the pinned action commits are allowed, artifact retention is permitted and the Ubuntu runner can reach npm and the official PostgREST release. No production provider secrets or protected-environment credentials are needed for this local fixture workflow.
- [ ] Run all gates on the exact pushed SHA with Ubuntu/Chromium, including native PostgreSQL, HTTP and actual lock/concurrency tests. Local Windows/Edge proof is retained, but does not prove the Linux runner or remote artifact upload. Check the `Financial integrity / verify` result and download/review failure evidence; do not accept partial green steps.
- [ ] Independently verify advertised remote HEAD and PR diff against the committed inventory. A PR against the currently observed remote `main` also includes the four accepted Phase 1 commits; the Phase 2–4 checkpoint commits are content provenance, not merge ancestors.

## Before hosted staging or migration

- [ ] Obtain explicit authorization for the exact isolated Supabase/Vercel staging targets and costs. Use synthetic test accounts/records; do not copy production data or reuse a production write target.
- [ ] Verify provider identity, PostgreSQL version, Auth/MFA/OAuth, RLS/default grants, security-definer owners/search paths, Realtime and migration receipts against the complete ordered local chain. Current Supabase hosted state was not queried in this checkpoint review.
- [ ] Resolve inherited version differences using actual SQL/catalogue evidence: local self-delete `20260928082016` versus documented hosted `20260928082111`, and local analytics `20261001033902` versus documented hosted `20261001035741`. Never replay/reset/renumber baseline history for cosmetic parity.
- [ ] Identify missing migrations individually: `20261009162324_protect_debt_repayment_history.sql`, `20261009220402_shadow_double_entry_ledger.sql`, `20261010021500_malaysia_profile_defaults.sql`, then `20261010024257_phase4_planning.sql`, in dependency order. Confirm already-applied bodies before skipping anything. Preserve existing profile preferences, legacy financial rows and balances.
- [ ] Verify managed PostgreSQL 17 behavior, authenticated deep links and session/MFA truth tables, actual HTTP exact-string money, microsecond cutoffs, retry/concurrency, budget/report reconciliation, onboarding and bilingual layouts on the staged application.
- [ ] Establish an approved recovery procedure and test backup/PITR/operator recovery on the isolated target. The local injected transactional rollback probes prove neither hosted restoration nor recovery after live immutable ledger writes.
- [ ] Keep shadow accounting separate from authoritative legacy reporting; no live cutover, dual writes, guessed historical principal/interest split, unattended posting or FX conversion is authorized by this baseline.
- [ ] Use a separate secret-bearing hosted verification workflow if needed. Never publish real-session traces or saved authentication state through this fixture artifact allowlist.

## Limits and decision

Eight inherited development/build advisories remain: six high and two moderate in the Tailwind/build tree (braces/chokidar/fast-glob/micromatch, PostCSS nested/selector parsing, source-map-js and Tailwind). Runtime audit: zero. Versions and lockfile are unchanged; several npm suggestions require a Tailwind major upgrade. These are disclosed tooling risks, not a claim of dependency-security certification or approval to process hostile source trees.

GO for the committed baseline as the starting point for separately authorized local Phase 5 work. No known financial/security P0/P1 application defects or unmet achievable local functional criteria remain. Remote-CI result and hosted/release acceptance are still unverified/NO-GO until the appropriate checklist and authorization are satisfied. No Phase 5 work was begun.
