# PRISM Calm Precision delivery report

Local development acceptance passed with failed attempts and resolutions retained
below. [Development PR #5](https://github.com/ismailabs/prism/pull/5) is open.
**NOT DEPLOYED.**

## Source and scope

- Repository: [ismailabs/prism](https://github.com/ismailabs/prism).
- Branch: `codex/calm-precision-20261013`; supplied worktree `0d5f` reused.
- Baseline: `d1438197a33d179cedd6c54bad3bfcf9a06db31f`, initially clean and
  independently matched to fetched and advertised `origin/main`.
- Engineering commit: `100f3bf4b96d656fe37848ccb788391f7d1f2329`, pushed and
  independently matched to local, fetched and advertised branch refs. The
  documentation commit is the resulting PR head recorded in the final handoff.
- PR: [ismailabs/prism#5](https://github.com/ismailabs/prism/pull/5), open and
  unmerged. [Live checks](https://github.com/ismailabs/prism/pull/5/checks) run the
  complete Linux catalog on the published candidate; pending checks are not passes.
- Authoritative archive: `PRISM-Codex-Implementation-Package.zip`, SHA256
  `bac5f91a672008c477327d66c6839dc0363ce69aec1d161a1c64c6854c033bb4`.
  The entry prompt, all fourteen specifications and all four references were read.
- Delivery environment: Windows, Node 24.19.0, npm 11.17.0, headless Edge;
  disposable PostgreSQL 18 and local PostgREST 16.4; PGlite for isolated SQL cases.
- No new dependency, lockfile change, schema migration, financial-domain rewrite,
  bank integration or ledger cutover. Existing Auth/MFA/RLS contracts remain.

The package's Option B was followed: retain React/Vite/Supabase and restructure
selected frontend components. All sixteen private destinations and public routes
retain their paths. The work is a development delivery, with live provider and
human launch gates recorded separately below.

## Delivered experience

Warm neutral surfaces, evergreen actions and semantic dark counterparts now run
through the product. Local Inter, tabular amounts, clearer labels, restrained
borders, larger controls and a separate visible focus token provide a shared
language. A faceted vector mark generates the favicon and install icons locally.
User-selected accent, density, module order, reduced motion and privacy preferences
remain available; only the fresh module order changes.

The desktop sidebar groups every route. Tablet navigation exposes every route;
compact screens have Home, Transactions, Add, Plans and More with safe-area
padding. The drawer traps focus and restores either opener. Each private route has
a concise bilingual purpose. Existing keyboard shortcuts and the command palette
remain available.

Overview leads with **recorded cash flow**, separately identifies account cash,
and explains the exclusion of transfers, principal and earmarks. Its six-month
trend reads a bounded exact daily-total source independently of the selected
summary period. Chart data tables and transaction drilldowns remain available.
Expert position, review and scenario tools use progressive disclosure.

Transactions now distinguish loading, failure, no records and no filtered matches;
show removable filter chips, account context and category identity; and retain
server paging, import and current-page export. Deep links preserve account,
currency, search and contextual item IDs. The exact amount form associates its
currency guidance and validation errors correctly. A synchronous submit lock
prevents rapid duplicate writes while the existing confirmed save/read completes.
Mobile dialogs keep their actions reachable.

Plans, goals, savings, debts, analytics, accounting, notes, reminders,
notifications, calendar, categories, payment methods and settings share the new
surfaces without removing their actions or histories. Allocation percentages,
milestone text and ARIA values respect privacy mode. Optional setup reports
confirmed steps after partial saves, accurately preserving separate operations.

## Screen acceptance

The acceptance IDs are mapped to test sources in
[calm-precision-acceptance.md](calm-precision-acceptance.md). Functional evidence
below uses isolated synthetic records, never real customer rows.

| Route / flow | Delivered | Functional verification | Responsive / language / theme / accessibility |
| --- | --- | --- | --- |
| `/`, `/demo`, `/privacy`, `/terms` | Shared public typography, color and identity; existing policy/demo behavior | Public, demo and phase3 browser cases; public cache review | Existing responsive catalog and both locales/themes |
| `/login`, recovery, MFA | Shared controls and preference geometry; original secure flows | Auth-routing and auth-security, safe return, PKCE, MFA/challenge/recovery fixtures | Existing Auth responsive and focus cases; hosted flows separate |
| Optional onboarding | Readable steps; actual confirmed-save status and partial-save feedback | Phase3 setup, no-sample-data, owner and save-failure cases | Shared 44px form controls, EN/MS and mobile cases |
| `/dashboard` | Recorded flow, bounded six-month trend, native position, source links and disclosure | Independent reconciliation; periods, enhancements, planning and intelligence cases | New route axe/captures; complementary modes; responsive catalog |
| `/transactions` and amount dialog | Phone rows / wide table, filter chips, counts, context, explicit states and exact input | Paging, all filters, CRUD, rapid submit, four currencies, deep-link/history, CSV | New route axe; eight amount cases; 320/640 reflow and focus tests |
| `/accounts` and transfers | Native account cards and real account/currency transaction drilldown | Foundations transfer/archival/ownership; independent cash reconciliation | New route axe/captures and responsive catalog |
| `/plans` | Existing budgets, recurring records, occurrence actions and history in shared system | Planning/actions/integration, rollover and recurrence cases | New route axe/captures and responsive catalog |
| `/goals`, `/savings` | Allocations, contributions, milestones, plans and privacy-safe progress | Goal/actions, exact contribution and transfer provenance cases | New route axe/captures; actual goal detail captures in EN/light and MS/dark |
| `/debts` | Direction, native outstanding principal, repayment history and protected links | Actions/native concurrency, overpayment and funded/unfunded repayment cases | New route axe/captures and responsive catalog |
| `/analytics` | Existing comparisons, category/source drilldowns and qualified scenarios; touch/focus disclosure | Intelligence/period cases and FX-unavailable behavior | New route axe/captures; target-size finding repaired |
| `/accounting` | Partial read-only shadow provenance, separate synthetic example, native currencies | Hosted-ledger fixtures, ledger DB/review and local preview | New route axe/captures and responsive catalog |
| `/notes`, `/reminders`, `/notifications`, `/calendar` | Existing source links, history, preferences and actions in shared shell | Actions/intelligence CRUD, calendar/source routes and deduplication | New route axe/captures and responsive catalog |
| `/categories`, `/payments` | Existing editable management and category color identity | Manage-list, period/color and localization cases | New route axe/captures and responsive catalog |
| `/settings` | Preserved personalization, locale/theme/privacy and security controls | Phase3/enhancement/auth cases, persisted preference behavior | New route axe/captures plus complementary modes |
| PWA / offline | Updated install identity and offline palette; public-only cache retained | PWA browser, source review, connectivity and restore rehearsal | Offline/install responsive cases; no financial replay |

All private routes receive automated axe scans at 390 and 1440 CSS pixels in
EN/light and MS/dark. Five core routes additionally receive EN/dark and MS/light
captures at 320, 768 and 1440. Existing responsive coverage includes longer values,
forms, public/Auth/offline and additional viewport combinations. Captures are
reviewed against the reference hierarchy and real product semantics.

## Financial and security evidence

The independent fixture asserts MYR 5,200.00 income less 3,060.00 spending equals
2,140.00 ordinary cash flow. Account cash is calculated separately: opening 1,000
plus ordinary flow less a 200 own-account transfer and 100 funded principal gives
2,840; the reserve is opening 2,000 plus the transfer, or 2,200. A 3,000/5,000
earmark is 60% allocation and does not debit either account. Debt outstanding is
1,000 less 100 principal, or 900. Chart source links retain ordinary-activity
filters. These figures are a synthetic oracle, not financial advice or live data.

The retained regression catalog exercises decimal text/bigint amounts above
JavaScript's safe integer range, currency precision, negative/invalid no-write
cases, exact PostgREST reads, atomic transfers, native currencies, opening balances,
goal provenance, debt direction/overpayment/concurrency, recurrence confirmations,
period boundaries/DST, missing FX and partial shadow reconciliation. The native
tests exercise anonymous/owner/cross-owner and session/MFA denials over real local
HTTP and PostgreSQL. Cache and PWA checks retain identity/session/deletion isolation
and prohibit caching private finance or replaying offline money writes.

`src/domain`, migrations, Auth hooks, private cache and Supabase client security
logic were not changed. Production reads were confined to migration inventory,
advisors and provider/deployment metadata. Hosted receipts show the shadow ledger
was applied after its earlier proposal; README chronology was corrected without
changing posting authority or a database.

The final source audit also checked the six-month trend's date authority. The
existing `finance_daily_totals` view admits only `activity_kind='ordinary'` and
`transaction_date<=now()` before grouping; the fixture mirrors that exclusion.
The new chart therefore reads posted ordinary activity from a bounded source,
with future records excluded by the financial view itself. Its six-month calendar
range is separate from the summary period, with each chart point's actual filters
available through the data table and source drilldown.

## Test results

Actual exit codes, durations and raw-log hashes are recorded in
[calm-precision-verification.json](calm-precision-verification.json). Baseline
passed typecheck, lint, 166 unit tests, build and 29 representative browser cases.
The final core refresh passed all five commands, including 166 tests in 21 files.
Sixteen isolated database/review commands, three native commands and three refreshed
safety/recovery commands passed. Auth security passed 14 cases, PWA passed five,
accounting preview passed, and all 481 responsive checks passed without browser
errors. The 64 route axe reports contain zero violations; four additional rendered
chart-contrast checks and both 320px onboarding failure-state axe scans passed.

The complete earlier local browser command finished **243 passed / 5 failed**.
All five affected spec files subsequently passed **99/99** in fresh processes.
Final review added two onboarding and four chart-contrast cases. The full
phase3/focused suites were refreshed after those corrections, and the four new
contrast cases passed. All **254 currently collected cases** have passing coverage
across these recorded runs. No single uninterrupted 254-pass local command is
claimed; the original failed exit remains in the receipt with its explicit
resolution. Linux CI runs the ordinary full catalog on the published candidate.

| Group | Actual command | Outcome | Seconds |
| --- | --- | --- | ---: |
| core | `npm run typecheck` | PASS | 38.427 |
| core | `npm run lint` | PASS | 144.729 |
| core | `npm run test` | PASS | 68.410 |
| core | `npm run build` | PASS | 44.576 |
| core | `npm run test:localization` | PASS | 2.255 |
| database | `npm run test:db` | PASS | 9.558 |
| database | `npm run test:platform-db` | PASS | 8.243 |
| database | `npm run test:foundations-db` | PASS | 10.768 |
| database | `npm run test:period-db` | PASS | 8.832 |
| database | `npm run test:ledger-db` | PASS | 6.998 |
| database | `npm run ledger:dry-run` | PASS | 0.691 |
| database | `npm run test:ledger-review` | PASS | 3.771 |
| database | `npm run test:planning-db` | PASS | 6.692 |
| database | `npm run test:goal-actions-db` | PASS | 6.234 |
| database | `npm run test:actions-db` | PASS | 5.690 |
| database | `npm run test:integration-db` | PASS | 33.132 |
| database | `npm run test:integration-review` | PASS | 0.683 |
| database | `npm run test:deletion-security` | PASS | 6.109 |
| database | `npm run test:intelligence-db` | PASS | 8.517 |
| database | `npm run test:intelligence-review` | PASS | 1.248 |
| database | `npm run test:actions-review` | PASS | 5.290 |
| native | `npm run test:postgres` | PASS | 58.354 |
| native | `npm run test:actions-native` | PASS | 105.902 |
| native | `npm run test:intelligence-native` | PASS | 71.823 |
| browser | `npm run test:e2e` | FAIL → resolved by complete affected-file reruns | 3501.710 |
| browser | `npm run test:auth-security` | PASS | 83.780 |
| browser | `npm run test:ledger-preview` | PASS | 30.929 |
| browser | `npm run test:pwa` | PASS | 230.656 |
| browser | `npm run test:responsive` | PASS | 305.090 |
| safety | `npm run test:pwa-review` | PASS | 1.203 |
| safety | `npm run test:restore` | PASS | 54.299 |
| safety | `npm run test:release-package` | PASS | 17.171 |

| Final browser refresh | Passed | Seconds |
| --- | ---: | ---: |
| `phase3.spec.ts` | 19/19 | 209.078 |
| `focused-upgrade.spec.ts` | 7/7 | 120.003 |
| `calm-precision.spec.ts` (chart contrast only) | 4/4 | 114.300 |

The entry bundle is 383.43 kB / 119.42 kB gzip, compared with baseline 383.42 kB /
119.42 kB gzip. This is build output size, not a field-performance benchmark.
The receipt binds all 53 reviewed engineering blobs to their exact Git identities.

### Failures investigated

- An initial shared navigation refactor read `window` during SSR. The initializer
  was guarded and the full unit suite subsequently passed.
- A full browser run exposed dropped contextual item IDs, a disclosure target-size
  failure, an old favicon expectation and obsolete IA/color/ambiguous selectors.
  Context is preserved, disclosure geometry/focus and canonical icons were repaired,
  and source-scoped selectors retain their behavior and category identity assertions.
- The second full run exposed two assertions before owned report reads settled and
  eight expectations that valid amounts have no description at all. Readiness now
  waits on the owned source responses; valid hints remain associated while stale
  errors are explicitly rejected. The hint was also moved outside the input label.
- The exact-save fixture now returns its confirmed row to the existing post-write
  exact read. Repeated-submit assertions still require exactly one POST.
- An overlapping early browser attempt produced a port rejection/trace collision.
  Browser runs are serialized. A later focused MS/EUR run timed out in axe under
  host memory pressure; its 12 passes and one failure remain recorded, with no
  retry setting or assertion weakened.
- Visual review caught a tablet decimal wrapping onto a separate line. The position
  grid now reserves at least 280px per card before adding another column.
- Later foundation/intelligence snapshots showed completed writes or correct month
  selection while an assertion ran before source loading finished. Exact owned
  saved-row/report responses now establish readiness before the original financial
  and failure assertions. On Windows, one project per spec releases browser caches
  between files on this approximately 4 GB host. The full case catalog, assertion
  strength, retry settings and time limits remain; Linux CI keeps its original
  project layout. The additional privacy regression verifies derived and ARIA values.
- Changing project configuration during a live attempt invalidated later worker
  identities, and the derived CAPTCHA configuration initially inherited the full
  project catalog. Those attempts were stopped and retained. CAPTCHA projects now
  explicitly reset to its fourteen intended cases; a clean collection check proved
  248 main cases in eighteen files and fourteen CAPTCHA cases in one file. Final
  runs use a stable configuration. Complementary captures use reduced motion to
  avoid photographing a chart midway through its permitted animation.
- A focused timezone readiness predicate initially omitted the prior-month
  comparison source. Inspection of the real report hook established the correct
  August-through-September query. The unchanged September-selection assertion then
  passed; exact create/edit and both financial-denial/forecast checks also passed.
- A long Windows run later stalled during worker startup under approximately
  200 MB free RAM, then timed out while awaiting an exact saved row and filling
  an already visible transfer field. That failed attempt was stopped and retained.
  A strictly scoped thread diagnostic refused its process-identity check and
  changed no threads. Windows verification now releases the complete Playwright
  process per spec, counts every collected test and preserves every exit/log;
  Linux and filtered commands retain normal behavior. This is resource isolation,
  not a waiver or passing result; the fresh complete catalog must still pass.
- A repeated unit run passed 165 cases but timed out during an unchanged mocked
  free-rates-provider test. Windows Vitest concurrency is now one worker to reduce
  contention; the complete 166-case catalog and its five-second test deadline are
  retained. Linux concurrency is unchanged. Independent left/right safe-area
  padding was also corrected during the final source audit.
- The first per-spec attempt exposed a calendar DST assertion before its owned
  historical record/timeline sources had settled. The test now waits for that
  exact owned row and the named timeline loading state, retaining all original
  date/status/no-write assertions and deadlines. Each spec also receives a unique
  failure-output directory so subsequent files cannot erase its evidence.
- The complete per-spec run finished with 243 passes and five failures. Notes and
  two dashboard assertions ran during loading; their tests now wait for the actual
  owned rows/report responses. The transaction focus trace showed Enter on a still
  disabled opener, so that test now asserts it is enabled first. The remaining
  analytics failure timed out in fixture `page.addInitScript` before application
  startup and is rerun unchanged. All five affected spec files are rerun in full;
  no timeout, retry, financial assertion or focus-restoration assertion is relaxed.

The final catalog assessment uses each file's last complete passing run, retaining
the original 243/248 attempt and the separate remediation logs. It does not claim
a single uninterrupted 248-pass run. Linux CI runs the ordinary full catalog.

Final source review also corrected two issues. Onboarding now resets its confirmed
step flags on every attempt and retains the unconfirmed status after a failure,
while prior successful records remain saved. Two bilingual regressions exercise
an account denial followed by a changed-preference denial and assert no extra
account or transaction writes. The spending sage was darkened from `#91b49b`
(2.28:1 against white) to `#698f74` (3.63:1). Four rendered theme/language cases
measure legend and SVG mark contrast against their actual card backgrounds and
refresh representative overview captures. The final collected catalog has 254
cases; these six additions are not retroactively counted in the earlier 248-case
run.

All failed local logs remain under ignored `artifacts/calm-precision/iterations`
or named remediation output. Final passing receipts will identify the candidate
actually delivered. Automated accessibility is meaningful evidence, not a complete
WCAG conformance certificate.

## Evidence and reproduction

- [Implementation/architecture notes](calm-precision-design.md).
- [Milestone ledger](calm-precision-progress.md).
- [Acceptance register](calm-precision-acceptance.md).
- Local receipts: `artifacts/calm-precision/{core,database,native,browser,safety}/receipts.json`.
- Full synthetic captures and 64 per-route axe reports:
  `artifacts/calm-precision/screens/`.
- Independent fixture and regression sources: `e2e/calm-precision.spec.ts` and the
  retained e2e/domain/native database catalog.

Reviewed representative images are committed as intentional documentation. All
names, balances and activity below are synthetic QA records:

| Capture | Mode / width | Review focus |
| --- | --- | --- |
| [Overview desktop](calm-precision/screenshots/dashboard-1440-en-light.png) | English / light / 1440 | Cash-flow hierarchy, native position, chart legends and sources |
| [Overview phone](calm-precision/screenshots/dashboard-390-ms-dark.png) | Malay / dark / 390 | Paired metrics, disclosure, navigation and readable native amounts |
| [Overview tablet](calm-precision/screenshots/dashboard-768-ms-light.png) | Malay / light / 768 | Complete decimals, adaptive card grid, chart values and medium navigation |
| [Transactions phone](calm-precision/screenshots/transactions-390-en-light.png) | English / light / 390 | Merchant/account/category context, aligned amount and real actions |
| [Accounts desktop](calm-precision/screenshots/accounts-1440-ms-dark.png) | Malay / dark / 1440 | Native balances, account activity links and transfer workflow |
| [Goal detail](calm-precision/screenshots/goal-detail-390-en-light.png) | English / light / 390 | 60% allocation, remaining amount, source history and cash distinction |
| [Goal detail Malay](calm-precision/screenshots/goal-detail-390-ms-dark.png) | Malay / dark / 390 | Translated actions, exact MYR amounts and contribution provenance |
| [Setup retry](calm-precision/screenshots/onboarding-retry-320-en.png) | English / light / 320 | Actual prior writes retained; failed current steps shown unconfirmed |
| [Setup retry Malay](calm-precision/screenshots/onboarding-retry-320-ms.png) | Malay / light / 320 | Narrow translated fields, denial feedback and truthful step status |

```text
npm ci --no-audit --no-fund
node scripts/calm-precision-verify.mjs core
node scripts/calm-precision-verify.mjs database
node scripts/calm-precision-verify.mjs native
node scripts/calm-precision-verify.mjs browser
node scripts/calm-precision-verify.mjs safety
node scripts/transaction-precision-repair-test.mjs
```

Native checks require the documented `PGRST_TEST_BINARY`. All browser checks are
loopback-only with artificial identities; hosted browser environment/storage-state
opt-ins are rejected. Run browser groups serially. Core builds use a separate
output directory to avoid replacing a running browser bundle. The two capture/icon
scripts use existing local browser dependencies; no paid/generative service was used.

## Limitations and release gates

- No preview or production deployment was performed. Main is not pushed or merged.
  A branch-specific `git.deploymentEnabled: false` entry prevents automatic Vercel
  Git deployments for this development branch. Read-only metadata after the
  engineering push returned zero branch deployments; final-head metadata is
  independently checked at handoff. No production setting was changed.
- Physical devices, real OS zoom/virtual keyboards, human screen readers and final
  manual accessibility acceptance remain external. 640/320 CSS-pixel tests represent
  1280px content at 200/400% reflow geometry, not actual OS zoom certification.
- Native PostgreSQL 18/PostgREST 16.4 and synthetic Auth tests do not certify hosted
  PostgreSQL 17, real OAuth/MFA/email delivery/recovery, CAPTCHA or public registration.
- Read-only Supabase advisors still report leaked-password protection disabled and
  a private report-reservations table with RLS and no policy. No hosted security
  configuration was changed; the latter may intentionally deny access and requires
  owner review before any policy decision.
- Existing dependency audit: five high findings in the development toolchain,
  zero runtime findings with `--omit=dev`. No new dependency was introduced. The
  inherited Tailwind/chokidar/micromatch/braces disposition remains a release gate;
  no forced upgrade or misleading clean-audit claim is made.
- Recipient email acceptance, recovery beyond the local rehearsal, legal/operator
  approval and separate launch/device/provider acceptance remain required. Public
  registration and deployment are outside this authorization.
- References' fictional connected accounts, future dates, predictions and figures
  were intentionally adapted to recorded cash, qualified estimates, allocations
  and principal. No bank connectivity, guarantee or invented financial event exists.

## Privacy, rollback and readiness

No production data, schema, provider setting or credential was changed. No real
customer finance was read. Reviewable synthetic screenshots may be committed as
documentation; build outputs, traces, logs, environment files and local database
directories stay ignored. Secret scans and staged-path review are required before
publication. Existing CI uses local fixtures and its RM0 optional evidence policy.

Rollback is an ordinary reviewed Git revert of this branch's frontend/documentation
commits to the baseline; no data migration or database rollback is needed. Reviewers
should concentrate on source/context navigation, exact-submit locking, preserved
chart provenance, privacy-safe progress, partial onboarding status and responsive
focus/geometry. Saved module order remains intact.

The authorized implementation and local acceptance are complete, with the PR
available for code review. Final-head CI and publication metadata are inspected
at handoff; the PR exposes their live status. A hosted preview requires separate
authorization. Production launch remains **NO-GO under this scope** because the
hosted, device, human accessibility and operator gates above remain outstanding.
