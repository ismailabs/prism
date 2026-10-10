# Phase 03: Finance UX, public identity and onboarding

**GO for Phase 03 local acceptance.** All repository gates pass with isolated
synthetic fixtures. The implementation remains uncommitted on
`codex/phase3-finance-ux`. Hosted release is not authorized or verified.
This document records the implementation and the boundaries of its evidence.

## Baseline and phase entry

- Worktree: `C:/Users/moham/.codex/worktrees/2ec2/prism-finance-baseline`.
- Initial state: clean, detached at `819ddef0e8a3b9aad07475ff495152e4d2ea9156`.
- Implementation branch: `codex/phase3-finance-ux`, based on accepted Phase 01
  `72da622305754328f02ec8f5d2ca8b71a221ee17`. Existing Phase 01 fixes are retained.
- Phase 02 remains uncommitted in its separate worktree at `8081`. Its shadow
  ledger migration is unapplied. No Phase 02 files were copied or modified.
  The operational finance model remains the accepted legacy model.
- GitHub metadata resolves the old remote name to the private `ismailabs/prism`
  repository. Advertised main remains `819ddef0`. The connector's PR-filtered
  workflow query returned no runs; that result does not establish main CI health.
- Vercel read-only metadata confirms project `prj_cxW7kDXZK6AxnJ954ZvB54eRZ8kr`,
  now named `prism`, Vite and Node 24, and a READY production deployment
  `dpl_5tKmFadGtfrFRfaoL88dtmJruBSJ`. Production has not been tested with this work.
  Deployment metadata still identifies `e46822f5` on
  `codex/financial-foundations`, so it differs from GitHub main and this branch.
- Supabase Studio did not expose a callable connector or an existing browser tab.
  The expected project is `hyhsppiitijkuvpyswce`; its current hosted schema,
  settings and data have not been verified during this phase.
- No environment secrets were retrieved. Local browser/build configuration uses
  only `https://fixture.supabase.co` and `fixture-anon-key`. PostgreSQL and
  PostgREST checks run against disposable local synthetic databases.

## Scope decisions

| Keep | Repair | Add | Defer |
| --- | --- | --- | --- |
| React/Vite, exact money, financial queries, RLS, MFA/recovery, history protections, English/Malay, existing charts and preferences | Public/auth route separation, callback and return-path handling, ambiguous savings label, first-run validation and partial-save disclosure | Bilingual homepage, isolated demo, grouped navigation, Malaysia setup defaults, exact opening balance, guest accessibility evidence | Full ledger, net worth, bank connections, AI advice, calendar/reminders/notes, offline mutations, hosted changes |

## Implemented packets

### 3A: Public and guarded routes

Signed-out `/` renders the marketing homepage without waiting for Auth to finish.
An authenticated `/` retains the user's existing landing preference for
compatibility. `/demo` is always an isolated public illustration, including when
a session exists. `/login` is the dedicated Auth route; protected paths replace
the address with `/login?next=...` without mounting the workspace.

Only implemented local finance destinations can be returned to. External hosts,
protocol-relative paths, backslashes, control characters, unknown/public routes,
callback credential parameters and fragments are rejected or removed. Finance
filters survive the return. Auth/session verification, MFA and recovery continue
to precede mounting the lazy workspace. Auth URL state is reread on Auth renders
because Supabase consumes PKCE parameters with `replaceState` without necessarily
emitting `popstate`. Back/forward, direct links and refresh remain supported.

The existing SPA rewrite and security headers are unchanged. Signup confirmation
and Google callbacks now target `/login?next=...`. Legacy root recovery callbacks
remain supported. Successful password recovery signs out and returns to dedicated
sign-in with an explicit success notice. Provider allowlists for the new callback path require hosted
review before release; no provider settings were changed.

### 3B: Public identity and synthetic preview

