# P.R.I.S.M. — Gate 2 accessibility remediation

11 October 2026, Asia/Kuala_Lumpur. **GO for one separately authorized controlled branch update and a complete remote CI run.** This is a local remediation checkpoint; remote CI, hosted acceptance and production readiness are not accepted.

Repository: `ismailabs/prism`. Branch: `codex/phase7-readiness`. Starting HEAD: `d64c96d25ac800fb9b99b5c2840cea0582883ebb`. The exact resulting local commit is recorded in the ignored `artifacts/gate2-remediation/checkpoint.json` and the task's final report; it is the commit containing this document.

## Confirmed failure and reproduction

[Run 38065789491](https://github.com/ismailabs/prism/actions/runs/38065789491), job `114253040904`, failed in **`npm run test:ledger-preview`**. `npm run test` passed all 163 unit cases. The failing axe rule was `scrollable-region-focusable`, impact serious, target `.scroll`, HTML `<div class="scroll">`.

The committed HTML was reproduced locally with bundled Chromium. Its existing 1280px and 390px checks passed on Windows; at 320px the unchanged table overflowed and produced the exact serious rule/target. Linux is unavailable locally, so this reproduces the defect under real overflow, rather than claiming an identical Ubuntu environment. The new regression was also run against the unfixed HTML and exited 1 with that same axe finding.

| 320px English case | Before | After |
| --- | --- | --- |
| Container/content width | 246px / 301px | 246px / 301px |
| DOM tabIndex | -1 | 0 |
| Axe violations | Serious `scrollable-region-focusable` on `.scroll` | None |
| Focused group name | No named group | Ledger accounts / Akaun lejar |
| Keyboard behavior | No explicit cross-browser focus contract | Tab reaches group, arrows scroll right/left, Tab exits to journal, Shift+Tab returns |

## Scoped correction and regression

Only three attributes were added to the existing scroll div: `role="group"`, `aria-labelledby="accountsTitle"`, `tabindex="0"`. The group uses the existing translated heading and preserves table semantics without adding another region landmark inside the already-labelled section. Existing CSS, rendering JavaScript, fixture data and all remaining HTML bytes are unchanged after text line-ending normalization.

The test adds English/Malay checks at 320px that require actual overflow, reach the named group through sequential Tab navigation, verify visible focus, exercise both scroll directions, and verify keyboard exit/re-entry. Both existing desktop/mobile axe assertions, WCAG tags and zero-violation expectations remain intact; two narrow-width axe scans were added. No severity threshold, rule, test or authorization assertion was disabled.

`--chromium` selects bundled Chromium for local reproduction. The normal Windows command retains Edge, and CI's normal Linux command retains Chromium. No workflow or dependency change was made.

## Verification and separate review

Focused `node scripts/ledger-preview-test.mjs --chromium` passed. The standard Edge preview gate passed in the complete run:

```text
node scripts/phase7-local-acceptance.mjs
30/30 gates passed; inputsUnchanged=true; 1,192.685 seconds
163 unit cases / 20 files; 122 E2E cases; 5 PWA cases; 481 layout checks
Synthetic cold restore: 28 public/Auth/private tables, 17 migrations
```

The run includes typecheck, lint, build, all finance/ledger/planning/actions/intelligence database and native HTTP gates, independent review probes, restore, localization, source packaging, PWA review/browser, E2E and responsive checks. Environment: Windows, Node 24.19.0, npm 11.17.0, Edge 155.0.4283.45, bundled Chromium 153.0.8010.12, synthetic PGlite/native PostgreSQL 18.4/PostgREST fixtures. No hosted target was used.

Retained source-bound run: `artifacts/phase7/gates-1791648894585/`. Its 248-input receipt SHA-256 is `c5f77e224965f968e14adaee948da2825a448c00454677f772ae3fd63d211e86`. The earlier Phase 7 receipts remain historical evidence for their original source, not acceptance of a later commit.

A separate review pass compared all tracked inputs with the starting commit: only the preview HTML and its test changed before this document was added. Five before/after viewport probes (1280, 390, 320, 280, 240px) had identical dimensions and zero after-fix axe violations. English/Malay accessibility-tree snapshots preserved the table, headers and cells. Inspected 320px focus screenshots show the existing 3px outline with 3px offset and no page-level horizontal overflow. Financial modules, balances, SQL/migrations, Auth/RLS/MFA, application code, lockfile, CI and deployment settings were untouched. This is a separate source/evidence pass by the same agent, not an external accessibility audit.

Local evidence is retained under `artifacts/gate2-remediation/`: `baseline-width-probes.json`, `red-regression.log`, `after-chromium.log`, `after-width-probes.json`, `accessibility-layout-review.json`, focus screenshots and `scope-review.json`. Generated evidence is ignored and excluded from the commit. The checkpoint receipt records staged review, secret-scan results, exact commit/parent/tree and clean status.

## Next boundary

No push, PR, merge, deployment, Vercel configuration change or hosted database operation was performed during remediation. The previous remote run remains failed; local green results do not establish Ubuntu CI, physical-device, manual screen-reader, managed PG17 or production acceptance.

For the next separately authorized publication: verify the remote candidate still equals the starting SHA, main is unchanged, the exact Vercel project still has `previewDeploymentsDisabled: true` and production branch `main`, then make one non-force update of this branch to the reviewed new SHA. Require the entire remote workflow to pass and monitor for unexpected deployments. Existing Gate 1 hosted, security, legal, device and operational acceptance requirements remain open.
