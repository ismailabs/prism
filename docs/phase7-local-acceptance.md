# P.R.I.S.M. Phase 7 — local acceptance and launch handoff

**Local decision: GO for Phase 7 acceptance and entry into controlled release validation.** The user subsequently authorized reviewed local staging, commits and this seven-phase release-candidate handoff; section 11 records that checkpoint. Customer launch and production readiness remain **NO-GO**. Entry means the local candidate is suitable for the proposed validation sequence, not permission to execute it. Pushes, PRs, merging main, deployments, hosted migrations/settings/infrastructure and production-data operations remain unauthorized and unperformed. This is not a production readiness, external security audit or regulatory compliance certification.

## 1. Baseline, provenance and authority

The new managed worktree is `C:/Users/moham/.codex/worktrees/prism-phase7-readiness/prism-finance-baseline`, branch `codex/phase7-readiness`. Its starting HEAD was `07901a6dabfa4696be25468f6de687c7619d171d`, exactly the requested `codex/phase6-analytics` base; it remained unchanged throughout implementation and the full acceptance run, before the authorized checkpoint in section 11. The original `3ea3` checkout was clean and remains separate. The new checkout was clean before the task-created preflight script; the preflight receipt explicitly records that one untracked task file, rather than calling the later tree wholly clean.

The recovered attachment is `C:/Users/moham/OneDrive/Desktop/MAIOS/Archive/PRISM_Codex_7_Implementation_Master_Prompts/07_PWA_LOCALIZATION_SECURITY_AND_LAUNCH.md`, SHA-256 `FB9F36871AA284BA5A0006DB73F0D4B659EE4B669BBED7AD6268276C08AF04CB`. The full prompt was read. Its containing folder moved into Archive during the task; the implementation scope did not change.

Preflight verified ancestry to Phase 1 `72da622305754328f02ec8f5d2ca8b71a221ee17`; integrated Phases 2–4 implementation `78505b5bacc17a1b41c7b96c56e33c2d964e2a89` and acceptance checkpoint `7a92a4174455750869133dc6dc65828da08bcae0`; Phase 5 implementation `8290906deefd68f59e86e3e19f521e4882769bd5` and handoff `3eb8ee4572d84b458426e8a3a0e8f92f0d0fad74`; and the exact Phase 6 HEAD. Phases 2–4 were content-integrated, not merged from their separate worktree branches: 91 accepted non-self Git blobs were verified at the accepted integration checkpoint. All 25 Phase 6 non-document input hashes matched the checkpoint. This distinguishes content provenance from branch ancestry.

All 17 migration files matched the starting inventory. The initial raw lock SHA-256 was `87684e891ebdec9518e3ffdae0acb1421d26af1ff160351f76a4b3be41cd1eda`; a reviewed source-map-js patch subsequently changes the lock. No domain money, reporting, ledger, planning, debt, goal, reminder, calendar, forecasting or SQL implementation was changed in Phase 7.

Evidence: `artifacts/phase7/preflight.json`; [previous Phase 6 handoff](phase6-local-acceptance.md); [migration baseline](../supabase/migrations/README.md). Local scripts use explicit synthetic fixture URLs and disposable databases. Local native PostgreSQL 18.4, PGlite and PostgREST are not managed Supabase PostgreSQL 17 or real-provider Auth evidence.

## 2. Implemented packets and exact scope

### 7A: PWA installation, caching, update and failure behavior

The manifest has a stable root identity, scope and start URL, standalone display with browser fallback, bilingual description and existing 192/512 PNG icons. Production builds emit a versioned worker and three hashed anonymous offline documents. Development and normal mocked-browser test mode do not register a worker; the separate PWA suite builds production worker behavior deliberately.

The worker precaches only the explicit hashed public asset inventory and anonymous offline HTML/CSS/JS. It never caches the SPA index, private rendered pages, Supabase/Auth responses, authenticated requests, API/export/search/notification/ledger responses or any write. Assets are fetched without credentials and rejected on failure, redirect, private/no-store policy or mismatched HTML/JS/CSS type. Partial installation removes its partial cache. There is no runtime cache population, background sync, IndexedDB finance persistence or financial mutation queue.

Navigation is network-only with an anonymous bilingual fallback after a connection failure. In an already open app, offline events hide the private workspace and clear finance/platform query data and settled mutation variables. A pending request may already have reached the server: the UI tells users to reconnect and check their records before retrying. Mutations use network mode `always`, with retries disabled, so an offline attempt rejects rather than pausing for automatic resubmission. Reconnect mounts fresh owned reads.

Updates wait for acceptance or closure of old clients. Only the accepting tab reloads; other open tabs are not forcibly reloaded. The update button is disabled during a financial mutation and rechecks the mutation counter at activation. The notice explicitly warns that unsaved edits are discarded by reload. Old PRISM public caches are replaced; unrelated app caches are preserved.

Chromium installation prompts are handled when the browser actually supplies the install event. Settings provide English/Malay menu and iOS Share → Add to Home Screen instructions. A missing installation prompt or unsupported service worker leaves the normal web app usable. Real OS installation and standalone launches remain manual gates.

**Storage distinction:** Supabase's existing SDK persists session/access/refresh tokens in browser localStorage. PKCE and token renewal remain enabled. Preferences, public FX data, setup dismissal and analysis-period choice also persist independently. The worker does not cache tokens or financial records; this is not a claim that tokens are never stored, that XSS cannot access localStorage, or that app memory/downloaded exports disappear from a shared device.

### 7B: English/Malay and accessibility

Public client configuration, including Supabase's public anon/publishable key, is intentionally bundled in public code. It is distinct from private access/refresh session tokens and privileged service-role credentials, which are excluded from the worker's public inventory. No real hosted credential was retrieved for this task.

Added bilingual offline, interrupted-save, installation, update and unavailable states. Known exact-money/CSV/date/recurrence/debt/journal/tag validation messages now have Malay copy, including the specific preserved-history deletion explanation. Unknown database/provider errors show a safe localized recovery message instead of rejected row details, account identifiers or tokens. Auth, MFA challenge/setup and session verification use the same safe error layer. Public FAQ, the accounting PHASE/FASA badge, debt deletion labels and goal/savings deletion dialog titles are localized.

The translation-resource regression requires matching non-empty English/Malay keys and interpolation names. The AST audit enumerates 52 route/component sources and remaining literal candidates; it is an inventory, not a semantic-completeness proof. Reviewed exceptions are PRISM/its expanded product name, Built by Ismail attribution, language names in their own language, ISO currency/example money tokens and the `incomeAnalysis` key (translated inside SpendingDonut). Canonical CSV headers/date formats and user-authored names are intentionally preserved for interoperability. Public metadata is bilingual-product English metadata; customer language selection translates rendered content. No unknown untranslated critical financial message was found in the reviewed paths. New error messages must enter the safe bilingual dictionary.

Existing keyboard, dialogs/focus return, chart text equivalents, privacy, reduced-motion and responsive coverage is retained. New offline fallback coverage runs light/dark, 320/360/390/768/1024/1440 widths at short 480px height, keyboard focus and axe WCAG 2/2.1/2.2 AA tags. The existing responsive script covers long dynamic names/amounts and the final Phase 6 tables. Automated coverage is not WCAG certification or a manual screen-reader audit.