The homepage explains the PRISM acronym, Malaysia-first audiences, Record /
Understand / Plan / Act, six product layers, Past / Present / Future, implemented
features, limitations, trust details, FAQ and signup/sign-in calls to action.
English and Bahasa Melayu are complete on the added public surfaces. Existing
assets, typefaces and design tokens are reused; no imagery or library was added.

The illustrative card uses fixed text and local React view state. It imports no
financial queries or mutation API. Its three perspectives, synthetic badge,
disclosures and FAQ distinguish examples, goals, account balances and period
flows. Its values cannot enter real accounts, reports or exports. The page
discloses manual/CSV records, server storage, optional MFA, approximate FX,
Privacy Mode limits, and the absence of bank automation or end-to-end encryption.
It describes the full ledger as in development, without claiming operational
double-entry accounting, net worth or AI financial advice.

The design uses existing sage/teal surfaces, a serif headline, subtle spectrum
lines and restrained geometry. Tablet/narrow layouts stack the hero. Both themes,
keyboard controls, native FAQ disclosures, a skip link, semantic chart text and
reduced-motion styles are supported.

### 3C: Logged-in information architecture

The desktop sidebar and mobile drawer group existing working destinations under
Overview, Money, Planning, Insights and Personal. Goals, savings, categories and
payment methods are directly accessible. Nonexistent Organize and Accounting
pages are omitted. The tablet strip, command palette, drawer focus/escape,
gesture handling, existing protected deep links and personalizations remain.
Overview links use `/dashboard` so they cannot accidentally navigate to the guest
homepage after sign-out.

The established compact dashboard and authoritative financial modules remain.
Account amounts stay in their native currency; debts/goals/commitments and the
existing maximum of three deterministic observations retain their derivation.
The added planning summary shows at most one current-month budget alert and one
next active recurring record: no more than five actionable observations in total.
Budget comparisons use exact native minor units; missing spending stays unknown,
zero limits do not imply an alert, and other months are excluded. Recurrence dates
reuse the anchored recurrence function and omit inactive/finished rules. The card
states its current-month scope even when another reporting period is selected.
Working `/plans?section=budgets` and `/plans?section=recurring` links preserve
history and open the relevant existing panel. Recurring items remain planned,
require confirmation when due, and do not imply money has moved.

No editable totals, net-worth number, presumed spendable cash or projection was
added. Account-summary copy explains that future commitments and earmarks are
not deducted, so a spendable-cash total is unavailable. A complete operational
ledger and cash/reservation classification would be required to prove those
additional totals. `Income remaining (%)` replaces the misleading `Savings rate` label;
the dashboard explicitly says income less spending is not actual savings.
The calculation and storage semantics have not changed.

### 3D: Malaysia-first setup and accessibility

Signup carries nonfinancial initial-setup preferences for MYR and
`Asia/Kuala_Lumpur`. Source review proved that the existing signup trigger inserts
only identity/name, while its column defaults remained USD and an unset timezone.
A narrowly scoped, unapplied forward migration changes those defaults for future
profiles, including OAuth profiles. It also carries validated signup language
metadata into a new profile, so Malay signup can stay Malay even when setup is
skipped. The existing restricted function keeps identity ownership, username
truncation, conflict handling, privileges and its empty search path. No trigger
binding or provider configuration changes. Disposable replay verifies that it preserves
existing preferences and exact account/transaction snapshots. This is the minor
onboarding prerequisite allowed by the phase; it introduces no ledger or backfill.
Returning profiles retain their existing currency/timezone;
an explicit Malaysia-defaults button lets them change the visible choices.
Language, timezone and currency are controllable before save. Setup can be
skipped without writes, and offers starter categories, an optional CSV route and
the separate demo. An entered opening balance is validated with the existing
currency-aware decimal parser, then transported as text. It is explained as a
starting balance rather than income.

