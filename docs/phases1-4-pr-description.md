# Integrate Phases 1–4 with reconciled rollover and preserved financial history

Dashboard advice previously compared spending with the base budget while budgeting used the amount available after rollover. This integration makes both use complete budget history and signed carry: an MYR 800 allocation with MYR 100 prior surplus provides MYR 900; an MYR 100 deficit provides MYR 700. Missing spending remains explicitly unknown. Deterministic unit, native SQL and browser regressions verify the same results in ordinary financial reporting without changing legacy source balances.

The integrated application retains the accepted Phase 1 corrections, the shadow ledger and both Phase 2 P1 remediations, Phase 3 guarded routes/onboarding/English–Malay UX, and Phase 4 budgeting, reserves, recurring forecasts and debt schedule previews. Ledger timestamps preserve microseconds and inclusive cutoff semantics; privileged ledger functions require explicit TRUE authorization. Posted journals remain immutable, atomic and idempotent, with inverse reversals and currency isolation. Legacy balances remain authoritative; the protected accounting laboratory uses synthetic fixtures, and authoritative debt split posting remains unavailable.

All original phase worktrees/checkpoints are preserved. The implementation checkpoint is `78505b5bacc17a1b41c7b96c56e33c2d964e2a89`, directly based on accepted Phase 1 `72da622305754328f02ec8f5d2ca8b71a221ee17`. Later local CI/readiness changes retain its source, SQL, tests and locked dependencies unchanged. The complete committed inventory and provenance are in [the inventory](phases1-4-committed-inventory.json) and [the checkpoint handoff](phases1-4-local-checkpoint.md).

## Validation

- 127 unit tests in 13 files; repeated after the implementation commit, alongside typecheck and lint.
- 102 full browser tests, six expanded cross-phase journeys and 361 bilingual responsive checks. Their application/test/configuration inputs are unchanged in the committed implementation.
- Native PostgreSQL 18.4/PostgREST 16.4 security, exact-money, ownership/MFA, HTTP, microsecond cutoff, immutable posting, retry/reversal and independent-connection concurrency checks pass.
- Clean 16-migration installation and upgrade from populated Phase 1 pass. All three post-Phase-1 migrations recover after injected pre-COMMIT failures; 13 legacy tables and exact cash are preserved. All 23 historical reconciliations have zero difference.
- Separate adversarial review and 100-case independent rollover oracle pass; original failed runs and remediation evidence remain recorded.
- CI workflow validates with Actionlint 1.7.12. Failure logs and synthetic traces/reports are retained through an always-running artifact step; Bash failure status survives log capture.
- Vercel's non-uploading source dry run verifies the required synthetic JSON build input is included while audit material, SQL, credentials and generated outputs are excluded. A build from the isolated included source succeeds with fixture-only provider configuration.

## Migration and release boundaries

No migration was applied remotely. The ordered additive candidates are Phase 1 history protection, Phase 2 shadow ledger, Phase 3 future-profile defaults and Phase 4 planning. Reconcile actual hosted migration receipts, catalogue/grants and the documented historical version differences before choosing which missing migrations to apply; never replay/reset the baseline to align IDs. Verify PostgreSQL 17, real Auth/MFA/OAuth, provider RLS and backup/recovery separately on an approved isolated staging target.

The runtime dependency audit has zero advisories. Eight inherited development/build advisories remain (six high, two moderate); dependency versions were retained. Local acceptance does not establish hosted, production, physical-device, full assistive-technology or dependency-security acceptance.

The linked Vercel project's Git deployments are enabled, production targets `main`, and its project API reports no deployment checks. A branch push can trigger a preview before CI completes. Resolve deployment-trigger authorization/isolation before publishing this branch. This document is a local PR draft; no push, PR, protected merge, deployment or Phase 5 work was performed.