### 7C: Security, privacy and integrity

The shared Supabase fetch explicitly uses `cache: no-store` and rejects known-offline requests. Host configuration adds HSTS, worker scope/revalidation, network-only HTML defaults and immutable hashed assets/offline documents. Frame denial, nosniff, permissions policy and CSP remain. A build-injected CSP narrows connect destinations to the configured HTTPS Supabase origin and its matching WebSocket origin; it intersects the hosting policy. Referrers are disabled in HTML and HTTP configuration. Missing environment names or an insecure/malformed provider URL cause build failure. No service-role credential belongs in a Vite variable.

SPA routing excludes APIs and static file paths, so a missing script does not become successful HTML. `/api/rates` remains a read-only public FX endpoint: validated four-currency input, upstream timeout/fallback, deduplicated pending requests, bounded freshness, no private finance input and safe failure JSON. A public FX cache is distinct from private finance caches. Its method/error behavior is exercised by existing unit tests; actual Vercel API/header precedence requires staging acceptance.

Local SQL/HTTP tests continue to enforce owner isolation, active session IDs, anonymous denial, verified-factor aal2 requirements, invoker views, grants, constrained owner/currency links, immutable posted ledger lines and reversal semantics. Privileged ledger functions retain empty search paths and explicit fail-closed `IS NOT TRUE` guards; account erasure remains confirmed and privileged. Nothing in Phase 7 relaxes RLS, grants, MFA or historical protections. No private attachment storage feature was introduced; live Storage policies have not been certified.

The inherited `report_reservations` notice concerns a private/unexposed legacy table; it is not permission to expose it, manufacture public RLS or drop it. Unused-index informational advice remains informational pending representative measurement.

### 7D: Reproducible verification, restore and release package

Added a serial local acceptance runner that records per-gate logs/results and hashes every non-document engineering input before and after execution. Hosted browser opt-ins are rejected. CI retains the prior financial gates and adds goal/action/intelligence, PWA, restore and localization coverage. CI artifacts are restricted to synthetic reports/screenshots/traces; never reuse that upload list for hosted authenticated runs.

The cold-restore rehearsal creates a disposable loopback PostgreSQL cluster, applies all 17 migrations, creates synthetic ledger/Auth fixtures, stops cleanly, snapshots the cluster, erases source synthetic users, restores into another fresh directory and compares exact-text fingerprints for every public/Auth/private table. It then repeats restored ownership/session/MFA/microsecond probes. A same-binary PostgreSQL 18 cold copy does not prove managed PostgreSQL 17 backups, PITR, cross-version restore, Storage or Auth-provider recovery.

The local source-package rehearsal copies an explicit application/config/public/synthetic-JSON allowlist into an isolated ignored directory, excludes docs/test artifacts/SQL/env values, builds with public fixture values, and checks environment failure behavior, exact-origin CSP, referrer policy, compiled worker syntax/macros and asset existence. It includes API/server source. This is local bundle/source evidence, not Vercel's authoritative linked source manifest. `vercel deploy --dry --format=json` could not produce a manifest because this worktree is unlinked; no `vercel link` or upload was performed.

The complete changed-file inventory, status, baseline blob and final normalized SHA-256 are in [phase7-changed-files.json](phase7-changed-files.json). Its self-entry has a null hash to avoid a recursive hash. Generated artifacts, dependencies, local binaries, database clusters and copied package directories are ignored evidence, not publication files.

<!-- PHASE7_INVENTORY_START -->

Complete inventory: 54 files.

| Status | File |
| --- | --- |
| modified | `.github/workflows/ci.yml` |
| added | `docs/phase7-changed-files.json` |
| added | `docs/phase7-local-acceptance.md` |
| added | `docs/phase7-verification.json` |
| modified | `e2e/actions.spec.ts` |
| modified | `e2e/focused-upgrade.spec.ts` |
| added | `e2e/hardening.spec.ts` |
| modified | `e2e/intelligence.spec.ts` |
| modified | `e2e/phase3.spec.ts` |
| modified | `e2e/planning.spec.ts` |
| added | `e2e/pwa.spec.ts` |
| modified | `index.html` |
| modified | `package-lock.json` |
| modified | `package.json` |
| modified | `playwright.config.ts` |
| modified | `public/site.webmanifest` |
| added | `pwa.playwright.config.ts` |
| added | `scripts/localization-audit.mjs` |
| added | `scripts/phase7-local-acceptance.mjs` |
| added | `scripts/phase7-preflight.mjs` |
| added | `scripts/phase7-release-package.mjs` |
| added | `scripts/phase7-restore-test.mjs` |
| added | `scripts/pwa-review-probes.mjs` |
| added | `scripts/pwa-server.mjs` |
| modified | `src/App.test.tsx` |
| modified | `src/App.tsx` |
| added | `src/components/PwaStatus.tsx` |
| modified | `src/components/auth/AuthScreen.tsx` |
| modified | `src/components/auth/MfaChallenge.tsx` |
| modified | `src/components/auth/MfaSetup.tsx` |
| modified | `src/components/financial/AccountingLab.tsx` |
| modified | `src/components/financial/CsvImport.tsx` |
| modified | `src/components/financial/Debts.tsx` |
| modified | `src/components/financial/Settings.tsx` |
| modified | `src/components/financial/copy.ts` |
| modified | `src/components/public/PublicHome.tsx` |
| modified | `src/hooks/useAuth.tsx` |
| modified | `src/i18n.ts` |
| added | `src/lib/connectivity.test.ts` |
| added | `src/lib/connectivity.ts` |
| added | `src/lib/errorCopy.test.ts` |
| added | `src/lib/errorCopy.ts` |
| added | `src/lib/localization.test.ts` |
| added | `src/lib/pwa.ts` |
| modified | `src/lib/supabase.ts` |
| modified | `src/lib/utils.ts` |
| modified | `src/main.tsx` |
| added | `src/pwa/offline.css` |
| added | `src/pwa/offline.html` |
| added | `src/pwa/offline.js` |
| added | `src/pwa/service-worker.js` |
| modified | `src/styles.css` |
| modified | `vercel.json` |
| modified | `vite.config.ts` |

<!-- PHASE7_INVENTORY_END -->

## 3. Independent review, defects and regressions

Review independence is evidence-level: a separate source/authorization review, a VM worker oracle independent of the browser UI, negative package-build probes, existing closed-form financial oracles and actual local SQL/HTTP behavior. No separate human/agent reviewer or external security auditor is claimed.

The React review checked hook ordering, stable external-store snapshots/subscription cleanup, mutation-counter guards, localized accessible names, modal background semantics, finite online/offline states and the existing text-based rendering of private notes. Registration is page-scoped and outside StrictMode effects, so double rendering does not create duplicate worker listeners. Query-family/identity cleanup and protected navigation remain intact. No new HTML injection, remote analytics, financial persistence or financial projection authority is introduced.