Validation runs before mutations. Saving locks duplicate submission and disables
skip and the setup form's navigation controls during the operation. Preference/category/account saves remain
separate existing operations, with explicit partial-save disclosure. Completed
category steps are tracked for retry, and actual existing rows are checked.
The setup progress/error surface stays mounted through optimistic account creation
until the server confirms the complete save; a held-response browser regression
checks that it remains visible and locked rather than implying success early.
Failed reads expose an error/retry state instead of masquerading as an empty
account. Local dismissal records contain only setup completion, never money.

## Financial, security and maintainability review

Money helpers, financial services/RPCs, database constraints, RLS policies, grants,
private cache cancellation and native amounts are unchanged. No source-of-truth
financial schema change is part of this phase; only new-profile preference
defaults and initial signup-language handling change in the unapplied file. Private-query modules are in the lazy
workspace; the public illustration has no financial API dependency. Auth gates
are exercised with synthetic sessions, including an AAL1 session with a verified
factor that cannot load private queries. Existing actual PostgreSQL/PostgREST
regressions retain ownership, session, MFA, exact-money, concurrency, atomicity,
idempotency and history assertions.

React review checks included conditional workspace loading, unambiguous route
ownership, event cleanup, URL sanitization, keyed per-user workspace state,
controlled form inputs, successful-step retry state, focus restoration and public
data isolation. No runtime dependency was added or upgraded.

`npm ci` succeeded. The current audit finds eight existing development-chain
advisories (six high, two moderate), involving Tailwind and transitive tooling.
`npm audit --omit=dev` reports zero advisories. Package and lockfile are unchanged;
this is not a claim that the complete dependency audit is clean. Tooling upgrades
remain a separate scoped repair.

## Verification and evidence

Logs and screenshots are under ignored `artifacts/phase3/`; Playwright failure traces are
under ignored `test-results/`. Browser tests rebuild and serve the release bundle
on loopback with synthetic providers. They do not mutate live environments.

The first targeted run passed 11/12 new browser cases. Its only failure was an
incorrect new test selector expecting `Transactions` instead of the established
`All transactions` heading; the exact selector was corrected. All privacy and
destination assertions were retained. Visual inspection also found and repaired
a cramped tablet hero breakpoint. The first responsive run was interrupted after
English widths to reduce concurrent load; it is not counted as a completed pass.

The first complete browser run passed 85/88. Two new-test failures were locator
ambiguity between the existing desktop/mobile rows and a five-second setup-read
deadline during load. The locator is now scoped to the financial table, and the
setup assertion explicitly waits up to fifteen seconds for its read state.
Neither change removes finance/privacy assertions. The third failure exposed the
optimistic-save defect described above. The implementation was fixed, and a
held-response test now verifies that success cannot be shown before confirmation.
These original failures remain recorded; they are not counted as a passing run.

The subsequent expanded targeted run passed 15/17. Its failures were the same
initial setup-read wait in another new case, and the new Privacy Mode selector's
incorrect capitalization. The visible setup readiness wait and exact control
name were corrected. The held-response regression passed; populated planning
summary reflow and axe assertions passed before the selector failure.

