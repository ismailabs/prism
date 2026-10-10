# Phase 5 connected actions: local handoff

Requirements: `C:/Users/moham/OneDrive/Desktop/MAIOS/PHASE 5/05_GOALS_REMINDERS_NOTES_AND_CALENDAR.md`, read in full. The committed integration baseline supersedes its historical audit. This record covers local acceptance, not publication or hosted acceptance.

## 1. Baseline and prerequisites

- New managed worktree: `C:/Users/moham/.codex/worktrees/phase5-intelligence/prism-finance-baseline`, created from `codex/phases1-4-integration`, then assigned local branch `codex/phase5-actions`.
- Exact initial HEAD: `7a92a4174455750869133dc6dc65828da08bcae0`. Initial tracked/untracked state was clean; separate `.git/worktrees/prism-finance-baseline6` metadata and shared object store establish isolation. The user subsequently accepted local verification and authorized commits for the 47 audited paths. The implementation checkpoint is `8290906deefd68f59e86e3e19f521e4882769bd5`; the following documentation checkpoint completes this local baseline.
- Parent accepted integration: `78505b5bacc17a1b41c7b96c56e33c2d964e2a89`, then accepted Phase 1 `72da622305754328f02ec8f5d2ca8b71a221ee17`. Phase 2–4 checkpoint commits are content provenance rather than merge ancestors.
- Read committed integration handoff, 92-file inventory, superseding local checkpoint and remote-readiness checklist. All 91 non-self entries match Git blob IDs; checkout newline conversion explains raw SHA differences. Existing financial/security implementations and old 16 migration bytes were verified before implementation.
- Lock SHA-256 remains `87684E891EBDEC9518E3FFDAE0ACB1421D26AF1FF160351F76A4B3BE41CD1EDA`. Dependency versions and generated hosted type snapshot remain intact.
- Original `528b` checkout is still clean at the required HEAD. Original phase worktrees/branches were preserved. Node 24/npm, Supabase CLI 2.117.0, PGlite, native PostgreSQL 18.4/PostgREST 16.4 and Edge verification are local.
- Remote CI, hosted PostgreSQL 17, staging, provider Auth/OAuth and production remain unverified. No production credentials/data were used in mutating tests.

## 2. Implemented packets and changed files

| Decision | Work |
| --- | --- |
| Keep | Legacy financial authority, immutable shadow ledger, native exact-money transport, transfer/link guards, signed rollover, debt history, Auth/MFA/session/RLS, English/Malay and private cache isolation. |
| Repair | Future-source goal progress, safe contribution retries/reset, source distinctions, date precision, calendar DST boundaries, private mutation cleanup and fixture count/ownership fidelity. |
| Add 5A | Owned optional weekly/monthly cadence/account plan, exact gap, projected completion/assumptions and source-aware contribution evidence/history. Existing goal/savings targets, priority/status/dates/milestones remain. |
| Add 5B | Private plain-text title/body notes, bounded tags, pin/edit/archive/restore, owned text/tag search, exact-count 25-row pages and typed links to transaction/account/debt/goal/budget/reminder/period. |
| Add 5C | Owned manual recurring reminders, wall-clock IANA time, interval/importance/state/archive, current-source in-app candidates, durable read/complete/dismiss receipts and five preferences. |
| Add 5D | Calendar/timeline with Posted/Upcoming/Estimated/Overdue/Done text, month/search/source/status filters, 25-item display pages, keyboard links, owned detail lookup beyond short source lists, context notes and bilingual/privacy navigation. |
| Defer | Hosted cutover, external delivery, cron/calendar sync, bank integration, uploads, rich text, AI actions, note export/import and all publication. |

All 47 changed paths (27 implementation, 16 tests/tooling, four documentation files) and normalized hashes are in `phase5-changed-files.json`, updated for this authorized checkpoint. All 44 implementation/test/migration-inventory paths retain their accepted verification hashes; only the three checkpoint documentation files receive final review metadata. Files are grouped into implementation, tests/tooling and documentation there. The sole new migration has a separate reviewed normalized hash in `phase5-migration-inventory.json`. Ignored synthetic artifacts and dependency/cache directories are excluded.

