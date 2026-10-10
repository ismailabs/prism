# Phases 1–4 committed local baseline

10 October 2026. Branch: `codex/phases1-4-integration` in `C:/Users/moham/.codex/worktrees/6aee/prism-finance-baseline`.

**GO as Phase 5's local starting point, subject to a separate Phase 5 assignment.** No Phase 5 work was begun. No push, remote PR, protected/shared merge, deployment, hosted migration, hosted configuration mutation or production-data copy occurred.

This document supersedes the uncommitted-state statements in the original [integration handoff](phases1-4-integration-handoff.md) and [86-file candidate manifest](phases1-4-final-inventory.json). Those files remain exact historical acceptance snapshots. Current Git/evidence provenance is in [the checkpoint review](phases1-4-checkpoint-review.json), [the complete committed inventory](phases1-4-committed-inventory.json), [the local PR draft](phases1-4-pr-description.md) and [remote/staging prerequisites](phases1-4-remote-readiness.md).

## Commits and ancestry

The accepted implementation is committed as `78505b5bacc17a1b41c7b96c56e33c2d964e2a89` (`Integrate accepted Phases 1-4 financial baseline`), directly atop accepted Phase 1 `72da622305754328f02ec8f5d2ca8b71a221ee17`. Its tree is `b9d9acb35c70a3527dd39a5199f48ef4fddff280`. The complete 86-file staged/committed binary diff exactly matches the accepted integration patch SHA-256 `290E59A0AAF41C940712333C20C434D50473854EB2F69E10F136449895EAA457`; no material mismatch occurred.

The following local CI/readiness commit changes only workflow logging/failure artifacts, source-packaging ignore rules, the README pointer and checkpoint/PR/readiness documentation. Application code, financial/security SQL, fixture bytes, tests, dependencies and lockfile remain exactly the implementation checkpoint's Git blobs. Its final hash is resolved by `git rev-parse HEAD` and recorded in the post-commit receipt `artifacts/integration/local-commits.json`; a commit cannot contain its own hash.

```text
819ddef0e8a3b9aad07475ff495152e4d2ea9156  unchanged main and inspected remote main
└─ 698a2c1e2d4e9eeeb529e66f2b3a8d629e68c91b
   └─ bf691ff0316c1d4176723150b96f6e648b4acae6
      └─ 1653e2f069bb81c01f180e6ec9ee0d4863aaff95
         └─ 72da622305754328f02ec8f5d2ca8b71a221ee17  accepted Phase 1
            └─ 78505b5bacc17a1b41c7b96c56e33c2d964e2a89  accepted implementation
               └─ HEAD  local CI/readiness checkpoint
```

The original Phase 2 `5f07fe20062623d429a0e4fda4fb1ee759a4e063`, Phase 3 `1c0c5fa98925dd29df3bc0ae9a7ecba4bcf0c068` and Phase 4 `ba98330e50ca87afb03f58d1fd4bfca92dbc0e78` checkpoints are unchanged. Phase 2/3 still branch from Phase 1; Phase 4 still branches from `819ddef0`. Their accepted contents were integrated, including both Phase 2 P1 remediations; they are not newly merged ancestors of integration HEAD. All original worktrees remain intact and clean; all 105 original audited source-file hashes still match.

## Verification bound to committed code

The byte-identical accepted patch and unchanged application/test/migration Git blobs bind the reported verification to the committed implementation. Git committing itself does not change those tested inputs. After the implementation commit, typecheck/lint and all **127 unit tests in 13 files** passed again. Actionlint validates the changed workflow; deliberate failing/successful processes prove Bash `pipefail` retains command exit status while logging.

The **102 full browser tests**, final **six expanded integration journeys**, **361 responsive checks**, native/PostgREST security/concurrency checks, clean/upgrade installation, **three transactional recovery probes**, **23 zero-difference historical reconciliations** and **100 independent rollover oracle cases** still apply. Their implementation, fixtures, tests, browser configuration and locked dependencies have not changed. No full browser/native rerun was needed solely because Git created a commit or because workflow/ignore/documentation files changed. Ubuntu/Chromium and actual GitHub CI remain separate pending evidence.

The package-only correction is verified independently: a Vercel `--dry --format=json` manifest includes the imported synthetic ledger JSON while excluding SQL/audits/credentials/generated output. The release build also passes in an isolated snapshot containing only those included source files, with unchanged installed locked dependencies and fixture-only provider configuration. No source was uploaded and no deployment was created.

The 16-migration dependency chain is unchanged and hash-verified. Ledger posting/retry/reversal/microsecond authorization invariants, full-history signed rollover, unknown propagation, protected debt history and authoritative legacy balances are preserved. Positive carry remains available MYR 900/remaining MYR 50; negative carry remains available MYR 700/remaining −MYR 50. No authoritative debt split adapter was introduced.

## CI and deployment review

The former CI job did not upload failure evidence. It now retains gate logs and narrowly allowed synthetic reports/screenshots/Playwright traces with `if: always()`, a seven-day retention period, hidden files disabled, pinned actions and no persisted checkout credentials. All original gates remain, with explicit Phase 2 review probes added. Command failures still fail the job. The workflow contains no hosted deployment/migration command or production secret reference.

The former source ignore rules omitted the synthetic JSON imported by the viewer and admitted local generated browser/build output to the CLI manifest. The local allowlist now admits only the required JSON from `supabase`, while excluding the other private/generated trees. The validated source snapshot builds successfully; all application code remains unchanged.

Read-only provider inspection identifies the recorded Vercel project ID/team, now named `prism`, linked to this repository. Git deployments are enabled; production targets `main`; automatic domain assignment is enabled; the ignored build command and project deployment-check field are null. This is an actionable publication risk: a future branch push can trigger a preview independently of financial CI. No hosted setting was changed. Resolve deployment authorization/suppression/isolation before publishing; do not treat permission for remote CI as permission for a preview.

## Remaining risks and prerequisites

There is no unresolved local checkpoint blocker and no known financial/security P0/P1 application defect. Eight inherited development/build dependency advisories remain (six high, two moderate); runtime audit is clean. The local baseline is not a dependency-security certification.

Remote CI upload/run behavior, managed PostgreSQL 17, real Supabase Auth/MFA/OAuth/RLS/default grants/Realtime, isolated hosted migrations, backup/PITR/operator recovery, real-record reconciliation, physical devices and complete manual assistive-technology verification remain unverified. Production migration receipts have documented historical ID differences and must be reconciled before applying only verified missing additive migrations. Legacy balances remain authoritative, accounting is shadow/synthetic, and debt splits remain previews.

The [remote/staging checklist](phases1-4-remote-readiness.md) states the exact prerequisites. Final inventory, secret/whitespace checks, original-source preservation, actual local commit hashes, clean working-tree result and exported final patch are verified in the ignored post-commit receipt. Hosted/production/release GO is not implied by this local Phase 5 starting-point GO.