| Command | Result | Environment / evidence |
| --- | --- | --- |
| `npm ci` | PASS | Locked Node 24 local install; dependencies unchanged |
| `npm run typecheck` | PASS | Final source; `verified-typecheck.log` |
| `npm run lint` | PASS | Final source and replay helper; `verified-lint.log` |
| `npm run test` | PASS, 86 tests / 9 files | Final source; `verified-test.log` |
| `npm run test:db` | PASS | Disposable PGlite; `verified-test-db.log` |
| `npm run test:platform-db` | PASS | Disposable PGlite; `verified-test-platform-db.log` |
| `npm run test:foundations-db` | PASS | Full replay plus Phase 03 before/after conservation and function-security assertions; `verified-test-foundations-db.log` |
| `npm run test:period-db` | PASS | Disposable PGlite; `verified-test-period-db.log` |
| `npm run test:postgres` | PASS | Disposable native PostgreSQL and actual PostgREST HTTP, including Phase 03 defaults/locale/security/conservation; `verified-test-postgres.log` |
| `npm run test:e2e -- --reporter=list` | PASS, 90 tests | Fresh release bundle, Edge, synthetic providers, one worker; `accepted-e2e.log` |
| `npm run test:responsive` | PASS, 341 layout checks / zero page errors | Final source, Edge, injected synthetic hook fixtures, EN/light and MS/dark; `verified-responsive.log` |
| `npm run build` | PASS | Final source with fixture-only configuration; `verified-build.log` |
| `npm audit --omit=dev` | 0 advisories | Existing runtime dependency boundary; `npm-audit-runtime.json` |
| Complete dependency audit | 8 existing advisories | 6 high / 2 moderate in development tooling; not a clean audit |
| Hosted/physical-device/manual screen-reader checks | NOT RUN | Not authorized or unavailable; not implied by local checks |

The browser run covers all 17 new Phase 03 cases and all 73 existing regressions.
It includes protected return filters, sign-out, PKCE, MFA blocking, password
recovery, signup callback metadata, public/demo query isolation, onboarding skip,
partial retry, exact large opening balance and server-confirmation locking,
mobile drawer focus, populated planning links/native amounts/Privacy Mode,
EN/light and MS/dark public axe/reflow/keyboard checks, short viewport and 200%
zoom. Existing cases retain CRUD, debt-history, transfer/allocation/principal,
CSV, recurrence, period/drilldown, charts, personalization and keyboard checks.
Public axe and populated planning-card axe report no WCAG-tagged violations;
the complete suite's existing surface/palette/drawer accessibility checks pass.

UI source was unchanged between the passing browser run and final build. The
later default/locale proposal is separately covered by both database replays.
Its function owner, grants, security-definer flag and search path are asserted
unchanged, alongside the exact pre-existing profile/account/transaction snapshot.

Final `git diff --check` and a whitespace scan over all 29 changed candidates
pass. The index is empty, branch HEAD remains `72da6223`, and a final advertised
remote check still returns main `819ddef0`. `verified-gates.json` records gate
exit codes, timings and log paths; `final-source-manifest.json` records local
candidate hashes. Those artifacts are evidence, not committed source.

Screenshots from the final fixture bundle:

- [English/light homepage](../artifacts/phase3/showcase-home-en-light-1440.png)
- [Malay/dark homepage](../artifacts/phase3/showcase-home-ms-dark-1440.png)
- [English mobile page](../artifacts/phase3/showcase-home-en-light-390.png)
- [Malay mobile page](../artifacts/phase3/showcase-home-ms-dark-390.png)
- [Populated dashboard planning](../artifacts/phase3/dashboard-planning.png)

The four showcase captures also report zero page errors/private requests. The
automated public test captures retain the visible skip-link focus state; the
showcase captures show the default pointer state. No new artwork was generated.

## Migration and release plan

`supabase/migrations/20261010021500_malaysia_profile_defaults.sql` was written
and tested only in disposable databases. It changes future profile defaults to
MYR and Kuala Lumpur; it does not backfill or rewrite existing users. It remains
**unapplied remotely**. No commits,
pushes, PRs, deployments, promotions, hosted records, accounts, domains,
environment variables or security/provider settings were changed. Other worktrees
and their uncommitted work remain untouched. The final source manifest will list
the local review candidates; generated evidence stays ignored.