| Finding | Severity / resolution | Regression |
| --- | --- | --- |
| TanStack default mutation behavior can pause an offline write for reconnect | P1, resolved with immediate rejection, retry=false, explicit no-store fetch | connectivity unit and dropped-response browser tests; no second POST |
| Raw backend/Auth errors could expose rejected row details and remain English | P1 privacy / P2 localization, resolved with safe own-key whitelist and bilingual fallback | denied-response browser assertions wait for actual 403, reject private sentinel; unit and CSV/MFA tests |
| Worker build substitution targeted a macro in the added lint comment first, leaving runtime macros unresolved | P1 PWA availability, found during browser regression and fixed with replaceAll | compiled-worker macro/syntax check and real installation suite |
| Unknown static files could receive SPA HTML, compromising precache installation | P1 availability, resolved with static/API rewrite exclusion plus MIME checks | routing oracle, 404 browser request, HTML/private/404 install rejection |
| Explicit update could interrupt a financial save | P1, resolved with mutation-counter disable and activation guard | a held POST remains pending while the update is disabled |
| Error-code/message prototype property names could bypass the copy dictionary | P2, resolved using Object.hasOwn | constructor/toString/__proto__ regressions in both languages |
| source-map-js build-tool advisory had an available patch | Resolved with reviewed 1.2.1 → 1.2.2 lock-only update and npm ci | final dependency audit, build and full regression gates |
| Safe error sanitizer hid the client-controlled debt-history explanation | P2, resolved by whitelisting its exact bilingual copy and other reviewed static financial validations | server-history read with empty cached list, both languages, no DELETE; four error-copy units |
| Dynamic Malay debt labels and goal/savings deletion titles retained English words | P2, resolved with complete Malay strings and own-key dictionary lookup | translated guarded debt buttons and both destructive dialogs; no deletion during the localization check |

The financial-copy AST gate also requires a Malay entry for every static L(...) call. It found zero missing entries after remediation. All six dynamic templates were reviewed: delete/contribution prefixes preserve user names, remaining/due suffixes preserve formatted amounts/dates, and goal/savings title variants now have complete entries. This supplements the JSX literal inventory; it does not replace a native-speaker or assistive-technology review.

Test-infrastructure defects were also corrected without weakening authorization/money assertions: homepage/transaction heading names matched the actual DOM; exact combobox selection replaced a label collision; modal-hidden background update controls are inspected with explicit includeHidden; read-only report POST RPCs are not counted as transaction writes; the local update fixture changes all worker-version occurrences; and the older SSR error assertion now requires a safe alert, no private sentinel and no fabricated data. The HTML package probe decodes Vite's apostrophe entity before checking its CSP text.

Earlier failed PWA runs remain under `artifacts/phase7/pwa-results-*` when captured there; some earlier default test-results were overwritten by later runs, so their original traces are not claimed as retained. Worker substitution failure samples remain in `artifacts/phase7/failed-worker-build/`. The first frozen full run in `gates-1791640540420` found the outdated SSR raw-error assertion (161 passed, 1 failed) and was stopped after its current gate; it is failed/aborted evidence, not a pass. Final results are separate.

## 4. Financial invariants and security interpretation

The second complete run, `artifacts/phase7/gates-1791640732963`, passed 29 gates, 119/120 normal browser cases, all five worker cases and 481 responsive checks, but failed the specific debt-history guidance assertion. It is a failed run. Its browser trace/screenshot were copied to `artifacts/phase7/failures/final-first-browser/`. After the copy/label fixes, all 11 focused upgrade/hardening browser cases and four error-copy units passed. A third complete frozen run verifies the final source; earlier receipts do not substitute for it.

Money still crosses PostgREST/JSON as decimal text and is calculated in bigint minor units; MYR/USD/EUR retain two decimals and JPY zero. Native amounts are not rewritten by FX estimates or aggregated across currencies. The legacy ledger remains authoritative; the new balanced ledger remains shadow-only. Historical ambiguity remains an exception rather than a guessed posting.

Budget reserves, forecasts and debt scenarios remain planning-only. Notes, reminders, calendar entries and future scheduled events do not post money. Repayment and source-history deletion protection remain. The Phase 6 metric contracts, zero-denominator behavior, future-source exclusions, debt-split assumptions, exact reports and keyboard-scrollable readable table fix are included in the fresh full browser baseline.

The native chain tests cover clean/upgrade parity, transaction rollback/retry after four injected DDL failures, lock/concurrency behavior, four-currency reconciliation with zero tolerance, timestamp microseconds, NULL session/MFA fail-closed checks and exact HTTP transport. Their synthetic results establish local implementation behavior, not reconciliation of existing production records or complete hosted net worth.

Supabase documents that sign-out does not immediately invalidate an already issued access JWT. This application's database session-ID checks are therefore material controls; they must be tested against managed Auth session cleanup and aal transitions on staging. [Supabase session guidance](https://supabase.com/docs/guides/auth/sessions).

## 5. Verification matrix and evidence boundaries

**Final verification: PASS — all 30 gates on 248 unchanged engineering inputs.** The serial runner's final receipt is `artifacts/phase7/latest-gates.json`; the durable handoff summary will be [phase7-verification.json](phase7-verification.json). Each gate has its own command, exit code, duration and log path. The final run is `artifacts/phase7/gates-1791642386749`; it passed 163 unit tests/20 files, 122 normal browser cases, five real-worker cases and the full responsive matrix. These are final-tree results, separate from baseline and focused runs.

Before implementation, the exact unchanged Phase 6 tree passed a fresh 156-unit/17-file suite, all 117 browser tests (17.4 minutes, including the final Phase 6 table change), and the complete native migration/integrity rehearsal. This closes the previous Phase 6 full-suite timing gap. It is baseline evidence, not final Phase 7 evidence.

Focused Phase 7 verification passed: connectivity/error/localization units; 38 existing action/intelligence/planning/Phase 3 browser cases; all five real-worker cases; all three new hardening browser cases; independent worker probes; source-package build; and a 28-table native restore comparison. The final frozen suite repeated all affected coverage successfully.

| Gate group | Final result | Environment / limits |
| --- | --- | --- |
| npm ci; types; lint; unit; production build | PASS | Node 24.19/npm 11.17, Windows; fixture build env |
| Finance/platform/foundations/period/ledger/planning SQL | PASS | isolated PGlite, exact-money fixtures |
| Ledger dry-run/review/preview; integration DB/review | PASS | independent oracles, full 17-chain, native rollback/concurrency |
| Goal/actions/intelligence SQL and native/review | PASS | synthetic PostgreSQL/PostgREST; no managed credentials |
| Native PostgreSQL HTTP security/integrity | PASS | pinned PostgREST 16.4, native PostgreSQL 18.4 |
| Restore and release-package rehearsal | PASS | cold same-version restore; local bundle/source allowlist |
| Full browser baseline | PASS | all normal specs, Edge, mocked backend; PWA separate |
| Real-worker PWA and worker oracle | PASS | production worker, loopback, controlled responses/offline |
| Localization audit and responsive | PASS | bilingual literals/resources, 320–1440, long text; emulation |
| Dependency audit | 0 runtime; 5 high/2 moderate build advisories | current registry; build-only risk assessment below |
| Whitespace, candidate/staged secrets, final inventory/isolation | PASS | local candidate and authorized checkpoint; section 11 binds committed inputs |
| Hosted GitHub CI / Vercel headers / Supabase advisors | NOT TESTED / BLOCKED | connector/link limitations; no persistent mutation |
| Physical iOS/Android installation, manual screen readers | NOT TESTED | owner-supported device/browser matrix required |