Goals visibly distinguish linked transfers, legacy transaction links and notional earmarks. The list and detail label overlapping earmarks as non-additive intentions; account balance is not inferred as goal ownership. A transfer can support only one contribution. Planned cadence and estimated completion never transact money.

Notes retain created/updated timestamps and render plain text. Archive preserves links; source deletion nulls only the link and retains the annotation/reminder. Manual completion can complete one occurrence or an explicitly labeled series. Notification completion acknowledges attention, not a recurring financial posting.

## 3. Financial/security reasoning and review

- Legacy records/reporting remain authoritative. The accepted shadow ledger is separate: no cutover, dual writes, backfill, opening-balance guess or unattended posting.
- The contribution RPC is security invoker, rejects FALSE/NULL assurance, uses caller ownership/stable ID/time, compares retry payloads and retains existing locked currency/transfer guards. Reusing a transfer on another goal and changed retries fail.
- New tables use operation-specific owner RLS, revoked anonymous grants and restrictive session/MFA policies. Composite foreign keys enforce owned references and currency alignment for cadence/account relationships. Private trigger functions have empty search paths and no exposed execute grant.
- Exact money is decimal text/native integers. MYR/USD/EUR retain two decimals and JPY zero. Aggregated goal progress can exceed the individual-entry cap without losing precision. FX remains display-only.
- The forward effective-contribution view retains its columns/permissions and excludes future linked source movements; stored monetary rows remain unchanged. Client classification preserves sub-millisecond PostgreSQL precision: one microsecond after the supplied clock is still future.
- Recurrence retains the original month-end anchor. Client/SQL reject an initial DST gap/fold. A later ambiguous/missing occurrence remains visible as Estimated/time-needs-review and receives no notice. Calendar fetches a bounded UTC envelope, then filters real financial dates, so nonexistent midnight cannot hide a valid month.
- Candidates recalculate current source amounts/dates. Receipts store only key/state, with unique owner/occurrence identity; source changes/removal supersede stale candidates. Posted transactions cannot be relabeled by arbitrary receipt keys.
- New queries are verified-session gated, owned, abortable and in registered private query families. Private bodies/tokens are not persisted to local storage, a service worker/public cache, exports or external delivery. Settled private write variables are cleared; pending writes remain counted until financial settlement/invalidation finishes, then are removed. Existing late-response query-presence guards remain.

The independent adversarial pass was performed by the implementation agent using separate integer/timezone oracles, code/SQL review and native lock probes; it is not a second-person certification. Review covered ownership, grants, keys, stale sources, precision, pending settlement, cache cleanup, React hooks/state, accessibility, reflow and error handling.

