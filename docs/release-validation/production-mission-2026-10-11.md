# PRISM production mission — 11 October 2026

**PRISM PRODUCTION RELEASE: NO-GO — BLOCKED.** The new release has not been promoted or deployed. One narrow hosted security repair was completed safely. The existing public application remains available; its availability does not qualify the new release.

Authority: the user's current production-release request and all 1,095 lines of `C:/Users/moham/OneDrive/Desktop/notes/prompt.md`, read completely. This mission starts from `27ff892b16f7e1015b693b885f1b85e60d0d365f` in the existing `codex/phase7-readiness` worktree. Its explicit conditional authorization supersedes earlier mission-specific prohibitions. Mandatory recovery, hosted authorization and human acceptance conditions still apply. Budget RM0.

## Actual production state

| Item | Freshly observed evidence |
|---|---|
| Repository | Private `ismailabs/prism`, ID `1392802844`; legacy origin name resolves to the same repository |
| Remote release branch | `27ff892b16f7e1015b693b885f1b85e60d0d365f` |
| Remote/main checkout | `819ddef0e8a3b9aad07475ff495152e4d2ea9156`; ancestor of the release; preserved |
| Vercel | `prism`, `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr`, team `ismailstudio`, `team_y1FMLs1LWgVb2dOvegEGYVkf`; Hobby confirmed in current dashboard |
| Git deployment controls | Current dashboard: Production tracks `main`, custom domains auto-assign; Preview branch tracking disabled; no deploy hooks |
| Live custom domain | [prism.ismailstudio.my](https://prism.ismailstudio.my/), verified and assigned to the correct project |
| Existing production deployment | `dpl_5tKmFadGtfrFRfaoL88dtmJruBSJ`, READY, created 1 October 2026; provider metadata records Git SHA `e46822f5d04c8d5c3d93419c27b3a2214621c814`, branch `codex/financial-foundations`, CLI source |
| Supabase | `hyhsppiitijkuvpyswce`, PRISM, ACTIVE_HEALTHY, `ap-northeast-1`, PostgreSQL `17.6.1.166`, organization `zwgtqvqlmcwbjssyoysv`, Free |
| New production deployment | None. No main update, branch push, PR, alias change, new deployment or paid resource was made in this mission |

Read-only live smoke at 14:04 UTC: `/` and `/auth` returned 200 HTML; the manifest returned the correct manifest MIME. The old `/sw.js` returns the HTML app shell, not a service-worker script. The new Phase 7 public-only offline/update behavior is therefore not live. Existing frame denial, nosniff, HSTS and CSP headers were present; old HTML cache/referrer headers differ from the release candidate. EN/MS authentication rendering worked in the browser; the captured console warning/error list was empty. This did not test an authenticated financial journey.

At 14:30 UTC, seven public JavaScript assets referenced by the entry bundle returned 200. The expected Supabase URL and only an anon-role embedded JWT were observed in `useFinancialReports-BehsO4Cm.js`; the first entry chunk alone does not contain the URL. This is bounded public-bundle evidence, not a claim that every possible asset or runtime secret path was audited. The project-specific public Auth settings endpoint returned 200 with email/Google enabled, signups enabled and mail autoconfirm disabled. Zero-limit profile requests without credentials and with the public anon key returned 401. No customer records, test Auth accounts or hosted RPC calls were used for these smoke checks.

## Hosted deletion repair — completed

Before repair, the private zero-argument SECURITY DEFINER function was owned by postgres, had an empty search path, and allowed authenticated EXECUTE. Anon was denied. Its own-user/session guard was present, but the overload did not require explicit text confirmation. The public/private text overloads independently enforce `DELETE` and current-session/MFA checks; the public text wrapper does not call the zero-argument helper. Catalog dependency inspection and source review found no required confirmed-path dependency on it.

Fresh bounded catalog transactions established read-only mode for inspection and rolled back. Application roles were not superuser/BYPASSRLS and had no additional inherited, SET-only or ADMIN authority that could restore this helper access. Authenticator retained its normal application-role SET memberships. The later dashboard inspection confirmed that only `public` and `graphql_public` are exposed; `prism_private` is excluded. No schema exposure setting was changed, and absence of `pgrst.db_schemas` was never treated as exclusion proof.

The exact reviewed [private-deletion-revoke.sql](private-deletion-revoke.sql) was applied as a bounded transactional ACL repair, including its inherited/SET/ADMIN and confirmed-text contract guards:

```sql
revoke execute on function prism_private.delete_own_account()
from public, anon, authenticated;
```

This DCL operation changed no function body, row, table, policy, role membership or migration receipt. It was not represented as one of the five pending schema migrations. A pre-change ACL/catalog snapshot and freshly tested PG17 transaction failure/rollback/retry behavior supplied recovery safeguards for this metadata-only operation; no production customer-data backup is claimed. Automatically restoring the unsafe grant is not an approved rollback.

Independent before/after checks at 13:58:47/13:59:26 UTC verified:

| Signature | Authenticated before / after | Anon before / after | Definition / behavior evidence |
|---|---|---|---|
| `prism_private.delete_own_account()` | true / false | false / false | MD5 `b50fb8f3268d5e67e201a87ffdfa2e9c` unchanged; ACL becomes postgres-only |
| `public.delete_own_account(text)` | true / true | false / false | MD5 `3d87491927e3729eb8cd0d1c84fa728c` unchanged; invoker wrapper retained |
| `prism_private.delete_own_account(text)` | true / true | false / false | MD5 `8b53eaf22168ee32eafc5acd92b5cb12` unchanged; explicit confirmation retained |

Unrelated function, relation/ACL, policy and role-membership fingerprints remained identical. Ten security groups passed a fresh disposable PG17.11 replay before repair, including indirect/SET/ADMIN denial, guard-triggered atomic rollback, repeat repair and confirmed own deletion preserving another synthetic user. These were local tests. **No hosted deletion function was invoked.** A final read-only check at 14:30:56 UTC reconfirmed denial of the zero-argument overload, preserved text grants, RLS on all PRISM base tables and exactly eleven historical hosted migration receipts.

Current security advisor observations: the private `report_reservations` table has RLS and no policy, consistent with its postgres-only client ACL; leaked-password protection is disabled. The latter remains an unresolved hosted hardening/risk disposition item: the documented feature requires Pro or above and cannot be enabled under RM0. No paid Auth feature or provider patch was enabled. [Supabase password-security guidance](https://supabase.com/docs/guides/auth/password-security).

## Database reconciliation and prepared upgrade

All seventeen committed migration files remain byte-for-byte unchanged. The local initial baseline represents pre-existing hosted schema and has no equivalent hosted receipt; it must not be replayed. Eleven existing hosted receipts were inspected with stored SQL fingerprints. These three historical aliases are retained:

| Local version | Hosted receipt | Name |
|---|---|---|
| `20260928043611` | `20260928081917` | focused_crud_integrity |
| `20260928082016` | `20260928082111` | harden_self_delete_rpc |
| `20261001033902` | `20261001035741` | analytics_drilldown_filters |

Stored SQL comparison accounts for LF/trim, formatting/comments and the outer transaction wrappers omitted by the first two receipts. Three latest receipt strings match after LF/trim; six other historical files match after comments/whitespace normalization; the first two also match after outer BEGIN/COMMIT removal. Normalized comparison is not raw checksum identity. No historical receipt or migration file was reset, renamed, rewritten or replayed.

Catalog-only comparison with the local twelve-file historical replay identified 260 matching common column definitions, eight matching non-internal PRISM triggers, an extra private hosted `report_reservations` table, original constraint naming/`char_length` variations, managed `rls_auto_enable`, original baseline helper definitions and extra service-role grants on public RPCs. The local baseline is not a literal managed-project clone. Confirmed-text definitions match; existing session/MFA and original Auth trigger functions were read and reviewed without accessing Auth-user contents. These differences are recorded, not silently normalized into purported full parity.

The five required forward proposals were reviewed in dependency order and rehearsed freshly on isolated PostgreSQL 17.11 with synthetic users, four native currencies, amounts beyond IEEE-754 safe integer precision, and six-digit timestamp boundaries:

| File/version | Upgrade impact | Fresh rehearsal |
|---|---|---|
| `20261009162324_protect_debt_repayment_history.sql` | Protect repayment history with invoker trigger | PASS |
| `20261009220402_shadow_double_entry_ledger.sql` | New shadow ledger structures; legacy authority preserved | PASS |
| `20261010021500_malaysia_profile_defaults.sql` | Future-profile MYR/Malaysia defaults and profile trigger | PASS |
| `20261010024257_phase4_planning.sql` | Planning columns, reserves/debt structures and exact views | PASS |
| `20261010062259_phase5_connected_actions.sql` | Connected actions, preferences/receipts and contribution structures | PASS |

For each proposal, an injected pre-COMMIT failure rolled back catalog and synthetic row changes; the original then applied successfully and conserved pre-existing synthetic rows/exact amounts. Fifteen fixture tables were included in row conservation; `monthly_budgets` was explicitly excluded from that whole-row hash because the proposal changes its columns. This receipt does not certify every customer table. The defaults/function proposal was idempotent; other retries rejected duplicate DDL atomically, requiring resume by verified receipt rather than blind replay. The first run's mistaken blanket duplicate-DDL expectation was corrected for that idempotent proposal; the successful rerun is the accepted result. Accepted broader integration/restore suites supply separate budget and financial evidence.

**None of the five was applied to production.** The candidate expects the upgraded schema. Deploying it against the present schema would fail a mandatory requirement. Native PG17.11 tests also do not prove hosted PG17.6 extension/Auth parity; an actual private backup/restore target must resolve that before execution. New tables/views/functions and budget defaults require bounded lock/statement windows and verified before/after receipts. After commit, prefer a reviewed forward correction; dropping new financial tables or removing protections is not safe rollback.

An additional fresh PG17 catalog rehearsal measured relation locks while each exact migration body was open, before COMMIT. This establishes lock types on representative local schema, not hosted wait duration or downtime:

| Proposal | Existing relations with write/read contention | Required postconditions and old-client overlap |
|---|---|---|
| Debt repayment history | ShareRowExclusive on `person_debts` | Invoker delete trigger denies removal of debts with repayments; unrelated/empty-history deletion contract remains. An old UI attempting a prohibited deletion must receive denial |
| Shadow ledger | ShareRowExclusive on `auth.users`; AccessExclusive on new ledger tables/views | Five new tables with owner/session RLS and constrained posting/reversal/immutability APIs; exact invoker views; no legacy backfill or authority cutover. Existing client keeps legacy balances |
| Malaysia defaults | AccessExclusive on `profiles` | Defaults MYR/Asia_Kuala_Lumpur and reviewed future profile creation; existing profiles unchanged. Verify Auth trigger and EN/MS signup defaults |
| Phase 4 planning | AccessExclusive on `monthly_budgets`/`exact_monthly_budgets`; ShareRowExclusive on `auth.users`, `person_debts`, `debt_repayments` | Rollover/alert defaults preserve old budget values; two new planning tables/exact views; protected debt/repayment history. Preserve old exact view columns and legacy ownership/amount semantics |
| Phase 5 actions | AccessExclusive on `exact_objective_contributions`; ShareRowExclusive on `auth.users`, `accounts`, `objectives`, `person_debts`, `monthly_budgets`, `transactions`; ShareLock on the latter two | Five new action tables with owner/session RLS, exact views and stable contribution RPC; same-owner/currency relationships and duplicate-command semantics. Existing contribution columns/native amount transport retained |

All newly created tables/views also hold appropriate creation locks. Local base-table counts progress 13, 18, 18, 20, 25 with RLS true throughout; production additionally contains the preserved private reservation table. Bound lock acquisition, abort on contention, and verify each proposal's receipt/postconditions before the next. Do not guess production timings from these empty/synthetic fixtures. Proposed schema is additive and history-protecting; existing client attempts newly prohibited debt-history edits may fail closed. Real old/new overlap and managed authorization acceptance still require the recovered exact-target rehearsal and safe hosted tests before release.

## Recovery blocker and free recovery path

The current Free dashboard states project backups are unavailable on this plan. The CLI backup-list request returned 403. Even `db dump --project-ref hyhsppiitijkuvpyswce --dry-run` failed while obtaining the temporary login role: necessary privileges missing, HTTP 403. A later CLI project-list check established that its current credential sees an unrelated project and does not list PRISM; the connector and dashboard independently identify the correct PRISM organization. This is a credential/target-access mismatch, not proof that manual backup is impossible on Free. No login role or backup was created. Available process/local environment names contained no database connection password. No password was reset, no secret was requested into chat, and a service-role API key was not treated as a database backup credential.

RM0 manual export is supported in principle. [Supabase backups](https://supabase.com/docs/guides/platform/backups) recommends manual Free-plan exports; [official backup/restore guidance](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) distinguishes database/Auth contents, internal-schema filtering, Storage objects and provider configuration. An export alone is not verified recovery.

The smallest required access change is to make the **existing** target-specific database connection available privately to the operator/tooling, or supply the correct existing CLI authorization scoped to PRISM. Do not paste credentials into chat or grant broad new privileges. Normal browser `supabase login` creates a classic full-account token covering unrelated/current/future projects; that would grant unnecessary scope for this recovery task, so no such token was minted. [Supabase scoped-token guidance](https://supabase.com/docs/guides/platform/personal-access-tokens). Existing unrelated CLI credentials were preserved. Use trusted PG17 tools and a direct/session-pooler connection suitable for this host; keep credentials out of process arguments and logs. Select a restricted local directory outside Git and OneDrive, encrypted backup storage and independent approved key custody. No production financial records may enter AI context, CI, commits or shared artifacts.

Before any consequential hosted upgrade:

1. Privately capture a consistent backup covering required application/private schema, migration history, exact data, roles/privileges and applicable Auth tables; inspect export filters and managed extension compatibility. Capture provider/Auth/SMTP/OAuth configuration and recovery key custody separately without revealing secrets.
2. Validate backup integrity and restore to a new isolated loopback target with safe private handling and no outbound email/jobs. Verify schema, RLS/grants/functions, Auth/MFA material, exact native-currency reconciliation and recovery behavior with sanitized aggregate receipts only.
3. Establish approved downtime/RPO/RTO and custodians; measure the drill against them. A local synthetic restore or catalog snapshot is insufficient for customer-data recovery.
4. Account for post-backup writes and erasures; prevent deleted accounts from being revived after recovery. Obtain an actual return-to-service and retention/erasure procedure before launch.

Metadata currently shows zero Storage buckets/objects and a 14,331,027-byte database. That does not establish recovery of Vault keys, OAuth, SMTP, provider configuration or a supported hosted restore. No managed PITR, customer restore, recovery objective or full disaster-recovery guarantee is claimed.

## Verification and acceptance boundaries

Fresh source hashing matched all 254 engineering/SQL inputs to the accepted local gate inventory and the starting commit. The current application, lockfile, workflows and seventeen migrations are unchanged. The new tracked changes are documentation only. A fresh fixture-mode Vite build succeeded and a real Edge tab rendered the candidate landing/login pages; keyboard Tab moved to the expected link. `/auth` is not the candidate login route; its actual route is `/login`. No production credentials were used.

Existing source-bound local evidence was reused instead of repeating unchanged suites. [GitHub run 38131570129](https://github.com/ismailabs/prism/actions/runs/38131570129) was independently retrieved: exact starting SHA, completed success, job `114446807287`, all forty-two steps successful, no skipped required step. Artifact `11699307513`, `prism-local-verification-38131570129-1`, is unexpired, 1,248,047 bytes, digest `ffac5722f30460a4c218fd8219a98cf53d18f8ce35c86cfaad1a720d1efa63ed`, expires 18 October 2026. Cached artifact validation confirms its matching digest, expected files/logs and source evidence.

Accepted totals: 31 gates, 163 unit cases, 161 browser cases, five PWA cases, 481 responsive checks and ten deletion-security groups. The suites include exact-money/ledger/planning/actions/intelligence, RLS/session/MFA fixtures, local native HTTP, reconciliation, synthetic injected-failure and cold-restore checks. PG17/Auth receipts retained from prior work are labeled historical and source-matched; they are not a fresh hosted recovery drill. Remote dot-reporting proves aggregate success, while exact source/discovery proves named-case inclusion; it does not create individual named remote receipts.

Actual Edge zoom attempts using both standard shortcut chords left DPR at 1 and viewport width at 1,026; a positive-control Tab changed focus. Browser-level zoom could not be established through these tools. No 200%/400% pass is claimed. Android/iOS physical install/update/offline/safe-area/virtual-keyboard checks, spoken Narrator/NVDA/TalkBack/VoiceOver and Malay native-speaker review remain UNVERIFIED. The [eight-step acceptance procedure](acceptance-and-blockers.md#manual-acceptance-procedure--every-result-unverified) and [evidence form](privacy-and-operations-draft.md#human-acceptance-form) are ready for actual participants.

Hosted catalog RLS is enabled for all fourteen existing PRISM base tables. A bounded read-only authenticated-role transaction with empty claims returned `session_allowed=false` and no profile/account/transaction visibility. These fail-closed checks are narrower than real authenticated tenant/session/MFA/exact-money acceptance. Hosted synthetic accounts/financial writes were withheld because recovery and isolated cleanup safeguards are unestablished. Real customer credentials were never used. Live MFA, tenant separation, idempotency, microseconds and confirmation behavior remain acceptance work after safe upgrade/fixture isolation; never invoke a production deletion RPC merely to test it.

## Dependencies, capacity, privacy and operations

Fresh full npm audit: five high, zero moderate/critical; runtime-only audit: zero findings. The accepted parser 7.1.6 repair and its exact production-CSS parity remain intact. The five findings share the unpatched braces/Tailwind 3 build chain. [Current braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. Fixed reviewed repository glob patterns, trusted source/configuration, a 45-minute secrets-free synthetic CI job, no production watcher and static browser deployment constrain the observed path. The library is still vulnerable; no risk waiver or force/major Tailwind upgrade was made. The [full package disposition](dependency-disposition.md) remains applicable. Owner acceptance of temporary build-risk deferral, or a separately validated chain replacement, remains required. This is not an identified customer-input runtime exploit.

Fresh free-tier observations are aggregate provider/account usage, not PRISM traffic forecasts:

| Provider and scope | Observed current usage / constraints |
|---|---|
| GitHub personal Free account | 1,110/2,000 included minutes; displayed 0.4/0.5 GB storage (89% utilization); billed Actions $0; existing Actions $0 budget with Stop usage Yes and included-usage alerts On |
| Vercel Hobby team, last 30 days | About 65K CDN requests against the overview's 1M allowance; 1.81/100 GB transfer; about 31K function invocations; 10m 8s active CPU; 6h 14m Build CPU Minutes; 150.27 MB deployment storage. Usage is shared with other projects; premium anomaly alerts require Pro |
| Supabase Free organization, shared with Hearthline | 0.11/5 GB uncached egress, 0.01/5 GB cached egress, 26/50,000 MAU, 0.00/1 GB Storage average, 132,680/2,000,000 Realtime messages, peak 7/200 connections, zero Edge Function invocations; displayed zero overage and no overage billing. Usage may lag |

No approved demand forecast, supported per-user dataset, network/device envelope, quota-exhaustion operating policy or snapshot-consistency acceptance exists. Prior synthetic 5,003-transaction/10,000-derivation benchmarks do not create a production capacity guarantee. Define an actual limited release envelope and an owner-monitored pause/escalation rule within free allowances; verify client errors do not report failed/quota-denied writes as successful or replay them. Do not assume free services provide uptime, paid alerts or unlimited usage.

The bilingual privacy/financial-disclaimer drafts and support/incident/recovery procedures were reviewed and retained as **internal, unapproved** material. Controller legal identity/address, monitored privacy/security/support contacts, retention/legal holds, processor destinations and safeguards, rights/complaints, incident/backup custodians and staffed response/alert delivery remain unverified. The source disclosures correctly separate synthetic demo, server-readable financial records, masking versus encryption, native amounts versus FX estimates, projections versus recorded transactions and shadow ledger versus authoritative accounting.

Actual owner/legal/native-language review must approve completed facts and Malaysia-specific PDPA notice, DPO/DBN and cross-border applicability. [Official Malaysian DBN guidance](https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-guidelines-on-data-breach-notification-dbn/) is review material, not a self-certified exemption, deadline or compliance sign-off. No communication to customers/regulators/support recipients, new monitoring service or false contact was created.

## Consolidated handoff and resume order

| Mandatory gap | Minimum actual action / evidence |
|---|---|
| Production recovery | Provide existing private database backup access or repair existing CLI authorization; approve private storage/key custody, recovery objectives and restore scope; complete an exact-target backup and successful recovery verification |
| Required schema and hosted acceptance | Once recovery passes, apply only the five missing reviewed proposals in order, verify receipts/catalog/reconciliation, and complete least-privileged isolated hosted Auth/MFA/RLS/exact-money acceptance with safe cleanup |
| Devices and accessibility | Actual owned Android/iOS/Windows devices and spoken AT/native-language participants complete the prepared procedures; record literal observations, failures/retests and real acceptance |
| Privacy/legal/operations | Actual responsible owner/reviewer fills and approves controller/contact/retention/processor/rights/PDPA facts; appoints incident/support/recovery roles, tests monitored delivery/escalation and accepts return-to-service/rollback procedure |
| Residual security/capacity | Owner records dependency deferral or obtains tested build-chain replacement; resolves/accepts leaked-password protection constraints; approves demand/dataset/quotas and an RM0 operating envelope |

These are evidence or access requirements, not requests to repeat the mission prompt. Standing authorization already covers the subsequent routine engineering stages. After all mandatory requirements actually pass, revalidate the exact source/receipts, source-bound tests, current free allowances and Vercel trigger controls; publish the reviewed release branch non-force, observe CI for its exact final SHA, fast-forward main without altering unrelated work, and verify automatic/manual deployment deduplication. Then verify the exact production revision/alias, fresh unauthenticated and isolated authenticated smoke, compatible worker updates/rollback and monitoring/recovery readiness before any GO declaration.

The tracked record and corrected current security document are committed locally only; the Git log and final report identify their commit. Current remote/main/deployment remain the values above. Final local checks cover reviewed documentation scope, unchanged 254 engineering/SQL inputs and seventeen migration blobs, whitespace, whole Git-visible candidate/history secret scanning and clean state. No claim of CI on the later documentation commit is made.

Sanitized catalog, permission, migration comparison, rehearsal, provider-usage, public smoke and CI receipts are retained under ignored `artifacts/production-release/`; native deletion output is under `artifacts/autonomous-readiness/production-native-deletion.log`. No customer backup is in those directories. The mission's local test services stopped; unrelated worktrees were preserved. Credential strings, customer records and recovery keys were kept out of this report, Git and CI. No paid feature/resource, provider migration, hosted financial mutation, destructive customer test, force push or production deployment was performed. Goal remains unachieved until the live release is safely verified.