Browser mocks establish UI/network behavior; actual local SQL/HTTP establishes server constraints. Neither replaces real SMTP/OAuth/TOTP/recovery/provider integration. New-page reopening in the same browser context demonstrates worker navigation restart, not an OS-installed app relaunch.

The interrupted-save browser fixture aborts the POST before recording a synthetic row. It verifies no reconnect resubmission and the check-records instruction; it does not prove a managed server's accepted-write/lost-response path. Real-provider staging must exercise that path and reconcile the exact row/request identity before any customer-launch decision.

Performance is measured, not optimized speculatively. The focused source-package build measured 42 public precache files, approximately 1.83 MB raw / 696 kB separately gzipped, and 9.052 seconds in the focused Vite build and 13.099 seconds in the final rehearsal on this host. The later sample is slower; shared-host measurements do not establish a speed improvement. The final candidate has 42 public files, 1,835,630 raw bytes and 697,330 separately gzipped bytes. Compared with the earlier focused candidate, the added validation/label copy increases the cache inventory by 2,834 raw / 941 gzipped bytes. This inventory includes fonts/public chunks, not financial records. Browser caches store decoded resources; summed gzip is transfer estimate, not cache footprint or a field-performance metric. Final receipt records the current candidate values. Mobile cold start, real bandwidth, field CWV and hosted FX/API latency remain launch gates. There is no speedup claim.

## 6. Current external evidence and blockers

Read-only Git remote verification resolved origin to `https://github.com/ismailabs/prism-finance-tracker.git`, advertised main `819ddef0e8a3b9aad07475ff495152e4d2ea9156`. This differs from historical prompt identity assumptions; do not publish to a guessed repository. The GitHub connector could not bind a repository lookup and gh is unavailable. No fresh candidate remote CI exists; the earlier failed workflow must not be relabeled green. The modified workflow is locally proposed; Linux runtime and its 45-minute timeout are unverified.

Read-only Vercel metadata identified project `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr` / name prism / team `team_y1FMLs1LWgVb2dOvegEGYVkf`. Latest recorded Production deployment `dpl_5tKmFadGtfrFRfaoL88dtmJruBSJ` was READY, region iad1, Node 24, CLI source, branch metadata `codex/financial-foundations`, SHA `e46822f5d04c8d5c3d93419c27b3a2214621c814`. Returned aliases included prism-finance-tracker.vercel.app and prism-finance-app.vercel.app. The historical custom domain prism.ismailstudio.my was not in that response and is not accepted as verified. Metadata is a point-in-time read, not a deployed functional/security test.

Supabase Studio had no selected connection (`link_id` required), so no live advisors, policy/grant catalogue, password setting, Auth URLs/providers, Storage, Realtime or migration receipt refresh was possible. Do not use another connected project as a substitute. Production ref `hyhsppiitijkuvpyswce` is historical identity requiring operator confirmation, never a mutation target in this task.