Official documentation consulted: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [PostgREST CORS](https://docs.postgrest.org/en/stable/references/api/cors.html) and [count pagination](https://postgrest.org/en/stable/references/api/pagination_count.html). Compatibility was checked against the pinned local client/database tools; managed-provider behavior still needs rehearsal.

## 4. Verification and defect remediation

| Defect found | Fix and regression |
| --- | --- |
| Inherited contribution view counted future transfers | Forward view repair; native/PGlite future-source and exact-cash tests. |
| Duplicate request/stale account state | Stable contribution identity/time, reset modal state, owned transfer destination; actual lock and one-row concurrent retry. |
| Lazy context delayed unrelated pages; repeated-route target state | Conditional context load and route-revision keys; SSR/navigation and source-link tests. |
| Only first goal cadence appeared per month | Emit each cadence plus distinct target; weekly/month-end tests. |
| Older reminder in another zone missed the backlog window | Convert actual reminder instant to profile financial date; year/month/cross-zone regressions. |
| Preference checkbox reverted before server refresh | Local draft with awaited refresh/failure restoration; save/reload browser checks. |
| Individual cap used for aggregate milestone comparison | Aggregate parser; two maximum-size earmarks and large JPY tests. |
| Rebuilding formatters for every instant made recurrence slow | Reuse formatter and per-derivation instant map; 12 accepted resolver cases and equivalent keys. Final controlled 93-occurrence samples are in `artifacts/phase5/independent-review.json`; timings are local diagnostics, not field/hosted claims. |
| Valid month began in a DST gap | Bounded query envelope/real-zone filter; Cairo August 2014 unit/browser tests. |
| Date.parse truncated future microseconds | Exact remainder comparison; future transfer/transaction tests. |
| Private mutation variables outlived query cleanup | Remove settled writes; retain pending counters until settlement; abort/cache and ordering tests. |
| Recurring source link opened only a list | Owner-scoped exact rule context panel and browser deep-link/anticipated-label assertions. |
| Posted records displayed an unusable Unread label | Restrict attention labels to reminders/notification items; exact row/status browser assertion. |
| Malay responsive readiness matched two statuses | Scope each page to its exact empty/count text; retain strict matching and the failed screenshot/log; rerun the entire matrix. |
| New test/docs insertion used legacy encoding | Correct UTF-8 bytes; scan every changed text file; preserve failed exact-selector trace and unchanged date assertion. |
| Old fixtures omitted ownership; count header inaccessible | Normalize synthetic default owner while preserving explicit foreign owners; expose count header. Existing debt assertions are unchanged. Real PostgREST checks owned counts and browser-origin CORS. |

Initial failures/traces are retained under `artifacts/phase5/failures/` and initial/interrupted logs. Concurrent database/browser/responsive runs exhausted much of this 4 GB Windows machine and caused timeouts; final suites run serially with existing assertions/timeouts. The first CORS probe omitted browser Origin; the corrected native request passes. No failed/interrupted run is treated as green.

| Actual command | Local result |
| --- | --- |
| `npm ci` | PASS, 410 packages, unchanged lock/dependencies. |
| `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` | PASS; final unit run: 143 tests / 16 files. Final client logs and `acceptance-results.json` under `artifacts/phase5/gates/`. |
| `npm run test:db`, `test:platform-db`, `test:foundations-db`, `test:period-db` | PASS: accepted financial, CRUD, transport, session/MFA, timezone/period and deletion invariants. |
| `npm run test:ledger-db`, `ledger:dry-run`, `node scripts/phase2-review-probes.mjs` | PASS: immutable posting/reversals, exact cutoff, authorization truth tables and zero-tolerance historical reconciliation; future activity remains deferred. |
| `npm run test:planning-db`, `test:integration-review` | PASS: all eight Phase 4 database groups and 100 four-currency rollover oracle cases. |
| `npm run test:goal-actions-db`, `test:actions-db`, `test:actions-native` | PASS: transfer once/retries/future exclusion, owned references/search/CRUD, DST, orphan retention, concurrent receipt deduplication, exact cash and every seeded journal row preserved. Native HTTP checks grants/session/MFA, exact strings and CORS/count exposure. |
| `npm run test:integration-db` | PASS: 17 files; old 16 hashes match; populated upgrade preserves all 13 legacy tables/cash; four injected DDL failures roll back/recover; clean/upgraded catalogues agree; incompatible receipts rejected. |
| `npm run test:postgres`, `npm run test:ledger-preview` | PASS: native financial lock/HTTP tests; bilingual accessible stock/flow/journal preview. |
| `npm run test:actions-review` | PASS: 100 closed-form funding cases, 12 accepted timezone/DST comparisons, immutable inputs/equivalent keys and measured before/after samples. |
| `npm run test:e2e` | PASS: 109 browser tests (seven Phase 5 journeys plus all 102 accepted journeys), final serial run against the corrected build; 12.7 minutes. |
| `npm run test:responsive` | PASS: 481 layout checks and zero browser errors, English/Malay at all ten widths from 320 to 1440 px; accepted dialogs plus new long-content forms. Exact page readiness selector repaired; targeted script lint also PASS. |
| Actionlint 1.7.12 | PASS edited fixture-only workflow; remote job/upload unverified. |
| Gitleaks 8.30.1, `git diff --check` | PASS: all 47 final changed files (including documentation/inventory), no leaks; reviewed migration/hash and UTF-8 integrity checks pass. |
| `npm audit --json`, `npm audit --omit=dev --json` | Eight inherited dev/build advisories (six high/two moderate); runtime zero. No dependency change or security certification. |

Raw synthetic evidence is ignored under `artifacts/phase5/` and existing integration/Phase 2 artifacts. Browser fixtures prove client behavior; local native PostgreSQL/PostgREST proves exercised SQL/HTTP behavior. Neither proves managed PostgreSQL 17, provider Auth/OAuth, physical devices, real screen-reader use, hosted restore, remote CI or staging.

## 5. Migration/release plan

`20261010062259_phase5_connected_actions.sql` is the sole new SQL file, **unapplied remotely**. It depends on the complete accepted chain and is transactional. Local contract types are separate from the generated hosted snapshot. No stored money/profile preference/history is backfilled.

Reconcile actual hosted receipts/catalogue and historical timestamp aliases by content before any staging proposal. Never replay the empty-project baseline or normalize existing history. After explicit target/cost authorization and backup/restore verification, rehearse only approved missing forward files in order on an isolated target with synthetic owners. Verify PostgreSQL 17, default grants, Auth/MFA, exact HTTP/CORS/count pagination, orphan links, recurrence/DST, concurrency, cash/report reconciliation and matched client.

Failure before commit rolls back the full migration, locally tested. After commit, prefer a reviewed forward fix and preserve notes/reminders/receipts. Disabling new routes can pause use. Table drops erase private action data and require separate backup/export/restore approval; code rollback/table deletion is not immutable financial-history recovery. Hosted backup/PITR and recovery remain unverified.

## 6. Acceptance checklist

| Criterion | Evidence / disposition |
| --- | --- |
| RM1,000 Main to Savings, one goal contribution, no income/expense | PASS: exact SQL/native composition and retry/concurrency. |
| Two goals cannot claim the same funded allocation | PASS: unique transfer reference; explicit overlapping non-additive earmarks in list/detail. |
| Source change/removal updates progress; history preserved | PASS: source-aware domain/view, unlink-before-recast guard, cash restoration, seeded journal snapshots and existing reversals/cutoff checks. |
| Reruns deduplicate; due/timezone edits supersede stale events | PASS: pure derivation, stable keys, durable unique receipts and browser refresh/reload. |
| Overdue/tomorrow use actual timezone/month/year/DST | PASS: exact instant/calendar and Cairo boundary regressions in the final 109-test browser run. |
| A/B notes/reminders/links/search stay private | PASS: actual RLS/FK/CRUD/search/session/MFA/anonymous denial. |
| Future recurring money stays anticipated; completion no cash debit | PASS: pure derivation, request observation and SQL cash/journal conservation. |
| Dismiss/archive preserve journals/reports | PASS: seeded immutable snapshots plus all accepted financial/ledger/planning gates. |
| Mobile/keyboard/axe/reduced motion/privacy/cache cleanup | PASS: bilingual mobile/keyboard/axe/reduced-motion/privacy browser cases, cache/settlement regressions and all 481 responsive checks. Actual device/screen-reader use remains unverified. |
| Empty/error/retry/search/page states | PASS: native count scope/header and final browser search/page/403/retry/empty regressions. |
| No external notification/financial automation/hosted mutation | PASS: excluded from code/executed actions. |

## 7. Remaining limits, next packet and decision

Forecasts are assumptions capped at 1,200 anchored occurrences; recurrence windows are bounded and fail visibly outside supported ranges. Older recurring reminder backlog uses the recent window plus latest older obligation instead of materializing decades of notices. Notes are backend-paginated; other owned source sets use API pages and the displayed timeline is paginated. Large real histories, physical devices and screen readers need later product qualification.

The user authorized local staging and commits for this reviewed 47-file packet. The resulting committed baseline is ready for a separately assigned local Phase 6. Recheck GitHub/Vercel identities and the automatic-preview boundary in `phases1-4-remote-readiness.md` before any publication: a push can create a preview. Push, PR, merge, deployment, hosted migration/configuration, production writes and Phase 6 implementation remain outside this checkpoint authorization.

**GO for the committed Phase 1–5 local baseline.** All defined achievable local criteria pass; no known P0/P1 or unresolved acceptance defect remains. The reviewed inventory has exactly 47 paths and excludes secrets, generated output and unintended changes. Local commits were explicitly authorized. Remote CI, staging and production remain **unverified / NO-GO**. No push, PR, merge, deployment, hosted migration, configuration change, production data change or Phase 6 implementation occurred.


## 8. Phase 1–5 checkpoint and Phase 6 entry checklist

The final local review covered the complete tracked/new-file diff, all 47 inventory entries, inherited checkpoint provenance, migration dependency chain, UTF-8 integrity, whitespace and redacted secret scans. No material defect or inventory mismatch was found. The sole new migration follows the unchanged 16-file accepted chain; no generated hosted snapshot or dependency version changed.

| Retained phase | Baseline contract for the next assignment |
| --- | --- |
| 1 | Exact decimal-string money, inclusive microsecond cutoffs, present cash/progress, owned CRUD and protected financial history. |
| 2 | Immutable balanced shadow journals, durable retry identity, inverse reversals and explicit TRUE authorization; legacy cash remains authoritative. |
| 3 | Guarded private workspace, isolated public/demo flows, safe Auth destinations, defaults and English/Malay navigation. |
| 4 | Signed rollover and unknown propagation, notional reserves/forecasts, debt scheduling previews and repayment-parent protection. |
| 5 | Source-aware goal plans/progress, private notes/manual reminders, durable in-app attention receipts and derived calendar; completion never posts money. |

Local commits are deliberately split into the coherent implementation/regression packet (44 paths, including the migration manifest) and checkpoint documentation (three paths). Implementation commit: `8290906deefd68f59e86e3e19f521e4882769bd5`. The documentation commit is titled `docs: record Phase 1-5 local checkpoint and Phase 6 entry gates`. Its exact hash/final Phase 1–5 HEAD is obtained with `git rev-parse codex/phase5-actions` and recorded in the ignored post-commit receipt `artifacts/phase5/final-local-checkpoint.json` and the delivery report. A committed document cannot contain its own commit hash; the full 47-file manifest therefore records the implementation hash and final-HEAD locator.

The accepted 143 unit tests, 109 browser tests, 481 layout checks, financial/ledger/planning/native HTTP/database gates and 17-migration installation/upgrade/rollback checks apply to the committed implementation: all 44 tested implementation/tooling/migration-manifest paths match the accepted normalized hashes, all other tested tracked inputs are inherited unchanged, and the lockfile is unchanged. The only subsequent edits are these checkpoint documents. Git commits and documentation edits do not change test inputs, so no functional suite needs repetition solely for this checkpoint. Staged/committed hash, inventory, ancestry, migration, secret and clean-status checks are repeated instead. Original failures remain preserved as failures; only the documented final passes establish acceptance.

- [x] Exact prerequisite `7a92a4174455750869133dc6dc65828da08bcae0`, accepted Phase 1 ancestry and clean isolated starting worktree verified.
- [x] Review/staging limited to 47 paths: 27 implementation, 16 tests/tooling, four documentation; zero generated output or secrets included.
- [x] Tested implementation hashes, unchanged lock and inherited 16 migrations verified; sole forward Phase 5 migration reviewed and still unapplied remotely.
- [x] Financial/ledger/security/budget/debt/Auth/localization behavior remains within the inherited contracts; no known unresolved P0/P1.
- [ ] Obtain a separate Phase 6 assignment and use a new isolated worktree at the exact final Phase 1–5 SHA reported for this checkpoint, from `codex/phase5-actions`. Verify HEAD, ancestry, clean status, committed inventory and this handoff before implementing that assignment.
- [ ] Preserve the existing authority, exact-money, ownership/session/MFA, history, forecast/notional, private-cache and bilingual contracts; do not infer financial automation from an attention receipt.
- [ ] Keep remote publication and hosted acceptance separately gated. Reconcile actual hosted receipts/aliases, target identity, PostgreSQL 17/Auth/default grants, deployment triggers and backup/recovery before any separately approved rehearsal.

Eight inherited dev/build dependency advisories (six high, two moderate; runtime audit zero) remain disclosed. Remote CI, managed provider behavior, physical devices/screen readers, large real histories and hosted recovery remain unverified. These limits do not block the separately authorized local Phase 6 starting-point GO; they do block a hosted/production acceptance claim.