The next reviewable action is approval of this local branch diff and its evidence.
Committing, integrating/pushing, creating a PR or deploying requires explicit
authorization under the supplied Phase 03 specification. Before a release,
recheck main CI, deployment lineage, the intended Supabase target and callback
allowlists. Verify a separately authorized preview with actual provider OAuth/
email/MFA, then approve any production deployment. Rehearse the new defaults
addition on the verified, separately authorized staging target after migration
history and the inherited Phase 01 proposal have been reviewed. No backfill or
data rollback is needed for the defaults file. A reviewed forward rollback would
restore the currency default to USD, drop the timezone default, and restore the
previous restricted profile-creation function body in a new forward file,
affecting only later new profiles. It must not replay the original baseline or
rewrite existing choices. The inherited Phase 01
debt-history migration remains unapplied and needs its own approved rehearsal and
release sequence; a frontend release must not imply that database protection is
already hosted. Phase 02 ledger integration remains a separate review packet.
A release rollback
can restore the previous frontend deployment; it should not touch financial data.

## Acceptance checklist

- PASS: Guest homepage, private guards, deep-link Auth, refresh/history, recovery
  and MFA blocking with synthetic providers.
- PASS: Honest identity, implemented feature descriptions and ledger boundary.
- PASS: Synthetic demo isolation and no guest financial queries, including a
  signed-in session visiting the public demo.
- PASS: Existing financial operations/calculations retained; all database,
  native HTTP and complete browser regressions pass.
- PASS: Target widths, short viewport, keyboard/focus, reduced motion, zoom,
  semantic alternatives and automated WCAG-tagged scans.
- PASS: English/Malay labels and locale formatting; raw error-detail gaps recorded.
- PASS: MYR/Kuala Lumpur defaults, both signup languages, existing-profile and
  exact-record conservation in disposable migration replay; skippable controlled
  setup, validation, partial retry and server-confirmation locking in browsers.
- PASS: Guest/signup/sign-in/mobile/accessible-control coverage and screenshots.
- PASS: Changes remain local; no commit, deploy, domain change or remote PR.
- NOT TESTED: Hosted providers/allowlists, physical devices and manual screen readers.

Local recommendation: **GO**. Hosted release: **NO-GO until separately authorized
integration, migration rehearsal and real-provider verification**. Automated axe
checks are evidence toward the accessibility target,
not a screen-reader audit or WCAG certification.

## Remaining evidence limits

Provider email, Google OAuth, recovery and MFA behavior are verified locally with
synthetic responses, not live accounts. Signup's MYR/timezone setup metadata is
covered for email signup, and disposable SQL replay covers OAuth-style profile
creation through the unchanged signup trigger with the proposed defaults. Existing
OAuth profiles retain their choices and have an explicit Malaysia-defaults control.
Hosted defaults await migration approval. No hosted provider allowlist was inspected or
edited. Unknown backend/provider error details can still be English in Malay
flows; added labels, guidance and public copy are translated. Manual assistive
technology and physical-device testing were not performed. Field performance,
offline PWA lifecycle and a complete ledger remain outside this phase's evidence.

## Exact changed files

- `docs/phase3-finance-ux.md`
- `e2e/auth-routing.spec.ts`
- `e2e/phase3.spec.ts`
- `e2e/redesign.spec.ts`
- `index.html`
- `scripts/foundations-db-test.mjs`
- `scripts/phase3-identity-test.mjs`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/components/auth/AuthScreen.tsx`
- `src/components/auth/PasswordRecovery.tsx`
- `src/components/Dashboard.tsx`
- `src/components/financial/Onboarding.tsx`
- `src/components/financial/Overview.tsx`
- `src/components/financial/Planning.tsx`
- `src/components/financial/PlanningHighlights.tsx`
- `src/components/public/public.css`
- `src/components/public/PublicHome.tsx`
- `src/components/Workspace.tsx`
- `src/domain/planning-highlights.test.ts`
- `src/domain/planning-highlights.ts`
- `src/i18n.ts`
- `src/lib/routes.test.ts`
- `src/lib/routes.ts`
- `src/main.tsx`
- `src/store/useAppStore.ts`
- `src/styles.css`
- `supabase/migrations/20261010021500_malaysia_profile_defaults.sql`
- `supabase/migrations/README.md`
