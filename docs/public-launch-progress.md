# PRISM public launch checkpoint

Decision: **NO-GO**. M0 and authorized local verification are complete; M3 is in progress.
Goal Mode is active. The supplied isolated worktree is reused on
`codex/public-launch-20261014`; no production merge or deployment is allowed
until every G01-G13 gate is PASS. See [machine-readable ledger](public-launch-evidence.json).

## Verified baseline

- Repository: https://github.com/ismailabs/prism; current PR: https://github.com/ismailabs/prism/pull/5.
- PR #5 head: `345d26caa904c088c76f5c40c4435f6509260ffc`; open, unmerged, mergeable.
- Main: `d1438197a33d179cedd6c54bad3bfcf9a06db31f`; verified ancestor of the PR head.
- API, fetched and independently advertised refs match. Initial worktree was clean.
- Both baseline final-head checks and their logs were inspected: 166 units, 254
  browser, 14 Auth, 5 PWA and 481 responsive checks. New-head CI is required.
- Vercel project `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr`, team `team_y1FMLs1LWgVb2dOvegEGYVkf`.
- Production Supabase `hyhsppiitijkuvpyswce`; active PostgreSQL 17; no development branch.

## Scope and current blockers

The complete launch prompt, specs 00-13, checklists, templates and all three historical
source files were read from the supplied archive before implementation. Historical
release scope and receipts do not authorize production SQL writes, customer-data reads or
invented human acceptance. No encrypted financial backup or downloaded customer CSV
is used by this mission.

An isolated hosted staging database has not been discovered. Current advisor output
reports leaked-password protection disabled. Human device/AT and operator/operations
acceptance remain incomplete in the historical acceptance record. Branch protection
administration reads are denied by the GitHub integration; ordinary repository reads
work; branch metadata says main is unprotected and repository rulesets are empty.
Public in-app browser inspection confirms EN/MS privacy copy. Raw catalog and provider
snapshots remain ignored/local; the published metadata summary contains relevant controls.

Vercel automatic custom-domain assignment was narrowly disabled and independently
rechecked; Production remains `dpl_7ybY6ao53z2BG6yhhyrDpKX7CGNk` at the baseline SHA.
The candidate also disables Git auto-deployments. Public Auth metadata reports signup
already enabled, contradicting older notes; no Supabase Auth setting was changed.

Local acceptance passed 5 core checks (166 units), 16 database/review commands,
3 native PostgreSQL/PostgREST commands, 3 safety/recovery/package checks, 7 new
regressions and the complete 19-case phase3 file. The main catalog collects 261
cases. Exact new-head remote execution remains pending. Source/test failures and
corrected harness selectors are retained in the [audit](public-launch-audit.md).

## Milestones

| Milestone | State | Remaining evidence |
| --- | --- | --- |
| M0 | PASS | Independent baseline, provider identity/plan, release freeze and safe metadata |
| M1 | BLOCKED | Local onboarding/history repairs and audit complete; hosted password control unavailable |
| M2 | PASS | Synthetic core/database/native/recovery and relevant browser acceptance |
| M3 | IN PROGRESS | Reviewed candidate publication and fresh full exact-head remote CI |
| M4 | BLOCKED | Separate hosted test environment; production cannot serve as staging |
| M5 | BLOCKED | Actual hosted/human/operator/recovery gates remain unsatisfied |
| M6 | BLOCKED | Conditional production merge/release requires all mandatory gates PASS |
| M7 | BLOCKED | Candidate public acceptance follows authorized release only |

Next safe action: secret-scan/stage the reviewed delta, commit on the isolated branch,
publish a development PR preserving PR #5, then inspect its exact-head CI and artifacts.
The [staging/human handoff](public-launch-staging-and-human-acceptance.md) and
[deployment/recovery playbook](public-launch-deployment-playbook.md) define the gated
continuation. Keep production stable; no customer rows or production financial writes.
