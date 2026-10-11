# PRISM autonomous readiness continuation

11 October 2026, Asia/Kuala_Lumpur. Governing mission: fully read `C:/Users/moham/OneDrive/Desktop/notes/prompt.md`, accepted starting HEAD `7bb1f35813328d95c355fa890a1e1f7f5173fc22`, existing `codex/phase7-readiness` worktree. Strict RM0; production deployment, main changes, PRs and hosted mutations remain prohibited.

## Evidence status

Final local verification is completed before this packet is committed; publication and CI receipts are completed before the final user report. The final user report and ignored `artifacts/autonomous-readiness/` receipts supply the exact final commit, remote SHA and CI run/artifact identifiers; this document does not attempt to contain its own commit hash.

## Actual engineering and review

The accepted worktree, index and release branch were clean and matched the required SHA. Both canonical `ismailabs/prism` and retained legacy origin advertise the same release/main commits. Canonical repository ID is 1392802844. Main remains `819ddef0e8a3b9aad07475ff495152e4d2ea9156`; all unrelated worktrees were inspected and preserved. No migration, financial-domain, Auth, product UI, RLS or ledger implementation is changed in this continuation.

1. **Deletion remediation correctness:** the prior inspection listed only direct role grants and the proposal checked only immediately effective EXECUTE. A synthetic two-hop membership demonstrates transitive exposure; INHERIT FALSE / SET TRUE membership demonstrates why an EXECUTE-only guard can report denial while SET ROLE remains possible. A further PG17 probe confirms that ADMIN-only membership can regrant inherited execution even with both current EXECUTE and SET denied. The revised catalog procedure includes recursive membership, effective USAGE/SET/ADMIN, relevant role attributes and both schema ACLs. A 32-role depth limit is explicitly flagged as incomplete evidence; timeout/lock limits and READ ONLY/ROLLBACK remain. The proposal aborts for inherited or SET-accessible execution, any application-role ADMIN authority and unexpected confirmed-text grants. The ADMIN guard deliberately requires separate least-privilege review of all client grant authority; it does not automatically revoke unrelated memberships. Proposal statements/locks are bounded. It changes no hosted state and is not an automatic production migration. PostgreSQL documents [role privilege distinctions](https://www.postgresql.org/docs/17/functions-info.html) and [ADMIN membership grants](https://www.postgresql.org/docs/17/sql-grant.html).
2. **Durable regressions:** `npm run test:deletion-security` replays the 17-file chain in an isolated PGlite database and tests inspection transaction mode, default denial, historical own-deletion bypass with rollback, idempotent revocation, unrelated function ACL/definition preservation, indirect/SET-only/ADMIN-only aborts, ADMIN regrant reproduction and rollback, unexpected-text privilege rollback, wrong/null confirmation, invalid sessions and confirmed own deletion/session cleanup preserving another owner. The same ten groups are rerun in a fresh disposable PostgreSQL 17.11 cluster. This proves local procedure behavior; it does not establish hosted RPC reachability. The committed gate now runs locally and in GitHub CI, with synthetic evidence retained.
3. **Dependency repair:** an exact parser 7.1.6 override resolves both moderate findings without a Tailwind migration. The lock changes only that parser package. Clean install and before/after production CSS parity support compatibility; browser/package/PWA/responsive regression supplies behavioral evidence. Five high build findings remain from the unpatched braces chain, zero runtime findings. [Full disposition](dependency-disposition.md) includes each original package/chain, exploit conditions, unsuccessful bounded reproduction samples and the major-migration trade-off. No waiver or force upgrade.
4. **Evidence integrity:** the acceptance runner now fingerprints SQL proposals under docs because the new security gate consumes them. Final validation binds 254 engineering/SQL inputs instead of excluding every documentation file. Git-blob comparison binds those bytes to the committed candidate. Whole-candidate and history secret scans, reviewed file inventory and source-matched evidence reuse support publication.
5. **Launch handoff:** corrected the security-model document to distinguish the local deletion contract from unresolved hosted permissions. Added [bilingual privacy/financial-disclaimer drafts, support/incident procedures, post-recovery erasure, monitoring/RPO/RTO/rollback requirements and human acceptance forms](privacy-and-operations-draft.md). Every missing owner/legal/provider fact remains UNVERIFIED. Nothing is published as customer policy or represented as human sign-off.

Independent review here means a separate adversarial source/evidence pass, literal SQL privilege expectations, before/after ACL snapshots, unchanged CSS comparison and native PG17 execution separate from the PGlite fixture. It is **not** a separate agent, person, external audit or legal approval. Review found and corrected SET-only and ADMIN-only omissions and the runner's omitted SQL-input fingerprints. No known unresolved locally actionable release-blocking P0/P1 product defect remains after the applicable gates pass.

## Verification and reproducibility

Use Node 24 with the committed lockfile, `npm ci`, the verified local PostgREST 16.4 test binary, and fixture-only environment. Run `node scripts/phase7-local-acceptance.mjs` with `PGRST_TEST_BINARY` pointing to that local binary. Hosted `PRISM_E2E_BASE_URL` or `PRISM_E2E_STORAGE_STATE` opt-ins are forbidden by the runner. Fresh full logs are under `artifacts/phase7/gates-1791711800933/`; all 31 gates passed with 254 frozen inputs, 163 units, 161 browser cases, five PWA cases and 481 responsive checks. After the ADMIN proposal refinement, only its regression script and two SQL proposals changed among those inputs. Lint and deletion-security are rerun on final stable source; the other 29 gates are reused from this same mission after proving all their source/configuration inputs unchanged. `artifacts/autonomous-readiness/final-gates.json` binds that exact three-file delta, per-gate provenance and final hashes. `latest-gates.json` refers to the focused rerun and is not misrepresented as another full 31-gate execution. Final remote CI executes the complete workflow on the published candidate.

The 31 commands are:

```text
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:db
npm run test:platform-db
npm run test:foundations-db
npm run test:period-db
npm run test:ledger-db
npm run ledger:dry-run
npm run test:ledger-review
npm run test:ledger-preview
npm run test:planning-db
npm run test:integration-db
npm run test:integration-review
npm run test:deletion-security
npm run test:goal-actions-db
npm run test:actions-db
npm run test:actions-native
npm run test:actions-review
npm run test:intelligence-db
npm run test:intelligence-native
npm run test:intelligence-review
npm run test:postgres
npm run test:restore
npm run test:localization
npm run test:pwa-review
npm run test:release-package
npm run test:e2e
npm run test:pwa
npm run test:responsive
```

Additional fresh commands: `npm audit --json`, `npm audit --omit=dev --json`, Gitleaks `git` and whole Git-visible candidate `dir` scans with redaction; fresh local PG17 wrapper invokes the committed `exerciseDeletionSecurity` after replay. Generated databases, credentials, tools, screenshots and raw evidence remain ignored. Native fixtures stop after testing; existing local data/worktrees are preserved.

The initial full-run frozen input inventory SHA-256 is `dc9000cf2f9d2746c67137287d739edcb45a5d97afe10bc1e4392a456400fb54`; final hashes and focused-run provenance are in `final-gates.json`. Lock SHA-256 remains `cfc94b18ee3d228a7f36fa6a5acce2daa2861d782ddf152b3140db5e0794041b`. Proposal hashes in the native/PGlite receipts bind the final SQL. All 17 migration Git blobs are unchanged.

Historical evidence is labeled explicitly: run 38125792983 at the accepted starting SHA was freshly confirmed successful but is not a new run. Earlier PG17 financial/migration/cold-restore and Auth v2.197.0/PostgREST evidence from source `dddf4a1f13f304f23530f2691f53b389cbe96ab7` is reused after verifying 96 unchanged database/domain/script inputs and all locked modules except the build-only parser. The original PG17 receipt is dated 2026-10-10T23:21:55.637Z; Auth receipt 2026-10-10T23:48:56.224Z. Their ten groups each include exact four-currency/microsecond cases and synthetic restore/Auth/MFA/session behavior, with the documented Windows TCP adapter. No fresh real Auth service, hosted backup/PITR or physical-device acceptance is implied. The complete fresh PG18/PGlite/native HTTP pipeline is separate.

## Publication controls

Only the reviewed fast-forward release branch is authorized. Before publication verify origin/canonical identity and advertised SHA/ancestry, clean tree, exact reviewed inventory, passing source-matched gates, secret/artifact scans and the only active GitHub workflow. The workflow runs local synthetic services and has no deployment, hosted credential, production write or paid-operation step. It adds one security step to the existing pipeline.

Fresh Vercel GET metadata establishes team `ismailstudio` (Hobby), project `prism`, ID `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr`, repository ID 1392802844, explicit `previewDeploymentsDisabled=true`, production branch main and no deploy hooks. Recheck those exact controls immediately before pushing; do not change settings. Compare deployment history/settings after CI. Current billing preflight showed 1,097/2,000 minutes, displayed 0.4/0.5 GB storage, billed Actions $0, an existing $0 budget and Stop usage Yes. A 45-minute single-run upper bound and small synthetic artifacts fit the available free allowances; refresh before publication. No spending limit is changed.

## External blockers and exact next actions

| Severity / requirement | Evidence and production impact | Required next action, authority and RM0 boundary |
|---|---|---|
| Potential P1 hosted deletion | Historical helper EXECUTE concern; local bypass reproduced; current hosted ACL/exposure inconclusive | Establish a guaranteed read-only transport on `hyhsppiitijkuvpyswce`; inspect signatures/owners/ACLs/schema/recursive roles/defaults/dependencies/API exposure. Separately authorize any target-specific additive repair, rehearse it and capture before/after evidence. No hosted deletion test. Metadata/repair need no intrinsically paid project. |
| High hosted schema/Auth/RLS/MFA/security acceptance | Project identity/healthy state verified; hosted version 17.6.1.166, local PG17.11/PG18 fixtures are not managed parity; five proposals remain unapplied | Authorized operator reconciles real catalog/receipts and historical aliases, reviews provider version/patch/extension compatibility and verifies matched-client/provider behavior on an approved disposable target. Do not replay/reset the production baseline. Establish RM0 before any target operation. |
| High full device/accessibility | Automated Edge/axe/modal/EN/MS/reflow/PWA evidence; no physical Android/iOS or spoken AT/real zoom sign-off | Run the existing eight-step manual procedure with owned devices and actual AT/native-speaker participants; complete the new evidence form. May be RM0 with available equipment/participants. |
| High recovery acceptance | Fresh synthetic 28-table cold restore plus unchanged historical PG17/Auth evidence; managed restore, Storage/provider/key recovery and approved RPO/RTO unverified | Owner selects a supported free recovery plan, custodians/objectives and approved nonproduction restore scope; measure recovery and reconcile deleted accounts/accepted commands before return to service. Costs must be verified first. |
| High privacy/legal/deletion policy | Internal bilingual draft and data-fact matrix prepared; controller/contact/retention/processors/rights/DBN/DPO applicability unapproved | Actual owner and qualified reviewer complete verified facts, review current Malaysian applicability and approve both languages. No invented contact, retention or legal sign-off. No paid review is authorized. |
| High operations/support/monitoring | Runbooks/forms prepared; no staffed owners, alert delivery, thresholds/SLOs accepted | Assign actual roles/channels, approve minimal events/thresholds, test alert delivery/tabletop and sign off recovery/rollback. Use existing RM0 tools only. |
| High build advisory disposition | Five findings in unpatched braces chain; zero runtime; parser moderate findings repaired | Owner reviews current threat model and records deferral or authorizes a separately tested major build migration/upstream fix. No silent waiver. Local upgrade testing is free; no compatible braces patch exists today. |
| Medium capacity and consistency | Synthetic 5,003-transaction SQL and 10,000-row derivation samples, responsive checks; no accepted production data envelope/field metrics | Owner defines dataset/limits/snapshot expectations; validate representative approved fixtures and real-device/network behavior. RM0 using existing fixtures/equipment; production financial queries remain outside this mission. |
| Production release authority | Release-branch validation creates no launch permission | After all blocker evidence is accepted, separately authorize any hosted repair/migration, compatible deployment, launch and rollback plan. This mission does not perform them. |

Launch handoff order: resolve current deletion security first; reconcile and accept hosted schema/Auth/provider/recovery; complete physical-device/AT and representative capacity evidence; obtain actual dependency/privacy/legal/operations decisions; then separately approve the matched schema/client/worker production release and rollback plan. Reuse accepted source-matched tests; do not repeat completed local gates without a changed input or unresolved failure.
