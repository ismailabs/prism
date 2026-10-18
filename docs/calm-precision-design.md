# Calm Precision implementation

PRISM retains its React/Vite/Supabase stack and financial engine. This change
reorganizes the frontend around recorded money, its source, and deliberate next
actions. It introduces no schema migration, bank connection, financial advice,
accounting cutover or unattended posting.

## Shared system

Warm neutral light surfaces and evergreen interactions have semantic dark
counterparts. Local Inter, tabular financial numerals, restrained borders and
14px form labels improve consistency. Shared buttons and form fields use 44px
targets, with larger phone navigation targets; keyboard focus
has a separate blue token. Reduced motion, density and existing accent choices
remain supported. The faceted vector mark also generates the favicon and install
icons deterministically with the existing local browser runtime.

Navigation lives in `src/components/app-shell/Navigation.tsx`. The wide sidebar
groups all sixteen destinations; the medium navigation exposes the complete
route set. Compact screens use Home, Transactions, Add, Plans and More, with safe
area padding. Both drawer openers retain focus restoration. The current page
annotation, browser history, original routes, command palette and shortcuts remain.
`pageCopy.ts` provides a concise EN/MS purpose for every private screen.

## Financial surfaces

- Overview gives recorded period cash flow the dominant position and explicitly
  excludes transfers, principal and earmarks. Account cash appears separately.
  The all-time flow remains available through a disclosure. A bounded six-month
  daily-total query supplies the trend independently of the summary's selected
  period; its exact data table and source drilldowns remain accessible.
- Advanced position, explainable review and future scenarios remain available
  behind a disclosure. Saved module order is preserved; the fresh default puts
  comparison, categories, account/goal/debt context and activity first.
- Transactions retain the backend page/search/filter contract and current-page
  CSV export. Active chips can be cleared individually. URL synchronization
  preserves source context IDs and account/currency/search filters. Loading and
  failed requests have separate states and cannot look like successful emptiness.
  Both table and phone rows show account context and category identity.
- Add/edit keeps the exact parser, canonical decimal text, timezone conversion
  and associated validation errors. Currency-specific guidance is visible. A
  synchronous submit lock holds through the confirmed save/read, preventing two
  rapid submissions. Narrow dialogs keep save controls reachable.
- Account cards open their actual account/currency-filtered activity. Goals,
  savings, planning, obligations and supporting tools share the same surfaces
  while retaining all mutations, history, confirmation and source links. Progress
  percentages and ARIA values now respect the amount privacy preference.
- Optional setup reports the steps confirmed during its last save attempt.
  Preferences, categories and account creation still use separate existing
  operations; partial completion is disclosed instead of being called atomic.
- Analytics disclosure targets are large enough for touch and keyboard focus.
  Accounting still inspects a partial private shadow ledger, with a separate
  synthetic example. Historical README statements were corrected using current
  read-only migration metadata; posting authority did not change.
- Public, authentication, settings and offline experiences inherit the refined
  typography, colors, geometry and focus rules. Published policy copy and the
  Auth/MFA/recovery/CAPTCHA/session/RLS/cache contracts are preserved.

## Reference adaptations

The uploaded images guide hierarchy and visual rhythm. Their fictional data,
bank connectivity, future dates and unsupported predictions are not product
requirements. PRISM therefore uses **recorded cash flow**, **surplus rate**,
**recorded account balances**, **earmarks** and **principal**, with native amounts
separate and FX estimates qualified. Existing scenario assumptions remain visible;
no guaranteed completion date or fabricated month-over-month improvement is added.

## Reproducing local evidence

Use the existing locked dependencies and synthetic test infrastructure:

```text
node scripts/calm-precision-verify.mjs core
node scripts/calm-precision-verify.mjs database
node scripts/calm-precision-verify.mjs native
node scripts/calm-precision-verify.mjs browser
node scripts/calm-precision-verify.mjs safety
```

Native checks need the documented local PostgREST binary. Receipts include actual
exit codes and timing under ignored `artifacts/calm-precision`. Run browser groups
serially: they own the same loopback port and output directory. The core build has
a separate output directory so it cannot replace a running browser bundle.

On Windows, each spec file has its own Playwright project and browser worker.
This releases browser/axe/screenshot caches between files on constrained hosts;
all cases, deadlines and assertions are retained, with one shared loopback server
and one worker at a time. Linux CI retains the existing project configuration.
The grouping uses [Playwright projects](https://playwright.dev/docs/test-projects#splitting-tests-into-projects)
and was checked against the installed runner's project-specific worker identity.
`npm run test:e2e` additionally uses `scripts/browser-test.mjs` to release the
entire Playwright process between Windows spec files. It collects the complete
catalog first and verifies each file's exit code and actual passed count against
that collection. No assertion, timeout or retry is relaxed. Explicit CLI filters
and Linux retain the normal runner; all per-file logs and receipts are preserved.
Windows unit checks use one Vitest worker to reduce memory contention, using the
documented [maxWorkers setting](https://vitest.dev/config/maxworkers). Linux keeps
its original default concurrency. Test counts, isolation and deadlines remain.

`e2e/calm-precision.spec.ts` independently reconciles MYR 5200 income minus 3060
spending, 2840/2200 account cash, 3000 of 5000 allocated, and 900 outstanding
principal. It exercises all private routes with synthetic accounts, screenshots,
axe, themes/locales, deep links, error states, repeated submit and reflow.
Its privacy case checks masked percentages, omitted ARIA values, hidden milestone
text, zero visual progress disclosure and restored values after toggling privacy off.
`scripts/calm-precision-capture.mjs` captures goal detail from a loopback fixture
server; `render-prism-icons.mjs` reproduces the canonical icon assets.

The acceptance register maps package IDs to evidence. The delivery report records
the final outcomes. Automatic accessibility and synthetic provider tests do not
certify a physical device, human assistive technology, hosted Auth, PostgreSQL 17,
legal/operations approval or production launch.

## Publication and rollback

The dedicated development branch disables its own automatic Git deployment in
`vercel.json`, using Vercel's [branch deployment configuration](https://vercel.com/docs/project-configuration/git-configuration#gitdeploymentenabled).
This does not change any hosted setting or main's deployment behavior. No preview
or production deployment is authorized. The implementation can be reverted through
ordinary reviewed Git commits; no database rollback or data conversion is needed.