The current Supabase changelog and PostgreSQL 15.19/17.11 breaking-change notice were consulted; staging must verify its actual version/extensions/operators before a restore or migration. Local PostgreSQL 18 is not a substitute for that managed compatibility check. [Supabase PostgreSQL release notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

The native Computer browser attachment timed out; no successful interactive Computer inspection is claimed. Actual Playwright browser evidence and independently viewed screenshots support local visual findings. No native app-control workaround was used.

Remaining dependency advisories involve braces/chokidar/fast-glob/micromatch/postcss-nested/postcss-selector-parser/tailwindcss in the Tailwind 3 build chain: five high, two moderate, zero critical, zero runtime. Source-map-js was patchable and repaired. The audit's remaining fix route requires a Tailwind major transition; the current registry has no safe braces 3 patch. Risk is controlled trusted build input, not a publicly reachable runtime path in this app. Treat the residual as P2 build-supply-chain risk requiring owner review before launch, not as a clean full audit or an excuse to expose untrusted build inputs. No blind force upgrade or ignored audit was performed.

## 7. Staging prerequisites and migration sequencing

**Phase 7 adds/changes no SQL migration.** It requires the already accepted 17-file Phases 1–5 schema and Phase 6 report contracts. Reconcile the actual hosted catalogue and timestamp aliases before proposing any missing forward additions. Never baseline/reset/replay the initial schema on an existing financial project or change migration history to make version numbers look equal.

After separate approval, the missing forward sequence must preserve dependency order:

1. Phase 1 `20261009162324_protect_debt_repayment_history.sql`.
2. Phase 2 `20261009220402_shadow_double_entry_ledger.sql`, shadow only, no guessed historical backfill.
3. Phase 3 `20261010021500_malaysia_profile_defaults.sql`, new profiles only.
4. Phase 4 `20261010024257_phase4_planning.sql`, no financial posting.
5. Phase 5 `20261010062259_phase5_connected_actions.sql`, exact goal/action semantics.

This list is not an assertion that every listed file is missing on today's production. Approved staging must verify all earlier prerequisite definitions, overloaded Auth deletion function, view invoker options, grants, private-schema exposure, provider/role identities, exact numeric text and default transaction isolation first. Apply only the target-specific approved missing manifest. See [Phase 2 staging rehearsal](phase2-staging-rehearsal.md), [ledger recovery](phase2-ledger-recovery.md) and each earlier phase handoff.

Required staging evidence: managed PostgreSQL/version compatibility; clean and target-upgrade parity; A/B synthetic owner isolation; real sessions and MFA aal1/aal2 transitions; logout/revocation/recovery; OAuth and SMTP; exact reports, MYR/JPY precision, timezone cutovers, imports/exports, confirmed deletion, budgets/debt/goals/actions/forecasts; Realtime permissions; worker/header/CSP/cache behavior; and migration-failure recovery. Synthetic users, financial writes and any restore target each require explicit approval. No production-data clone is implied.

Environment **names**, without reading values: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (public client only), optional server-only EXCHANGE_RATE_API_KEY; PRISM_E2E_BASE_URL/PRISM_E2E_STORAGE_STATE are gated hosted-test opt-ins and forbidden in local/CI fixture runs. Confirm Development/Preview/Production name parity privately with an approved operator. Staging must point to staging, production to the approved production ref. No new feature-flag service is introduced; emergency route disabling is a reviewed frontend change, not a guessed hosted flag.

Before any authorized hosted change, record a backup recovery point, retention/access controls, RPO/RTO proposal, operator and a separate restore target. Rehearse managed restore with the actual supported mechanism, compare schema/Auth/private/public/exact balances, reconcile journals/reversals and verify restored sessions/roles. Storage objects, secrets, SMTP/OAuth settings and integrations have independent recovery boundaries. Local cold-copy success does not remove this blocker.

### Leaked-password protection recommendation — proposed only

Refresh the advisor and current setting first. If supported by the approved project plan, recommend enabling leaked-password protection on isolated staging, with existing password policy recorded privately. Test accepted/rejected signup and password-change/reset copy in both languages, provider errors, recovery/MFA and impact on existing sign-in. Record the exact setting delta and owner approval before considering production. Do not imply it is already enabled. [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security).

Impact/rollback checklist: review supported plan/cost, communications and support load; establish a safe recovery route that preserves MFA; measure rejection/error rates without passwords; stop on an unexpected Auth regression; revert only the exact approved setting if a rollback is authorized; rerun recovery and account-isolation checks. Disabling protection does not erase exposure or change users' passwords. No live toggle was performed.

## 8. Release, rollback and incident plan — unexecuted

The separately authorized local checkpoint is recorded in section 11. A future approved release additionally needs non-force publication to the verified repository, green remote CI on the final checkpoint SHA and an approved staging deployment. The accepted engineering source is now an immutable local commit; that does not establish hosted readiness.

Planned commands/checkpoints for an approved operator, not commands executed by this task:

```powershell
# Local reviewed checkpoint (completed under separate local authorization):
git diff --check
git status --short
# Stage only the approved inventory; review cached diff and secret scan.
# Commit with a reviewed message file. Any push requires separate authorization
# and the deployment-trigger review in section 11 before publication.

# After explicit Vercel link/env/staging deployment approval:
vercel link --project prism --scope <approved-team-slug>
# Confirm returned project/team IDs and approved Preview env NAMES privately.
vercel deploy --dry --format=json
vercel deploy --scope <approved-team-slug>
vercel inspect <approved-preview-url> --scope <approved-team-slug>

# After staging + legal/device/restore gates and separate Production approval:
vercel deploy --prod --scope <approved-team-slug>
vercel inspect <approved-production-url> --scope <approved-team-slug>
```

Use the frozen reviewed source and the correct environment for each build. Do not promote a staging-linked Supabase client artifact to production. Migration application is a separately approved, target-specific manifest, not an unconditional `supabase db push` in this sequence. No command is authorized merely by appearing here.

At each checkpoint verify actual source SHA/target identities/schema compatibility, build env names, no secret/generated-file upload, immutable assets with correct MIME, worker no-cache/scope, HTML no-store, effective CSP/HSTS/no-referrer/frame/nosniff, HTTPS/domain redirects, `/api/rates` GET/405/error behavior, and complete critical finance/Auth/PWA smoke paths. Re-run worker install/update/restart/cache inspection and inspect provider denials through real client requests. Verify custom aliases rather than assuming them from history.

Frontend rollback: retain the prior known-good deployment ID/SHA and compatible environment/schema. After approval, select/rollback to that exact Vercel artifact, confirm aliases/headers and smoke tests, and test an existing installed client updating back to the rollback worker. This candidate introduces a worker where an older artifact may have none: rollback may leave a registration and harmless public caches until replaced/cleared. Prepare a reviewed recovery worker/tombstone at /sw.js if needed; explicitly verify browser/installed-client recovery. Never assume an origin rollback instantly removes all workers.

Database rollback: a Vercel rollback cannot reverse committed financial writes. Stop further affected writes, preserve receipts and audit evidence, reconcile exact native balances and source/journal history, then choose an approved forward fix or controlled restore with accepted-command replay. Do not drop ledger/planning/action tables or rewrite posted entries as a rollback. A restore can lose accepted writes after its recovery point and may require session/key/provider recovery; document this before execution.

Privacy-preserving observability: no new remote logging or integration was activated. Proposed event fields are random incident ID, coarse route category, release SHA, sanitized error class/code, status, elapsed duration and timestamp. Exclude URLs/query strings, email/user/account IDs, amounts, descriptions, notes, CSV content, request bodies, tokens and Auth/QR secrets. Keep consent/access/retention reviewed. Local test traces are synthetic; hosted traces need a different restricted capture/redaction policy.

Proposed measurable release thresholds: zero exact-money/reconciliation/owner-isolation failures; immediate release stop on any private cache hit or duplicate mutation; no critical-journey blocker in the approved staging matrix. Availability/latency SLOs, alert thresholds, RPO/RTO and support response targets remain owner proposals until hosted instrumentation and measurements exist. Do not invent uptime or customer support guarantees.

Incident flow: show safe outage/retry copy and the interrupted-save check-records instruction; assign an incident owner; contain affected writes/access; preserve redacted operational evidence; classify financial/privacy impact; involve the designated security/legal owner; prepare approved customer/regulator communications; recover and reconcile; run the acceptance matrix; document cause and regressions. No external notifications are enabled or sent.

## 9. Malaysian privacy and customer launch review

Current official source review found a dedicated breach-notification guideline, cross-border guidance and DPO applicability process. PRISM must have a qualified owner/legal review of its actual commercial data-controller/processor role; app tests cannot establish legal compliance. The cross-border guideline addresses transfer conditions, notice, processor diligence and records, so map actual provider destinations/recipients before approving a notice. [Official cross-border guideline](https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2025/08/GP_CBPDT_EN-1.pdf).

The official DPO registration process asks about scale of personal/financial data and systematic monitoring. Assess applicability against the actual service and current circular rather than asserting a small-app exemption. [Official DPO process](https://daftar.pdp.gov.my/v1/dpo-register). The official DBN guidance/form must inform incident classification, reporting timelines and affected-person notification; the large guideline PDF could not be fully fetched here, so legal approval of those deadlines remains open. [DBN guideline page](https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-guidelines-on-data-breach-notification-dbn/), [official notification form](https://daftar.pdp.gov.my/v1/dbn).

Before inviting customers, the owner must approve an English/Malay privacy notice with actual controller/contact identity, purposes/data categories, consent/choices, processors/locations/transfers, access/correction/export/deletion channels, retention and backup deletion limits, Auth/analytics storage disclosures, incident contact and complaint path. No invented controller, email, legal text, PDPA badge or government endorsement is added.

Product scope remains recordkeeping and scenario planning, with explicit observed/projected/estimated distinctions; no bank feeds, funds custody, trade execution or claim of licensed advice. Qualified review must determine financial-advice/consumer applicability for actual features and marketing. BNM separately regulates approved financial intermediaries; that does not establish this app's classification. [BNM market-conduct guidance](https://www.bnm.gov.my/web/guest/market-conduct).

### Customer-launch gate checklist

| Gate | Status | Required evidence / owner |
| --- | --- | --- |
| Exact finance, reconciliation, immutable shadow journal, planning separation | Verified locally; hosted NOT TESTED | final local receipts then managed synthetic reconciliation |
| Owner/session/MFA/Auth deletion/export/import boundaries | Verified locally; hosted NOT TESTED | real provider Auth/MFA/recovery and A/B users |
| Local worker/cache/offline/update behavior | Verified locally | production-worker browser + independent cache oracle |
| iOS/Android install/standalone/update/restart | NOT TESTED | physical supported-device matrix below |
| EN/MS critical journeys and automated accessibility/reflow | Verified locally | full suite + responsive + targeted axe |
| Manual screen readers, zoom, standalone keyboard/touch | NOT TESTED | NVDA/VoiceOver/TalkBack human acceptance |
| Managed backup/restore and incident ownership | REQUIRES OWNER APPROVAL | separate restore target, measured recovery and reconciliation |
| Privacy notice, retention, cross-border, DBN/DPO/advice scope | REQUIRES OWNER/LEGAL APPROVAL | actual data map and approved bilingual notices |
| Password warning, live advisors/grants/private exposure | NOT TESTED / REQUIRES OWNER APPROVAL | read-only refresh, reviewed setting delta and staged test |
| Dependency residuals, CI/Linux and frozen commit | REQUIRES OWNER REVIEW | controlled build inputs, reviewed update path, remote CI on SHA |
| Actual Vercel headers/FX/aliases/provider env parity | NOT TESTED | approved staging then separately approved production smoke |
| Support/incident contacts, monitoring and measurable SLOs | REQUIRES OWNER APPROVAL | staffed contacts and approved privacy-safe instrumentation |
| Truthful public claims and customer launch | NO-GO | all relevant hosted/device/legal/operational gates above |

### Manual platform acceptance, unperformed

On approved Android Chrome and desktop Chromium: open HTTPS staging, inspect manifest/installability, install from prompt/menu, launch standalone, sign in with synthetic owner A, perform one exact transaction, test airplane mode while idle and during an uncertain save, close/reopen offline, reconnect/check server records, reject/accept an update with an unsaved form and a pending write, sign out/switch to B, and inspect caches/IndexedDB/network. Confirm no A records/tokens in worker caches and no replayed financial request.

On approved iOS Safari: repeat through Share → Add to Home Screen and standalone launch; verify safe-area/short-height/touch targets, external OAuth return, email recovery/MFA, restart, offline fallback and delayed worker update. On browsers lacking an install event, confirm menu instructions and ordinary web operation. Real provider account creation/writes remain staging-only and explicitly approved.

Accessibility manual pass: keyboard each critical route/dialog/menu/table, 200/400% zoom and dynamic text, light/dark/high contrast/reduced motion, screen-reader labels/chart equivalents/error announcements and focus return. Record device/OS/browser/assistive-tech version and actual pass/fail; emulated widths or axe alone do not fill these rows.

## 10. Final local acceptance and next gate

**Final local decision: GO for scoped Phase 7 local acceptance. No known unresolved locally actionable P0/P1 remains.** The fresh serial suite passed, including all 122 normal browser cases, five real-worker cases and 163 unit tests. Independent regressions passed. Its unchanged engineering hashes and complete inventory are bound in the JSON receipts; the original checkout/Phase 6 branch/17 migrations remain preserved. External launch stays NO-GO even if local Phase 7 is GO.

The user authorized the reviewed local checkpoint after this acceptance run. The next packet is the checkpoint and controlled validation plan below. Publication, linked source-manifest/staging setup, hosted migrations/users/data, Auth settings, deployment and production launch each need their own explicit scope/target/recovery approval; none follows from local acceptance or checkpointing.

## 11. Final Phases 1–7 checkpoint and release-candidate handoff

### Checkpoint identity, review and evidence applicability

The final checkpoint review matched exactly **54 files: 51 engineering/configuration/test/tooling paths and three documentation paths**, all listed in section 2 and `phase7-changed-files.json`. It rechecked the required branch/base, all accepted ancestor commits, the original inventory's normalized hashes, all 248 frozen engineering raw hashes and the unchanged 17 migrations. All other eleven worktrees had clean tracked/untracked status and their recorded HEADs are preserved. No environment values, generated builds, database clusters, traces, screenshots, dependencies or unrelated changes are staged.

| Checkpoint | Identity |
| --- | --- |
| Exact Phases 1–6 parent | `07901a6dabfa4696be25468f6de687c7619d171d` |
| Phase 7 engineering and regressions | `7b85d9f670240019c044c22ebfa3a80adf034b98` — `feat(readiness): add privacy-safe PWA and bilingual hardening`; 51 reviewed paths; direct child of the required parent |
| Final Phases 1–7 HEAD | The following local documentation commit, containing exactly the three documentation paths. Resolve `git rev-parse codex/phase7-readiness`; its full SHA, parent, tree, committed inventory and clean status are recorded in ignored `artifacts/phase7/checkpoint/final-report.json` and the final response. A commit cannot embed its own hash without changing that hash. |
| Pre-checkpoint approved manifest | Raw SHA-256 `acea617b3a3b6ac97d089dc8c0d64a97a8367c113b641329b4f6f7b73c80eaa3`; all 54 originals retained under ignored `artifacts/phase7/checkpoint/approved-inputs/` |
| Final portable records | This handoff, the 54-path normalized hash inventory, and `phase7-verification.json`; only these originally reviewed documentation paths are updated during checkpointing |

The fresh redacted Gitleaks scan covers the full candidate source copy; staged engineering and staged documentation are scanned separately. Staged files must have ordinary 100644 mode and exact UTF-8/LF Git bytes matching their reviewed normalized hashes. Whitespace and allowlist checks precede each commit. Git's configured CRLF normalization does not change accepted behavior. Independent review remains the separate audit/oracle passes described in section 3, performed by the same agent; no additional human or agent review is claimed.

**No acceptance suite repetition is required merely to commit these bytes.** All 248 non-document inputs are still byte-identical to `gates-1791642386749/inputs.json`; final Git blobs are compared with those inputs, allowing only Git text newline normalization. The engineering commit and final documentation commit therefore retain the **same 30 passing gates, 163 unit tests, 122 full browser cases including the final Phase 6 table, five real-worker cases, 481 responsive checks, 1,000 closed-form money cases and 28 restored tables**. Checkpoint verification repeats inventory/hash/ancestry/whitespace/secrets/isolation checks; it does not describe the older full suite as a fresh post-commit run. Documentation changes introduce no source, dependency, configuration or test changes. Any later change invalidating a relevant input requires corresponding retests; remote Linux CI, hosted environments and physical devices require their own evidence regardless of local hashes.

Ignored original receipts/logs remain local and are not included in the Git source package. The portable summary retains commands, outcomes, evidence paths and source-binding digests; a future remote CI run must reproduce the checks on the published final SHA. Preflight/finalize scripts that require the original clean Phase 6 HEAD are baseline tools, not post-commit acceptance commands. Do not run them against this checkpoint and mislabel their intentional base assertion as a product regression.

### Seven-phase scope and preserved authority

| Phase | Accepted implementation carried by this candidate | Evidence and boundary |
| --- | --- | --- |
| 1 | Exact reads, future-progress exclusions, repayment-history protection and stabilization | `phase1-stabilization.md`; current complete finance/browser gates repeat the behavior |
| 2 | Balanced immutable shadow journals, reversals, exact timestamp translation and historical reconciliation | `phase2-accounting.md`, ADR/recovery/staging records; ambiguous history remains an exception; no ledger cutover/backfill |
| 3 | Public bilingual identity, isolated synthetic demo, guarded routing, onboarding and Malaysia defaults | `phase3-finance-ux.md`; existing preferences/history retained; real Auth providers remain unverified |
| 4 | Exact budgets, reserves, debt scenarios and repayment previews | `phase4-budgeting-debt.md`; planning creates no authoritative balance/posting |
| 5 | Connected goals, plain-text notes, reminders, occurrence receipts, calendar and timeline | `phase5-actions.md`; current SQL/native/browser suites; notes/reminders never move money |
| 6 | Exact analytics, operating-surplus contracts, cash/recurrence forecasts and readable responsive tables | `phase6-local-acceptance.md`, metric contracts and review; fresh 122-case full browser suite includes the last table change |
| 7 | Public-only PWA, explicit updates/offline rejection, safe EN/MS errors, headers/build validation and release rehearsals | Sections 2–5 and final source-bound 30-gate receipt; no financial offline storage or automatic write replay |

The earlier Phases 2–4 work was content-integrated at the accepted checkpoint; their separate worktree tips are not claimed as merged ancestors. Exact decimal text/bigint arithmetic, per-currency totals, timezone boundaries, ownership/session/MFA/RLS, historical protection and shadow-ledger reconciliation are retained. Local fixtures reconcile; existing production financial history has not been inspected or certified.

### Complete migration inventory and target-specific prerequisites

All 17 normalized migration hashes are included in the checkpoint JSON inventory. The status below is inherited documented history, **not a fresh hosted catalogue**. Twelve files represent the earlier baseline/known applied chain; five are documented unapplied local proposals. A verified target catalogue may differ. Phase 6 and Phase 7 add zero migrations. The chronological sequence below is the validated replay order; it does not assert that every migration has a direct SQL dependency on every earlier phase.

| Migration | Documented status / dependencies |
| --- | --- |
| `20260928000200_initial_finance_tracker.sql` | Empty-project baseline; live tables predated tracking. Requires managed Auth roles/functions. Never replay on the existing project. |
| `20260928031516_personal_finance_platform.sql` | Historically applied; baseline tables/ownership/session controls; adds accounts/objectives/debts and relationships. |
| `20260928032448_exact_money_validation.sql` | Historically applied; platform numeric columns and milestones; exact precision validation. |
| `20260928043611_focused_crud_integrity.sql` | Historically applied as remote `20260928081917`; financial relationships and confirmed Auth self-deletion. |
| `20260928082016_harden_self_delete_rpc.sql` | Historically applied as remote `20260928082111`; preceding self-delete RPC/private schema. |
| `20260930135217_financial_foundations.sql` | Historically applied; existing platform/session controls; timezone/transfers/exact invoker views. |
| `20260930135222_reporting_and_planning.sql` | Historically applied; foundations transfers/exact contracts; budgets/recurrences/import/page RPCs. |
| `20260930135716_financial_relationship_indexes.sql` | Historically applied; relationship tables/indexes created by the preceding two files. |
| `20260930141104_canonical_financial_transport.sql` | Historically applied; exact views from foundations/reporting; canonical currency text without stored-money rewrite. |
| `20261001033902_analytics_drilldown_filters.sql` | Historically applied as remote `20261001035741`; existing reporting/page RPCs. |
| `20261001083346_period_analytics_preferences.sql` | Historically applied; profiles and exact reporting, timezone/session/MFA and invoker grants. |
| `20261001083350_present_financial_progress.sql` | Historically applied; existing contribution/repayment progress views; excludes future contributions. |
| `20261009162324_protect_debt_repayment_history.sql` | **Documented unapplied, Phase 1**; platform debts/repayments, private schema and confirmed self-deletion contract. |
| `20261009220402_shadow_double_entry_ledger.sql` | **Documented unapplied, Phase 2**; accounts/objectives/native currency and existing private session/MFA controls; new shadow ledger, no guessed postings. |
| `20261010021500_malaysia_profile_defaults.sql` | **Documented unapplied, Phase 3**; existing profile/signup trigger and foundation timezone column; future profiles only. |
| `20261010024257_phase4_planning.sql` | **Documented unapplied, Phase 4**; reporting budgets, accounts, debts/repayments, exact-money/session controls and historical protection; independent planning metadata, no ledger posting. |
| `20261010062259_phase5_connected_actions.sql` | **Documented unapplied, Phase 5**; accepted integration contracts for accounts/objectives/transfers/budgets/debts, exact contribution view, owner keys and session/MFA; notes/reminder links and contribution guards. |

An operator must compare schema definitions, privileges, view invoker options, Auth deletion overloads and migration receipts, including all three timestamp aliases. Never repair aliases simply to match local timestamps. On an empty authorized staging project, the clean chain uses all 17; on an existing target, approve only genuinely missing forward files after proving prerequisite parity. Rehearse the five proposed additions in the order above, preserve rows/checksums/preferences, and deploy the matching client only after its required schema exists. No baseline/reset, automatic production push or ledger backfill belongs in this plan.

### Remote CI and Vercel trigger controls

The workflow currently triggers on **push and pull_request**, runs read-only fixture verification on Ubuntu/Node 24 with a 45-minute job limit, and contains no Vercel deployment or hosted migration step. It pins checkout/setup/upload actions and rejects hosted-browser opt-ins. GitHub has not run this candidate. After separate publication approval, require the final SHA's complete green job, exact fixture isolation, native PostgREST/embedded PostgreSQL behavior, browser/PWA/restore/localization gates, no missing/skip-required coverage and a reviewed dependency audit. The fixture build is test evidence and must never be promoted to a customer environment.

Before any push, inspect the actual connected repository, production branch, per-branch Git deployment controls, Preview/custom environment mapping, ignored-build command, deploy hooks, auto-aliasing and required deployment checks. A Git-integrated Vercel project can deploy on a branch push and release a successful production-branch build; passing GitHub CI alone does not establish that automatic promotion is gated. These project-specific settings remain unknown. The fresh read-only plugin response reconfirmed the expected project/team, Vite and Node 24, but did not include Git linkage or deployment-trigger settings. [Vercel Git triggers](https://vercel.com/docs/git), [deployment checks](https://vercel.com/docs/deployment-checks).

Propose an approved isolated staging environment/project with synthetic Supabase, protected access and explicit promotion control. Record source SHA, actual source manifest, Node/build/output settings, environment **names** and provider origin. Retain staging-specific artifacts separately; a production build must use the approved production environment. Inspect actual deployed headers/routing/worker assets/API/aliases and worker update behavior; the local regex/header fixture is not authoritative Vercel routing evidence. Do not assume the historical custom domain, main branch or a CLI deployment's metadata proves current integration settings. Configuring deployment checks or disabling triggers requires separate authorization.

### Hosted Supabase, backup and restore validation

Approve explicit project/ref/region/version, cost, operator, synthetic user/write scope and separate restore destination first. Refresh migration catalogue, advisors, grants/exposed schemas, invoker views, session predicate, MFA, Storage and Realtime settings read-only; review leaked-password settings without toggling them. Compare managed PostgreSQL behavior with the validated local chain, including the current version/extension compatibility notice. Hosted staging must test real A/B users, SMTP/OAuth/recovery, aal transitions/revocation, exact HTTP text/count headers, financial concurrency/import/export/history and accepted-write/lost-response reconciliation. Rehearse missing additions and injected-failure recovery on disposable approved targets before a release change.

For recovery, record a supported backup/PITR mechanism, actual recoverable timestamp and retention, restricted operators, approved RPO/RTO and permitted downtime. Capture schema/migration/roles and exact per-currency/source/journal fingerprints; preserve accepted request receipts after the recovery point. Restore into the separately approved destination using the provider-supported version-compatible process, then compare all public/Auth/private definitions and exact row/balance fingerprints, replay only verified accepted commands, and recheck ownership/session/MFA and reconciliation before resuming writes. Measure elapsed recovery and losses; do not call the local cold-copy duration an RTO. Include sign-in/session/provider recovery and verify custom-role credentials privately. Database backups do not include Storage objects, and custom-role passwords have separate recovery requirements; plan Storage and provider configuration recovery separately. [Supabase backup boundaries](https://supabase.com/docs/guides/platform/backups).

No production clone, hosted backup execution, restoration, migration, account creation or setting change has been performed. A backup existing in a dashboard is insufficient without a measured restore and finance reconciliation on the approved target.

### Remaining issues, severity and blocking classification

“Entry” means accepting this local checkpoint for controlled validation planning. “Launch” includes customer production approval; no row authorizes an external action. **There is no known unresolved local implementation P0/P1.** Unverified external security/financial controls are blocking evidence gaps, not proven defects.

| Issue | Entry classification | Release/launch classification and evidence |
| --- | --- | --- |
| Actual Git/Vercel trigger settings and target identity | Nonblocking for local entry; **blocks any publication** | Blocking until verified and separately authorized; project response omits linkage/settings, worktree unlinked. |
| Final-SHA remote CI, Linux native/browser runtime and 45-minute limit | Nonblocking | Blocking until full job passes on exact final SHA; current evidence is Windows/Edge only; prior CI failure is not green. |
| Hosted migration catalogue/aliases and five proposals | Nonblocking | Blocking matched-client rollout until target-specific manifest/parity/rehearsal accepted; no current Studio connection. |
| Real Auth/session/MFA/RLS/grants/Storage/Realtime/provider boundaries | Nonblocking | Blocking launch; synthetic/native controls pass, managed provider behavior remains unverified. |
| Managed backup/restore, PITR, version compatibility and RPO/RTO | Nonblocking | Blocking hosted changes/launch; only PostgreSQL 18 same-version synthetic cold restore is proven. |
| Vercel headers/CSP/API/routing/env/aliases and deployed cache/update behavior | Nonblocking | Blocking launch; local package/server probes pass, actual hosting behavior unverified. |
| Physical iOS/Android/desktop install, standalone OAuth/restart/uncertain save/update | Nonblocking | Blocking advertised PWA launch; five worker cases are browser automation, not real OS/device acceptance. |
| Human EN/MS, keyboard/zoom/high-contrast and NVDA/VoiceOver/TalkBack review | Nonblocking | Blocking customer acceptance; 481 layouts/resource/literal/axe checks are automated evidence only. |
| Malaysian notice/controller/data map/retention/cross-border/DBN/DPO/advice applicability | Nonblocking | Blocking customer launch pending owner/qualified legal sign-off; section 9 records sources and unreviewed deadlines. |
| Operational ownership, incident/contact/support, privacy-safe monitoring and approved thresholds | Nonblocking | Blocking launch; proposed plans are unexecuted, no staffed SLA or measured availability claimed. |
| Seven dependency findings: five high/two moderate, zero runtime | Nonblocking P2 with trusted build inputs | Blocking launch risk sign-off/remediation decision; retain exact advisory receipt, review safe upgrade path and repeat affected checks; no automatic major upgrade. |
| Complete-read scaling, mobile cold start/field performance and cross-query snapshot consistency | Nonblocking documented limitation | Blocking launch capacity decision until representative synthetic size/network measurements and permitted operating envelope are accepted; no transactional as-of or field CWV claim. |
| Shadow ledger/partial position: unavailable complete assets/liabilities/net-worth/history/FX | Nonblocking intentional scope | Nonblocking for truthful recordkeeping/scenario release; blocking any claim of complete accounting/valuation or ledger cutover; metric/UI unavailable states preserve this boundary. |
| Forecast horizon/backlog limits, unmapped assumptions, unknown APR/splits and overlap of plans/rules | Nonblocking intentional scope | Nonblocking with current disclosed unavailable/excluded states; no payoff inference, bank integration or autonomous financial posting claimed. |
| Session tokens in SDK localStorage, safe fallback for unknown errors, no private offline finance | Nonblocking reviewed design | Nonblocking with threat/storage disclosure and supported online operation; any hosted privacy leak, retry duplication or session bypass becomes an immediate release stop. |
| No separate external/human security auditor | Nonblocking; evidence-level independent review only | Nonblocking unless owner policy requires formal audit; never advertise local verification as certification. |

Dependency risk disposition must name an owner and constraints (trusted source/globs, controlled builders, no customer-supplied build patterns), cite the retained advisory IDs and define a remediation date or approved deferral. Refresh the audit before release because the current receipt is a point-in-time result. Informational legacy table/index advice remains nonblocking only while the schema stays private/unexposed and measured performance does not justify a change. Complete financial reports remain unavailable rather than fabricated when sources are missing or denied.

### Stop/rollback conditions and next release-validation sequence

Immediately stop the validation/release progression on any owner/session/MFA bypass, sensitive worker/browser/HTTP cache exposure, leaked secret, changed financial history, precision/currency/reconciliation mismatch, duplicate/offline-resubmitted write, failed critical journey, incompatible schema, unverified source/target or restore failure. Preserve evidence and accepted receipts; do not conceal a failed gate with an empty UI or reclassified skip. An unexpected provider/version/advisory change requires a reviewed impact decision before continuing.

Frontend recovery uses an approved compatible prior artifact and validates aliases, headers and installed clients; prepare/test a recovery worker where an older deployment lacks `/sw.js`. Database recovery preserves immutable posted history and uses approved forward fixes or a rehearsed restore plus verified accepted-command replay. Pausing affected writes/routes is preferable to destructive table drops; no browser redeploy can undo financial writes. The incident operator must account for recovery-point losses and Auth/Storage/provider state as described above and in the Phase 2 recovery runbook.

Recommended sequence, **not executed or authorized by this checkpoint**:

1. Review this exact final local SHA and blocking matrix. Approve a bounded read-only target/trigger/catalogue refresh and a release-validation owner, environments and budget. Complete the publication-trigger review before asking for push authorization.
2. Obtain separate non-force publication approval, publish only the reviewed branch to the verified repository, and require full remote CI on that SHA. Any automatically triggered deployment must already be within the approved scope; otherwise do not push. No main merge or PR is implied.
3. Approve isolated synthetic Supabase staging and a separate restore destination. Resolve catalogue aliases/prerequisites, record the recovery point/manifest, rehearse managed backup/restore and only missing forward migrations. Accept schema, exact finance, real Auth/MFA/RLS/provider and failure-recovery evidence.
4. Approve a protected staging Vercel deployment using the matched schema and staging env. Verify actual source/deployed SHA, package, headers/API/CSP/cache/update/privacy and all seven-phase critical journeys, including accepted-write/lost-response reconciliation and the final Phase 6 table.
5. Complete physical-device/assistive-tech/bilingual acceptance and representative capacity measurements. Obtain documented dependency, security, privacy/legal and operational decisions; resolve each blocking row with evidence.
6. Produce a new release decision for the tested SHA/targets/schema. Production deployment/migrations/data operations, merging main and customer launch each require explicit later authorization and independent acceptance; any source/env/schema change requires relevant revalidation.

**GO to enter controlled release validation with this local checkpoint. NO-GO for production readiness or public launch.** The next externally actionable step remains a separately scoped authorization, never an inference from this GO.
