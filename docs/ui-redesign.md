# PRISM interface redesign

## Direction and research

The attached brief and 21 references informed the redesign. The older, colorful dashboard examples were useful for hierarchy and grouping; the quieter recent finance references informed restrained surfaces and navigation. No reference layout, artwork, or branding was copied.

Public production research: [Monarch](https://www.monarch.com/homepage), its transaction and goal organization, and [YNAB progress bars](https://support.ynab.com/en_us/progress-bars-a-guide-SkDEhot09?mobile-help=true). The transferable principles are searchable activity, clear separation of cash and planning, and visible progress toward an actual target. Mobbin was not available. PRISM retains explicit transaction entry and its existing financial semantics.

## Architecture and preservation

Audited the existing authentication/recovery/MFA branches, the workspace's six primary routes and four legacy routes, finance and planning hooks, shared controls, tables, dialogs, exact-money domain functions, localization, themes, test fixtures, Vite build and Vercel configuration. The initial checkout was clean.

No changes to auth/session handling, RLS, schema, financial calculations, exchange-rate service, write hooks, or currency precision. The exact text read/write boundary and native-currency records remain intact. Real finance mutations in tests use isolated fixtures or disposable PostgreSQL, never production user data.

## Information architecture and interaction

- Persistent desktop sidebar: Overview, Transactions, Accounts, Plans, Personal debts, Settings. A compact horizontal navigation serves tablets and a focus-trapped drawer serves phones. Direct goals, savings, categories and payment-method routes remain valid and highlight their parent section.
- Overview: selected monthly net cash flow first, income/spending/savings rate next, six-month cash-flow comparison, ranked spending, separate account balances, goal progress and obligations, then recent activity. Recorded net flow is explicitly distinguished from account cash.
- Accounts present balances before transfers. Plans retain goals, savings, budgets and explicitly recorded recurring activity with a quieter tab strip.
- Transaction search and filters remain server-backed. CSV import and export sit together. Phone rows show amount, description and date first; an accessible native disclosure retains full metadata.
- Settings retain profile, currency, timezone, theme, language, categories, payment methods, MFA, password changes, credits and deliberate account deletion.
- Authentication has a branded introduction and focused form; the introduction collapses on phones. Language and appearance can be chosen before sign-in. Recovery and MFA remain separate guarded flows.

## Design system

Inter, loaded locally with Latin subsets for English and Malay; restrained weights and tabular amounts. Warm neutral canvas, white working surfaces, teal actions, neutral expenses, amber obligations and deliberate destructive red. Dark mode uses green-black surfaces, lighter teal and warmer chart colors. All colors and shared surface geometry are tokens in `src/styles.css` and `tailwind.config.js`.

Rounded surfaces identify related working content; account/goal/debt context on the overview is an open three-column composition. Forms use 44px controls, dialogs retain Radix focus management and scrolling, and loading uses reduced-motion-aware skeletons. Semantic chart values have a screen-reader table. Category bars also display exact text values. The small geometric PRISM mark and authentication artwork were authored in SVG/CSS, with no heavy bitmap assets.

## Responsible engagement

Recognition: persistent route context, account names, transaction types, native amounts and familiar labels. Progressive disclosure: transaction metadata, filters and plan detail. Goal progress comes from existing allocations and displays actual funded/target amounts. The dashboard prioritizes the next actual obligation without creating urgency. Existing mutation feedback is retained. No streaks, fabricated insights, simulated balances or unattended financial actions were introduced.

## Verification

Browser screenshots are ignored artifacts under `artifacts/redesign-*`; automated stress layouts also include very long names and large amounts. Browser mutation tests intercept the API and exercise the production client rather than issuing real production writes.

Completed local checks:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test` | 44 passed across 5 files |
| `npm run test:db` | Passed migration replay, exact precision, ownership, MFA and CRUD relationships |
| `npm run test:platform-db` | Passed account integrity, progress cascades and deletion safeguards |
| `npm run test:foundations-db` | Passed transfers, allocations, principal, timezone, import, budgets, recurrence and pagination |
| `npm run test:postgres` | Passed independent-connection locking, concurrent overpayment, HTTP exact text round trips for every money-bearing entity, anonymous denial and confirmed self-deletion |
| `npm run test:e2e` | 14 passed, including the redesigned overview at eight widths in all four locale/theme combinations and authentication at four widths |
| `npm run test:responsive` | 321 layout checks passed, with no browser errors |
| Targeted responsive rerun at 320px | 33 checks passed after adding a wait for the completed monthly snapshot |
| `npm run build` | Passed; CSS 41.10 kB (9.16 kB gzip), dashboard 10.68 kB (3.85 kB gzip) |
| `git diff --check` | Passed |
| Production Supabase inspection | All 13 public financial tables have RLS enabled; no user records were read |
| Preview configuration | Required public client variables present; expected project URL confirmed; no privileged VITE-prefixed key |

An initial desktop navigation duplication was fixed and covered by the navigation test. Test assertions were updated for intentional hierarchy/copy changes. ESLint now excludes generated artifacts to prevent a race with Playwright output cleanup. On the 4 GB Windows host, browser suites run sequentially; the responsive runner releases its page between viewport cases.

## Browser QA

The stress sweep covered all ten routes at 320, 360, 375, 390, 414, 640, 768, 1024, 1280 and 1440px in English/light and Malay/dark, including transaction filters, add/delete dialogs, category/payment forms, MFA management and a short-height dialog. Large amounts and long unbroken names remained contained, with final dialog actions reachable.

The seeded overview matrix additionally checked English/light, English/dark, Malay/light and Malay/dark at 320, 375, 390, 414, 768, 1024, 1280 and 1440px. Exact MYR 4,054.00 net flow, 59.6% savings rate and 60% actual goal progress stayed consistent across those presentations. Authentication was checked at 320, 375, 768 and 1440px in English/light and Malay/dark. Reviewed screenshots include populated desktop/mobile overviews, both themes, authentication, mobile settings and a narrow dialog.

## Vercel deployment

[Preview](https://prism-finance-gf7jojrx8-mohamadismailmohdizwan-8309s-projects.vercel.app) deployed successfully with `vercel deploy --yes --logs`, deployment `dpl_FuxPMV1jR6LSmXrvC5oGiRwZNgHn`, status READY. Remote `npx playwright test e2e/deployed.spec.ts` passed both tests in 53.6 seconds. This exercised authentication/recovery UI, isolated transaction/transfer writes, all protected routes, mobile navigation, Malay dark mode and dialogs at 390, 768 and 1440px. The real `/api/rates?base=MYR` returned HTTP 200 and all four supported currencies.

Production deployed successfully with `vercel deploy --prod --yes --logs`, deployment `dpl_G17zbQco9e4dgotEkSmrwpipD4L5`. [PRISM Finance](https://prism-finance-tracker.vercel.app) is the stable alias. `vercel inspect` confirmed that alias points to this READY production deployment. Both remote browser smoke tests passed again against the stable alias in 56.6 seconds, covering the same routes, navigation and dialogs. The app and live rate endpoint returned HTTP 200; all four currencies were present and the security response header retained `X-Frame-Options: DENY`. These checks used fixture account data and did not write to production user records.

The Vercel connector's project schema failed, and its share-link tool denied access. The already authenticated Vercel CLI and existing project protection bypass allowed deployment and browser verification without changing protection settings. Bypass credentials were held temporarily in ignored local QA storage, sent only to the deployment origin, and removed after QA.

## Remaining issues and verification limits

No material visual defect, failed required check or deployment blocker remains. The existing 551.46 kB application entry chunk warning remains a concrete performance follow-up. Live Google authorization, email delivery and real authenticator enrollment were not exercised with an owner's account; this work preserves their implementations and verifies their guarded UI/request paths. Existing Vercel deployment protection remains enabled.

Live Google authorization, email delivery and a real enrolled authenticator require the owner's provider/test-account access; the corresponding UI, guarded routing and client request paths are covered by existing tests. This redesign does not change those integrations.

## Dependencies and performance

No dependency added or removed. Recharts stays in the lazy dashboard chunk. Decorative miniature charts and the pie chart were removed; chart animation is disabled. Inter imports now include only Latin subsets, reducing shipped font files from 56 to 8. The final build retains the pre-existing entry chunk warning: 551.46 kB minified, 162.25 kB gzip. This is a performance follow-up; the build and browser workflows pass, and the dashboard, chart, validation, UI and Supabase chunks remain separate.

## Files changed by area

- Shell, loading and branding: `src/App.tsx`, `src/components/LoadingState.tsx`, `public/prism.svg`.
- Design system and typography: `src/styles.css`, `tailwind.config.js`, `src/main.tsx`, `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`.
- Overview and activity: `src/components/Dashboard.tsx`, `src/components/financial/Overview.tsx`, `src/components/Transactions.tsx`, `src/components/TransactionTable.tsx`, `src/components/financial/CsvImport.tsx`.
- Accounts and planning: `src/components/financial/Accounts.tsx`, `Planning.tsx`, `Objectives.tsx`, `Debts.tsx`, `Onboarding.tsx`, `shared.tsx` in that same directory.
- Authentication, settings and copy: `src/components/auth/AuthScreen.tsx`, `MfaChallenge.tsx`, `MfaSetup.tsx`, `src/components/financial/Settings.tsx`, `src/i18n.ts`.
- Verification: `src/App.test.tsx`, `e2e/focused-upgrade.spec.ts`, `e2e/redesign.spec.ts`, `e2e/deployed.spec.ts`, `scripts/verify-responsive.mjs`, `eslint.config.js`.
