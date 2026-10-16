# Public-launch independent remediation

Starting PR #5 was independently matched to GitHub/API/fetched/advertised head
`345d26caa904c088c76f5c40c4435f6509260ffc`, with main ancestor
`d1438197a33d179cedd6c54bad3bfcf9a06db31f`. Its final-head CI logs were inspected:
166 units, uninterrupted 254 browser cases, 14 Auth cases, 5 PWA cases and 481
responsive checks; synthetic artifact 11857690727 has digest
`19efc5f05f5aa7d09e20c10c275ac354a32ca7dd9720f4d642fba735c3fcea47`.
These are baseline results; the new candidate requires fresh exact-head CI.

| Finding | Independent outcome and change | Evidence / remaining scope |
| --- | --- | --- |
| AUD-01 release control | Verified main Git integration and automatic custom-domain assignment; narrowed provider setting to false, independently confirmed original deployment/SHA. Candidate disables all Git auto-deployments. | Release freeze receipt and deployment playbook; no merge/promotion |
| AUD-02 password security | Current advisor still warns; Free plan cannot enable the hosted leaked-password feature. No paid upgrade or client-only substitute. | Provider metadata and current docs; BLOCKED |
| AUD-03 hosted/human acceptance | No isolated PRISM branch/test project among connected resources; human device/AT and operator records remain incomplete. | Staging/human handoff; BLOCKED |
| AUD-04 onboarding | Reproduced in EN/MS: unchecked categories claimed Complete after an account denial. Added pending/skipped/complete states without changing mutation contracts. Partial category denial/retry creates exactly three categories and one account. | Seven new browser regressions and all 19 phase3 cases PASS |
| AUD-05 transaction navigation | Reproduced retained search on an unfiltered return. Removed duplicated workspace search state; each remounted visit initializes from its URL, retaining item/context and browser history state. | Unfiltered navigation plus clear/Back/Forward/reload/source coverage |
| AUD-06 reporting load | 2005 synthetic aggregate rows load in exactly three 1000-row pages with owner/date bounds, stable ordering and exact 20.05 total. No source defect established. | Actual local render sample 2276 ms; hosted/mobile-network performance still BLOCKED |
| AUD-07 dependencies | Fresh audit: five inherited high development packages, zero runtime findings; upstream braces advisory still unpatched. Fixed trusted globs/no production watcher/bounded secrets-free CI constrain known path. | Security decision log; no forced upgrade or fabricated clean full audit |
| AUD-08 privacy/a11y | Existing derived masking and form/focus protections preserved; relevant public/setup keyboard, reflow and axe cases pass. Human device/AT cannot be supplied by automation. | Baseline route coverage and fresh phase3; exact-head CI and external acceptance required |
| AUD-09 DB notices | Read-only metadata: 25 RLS tables, 19 invoker views, restrictive session/MFA policies, no privileged client membership path. Private reservations deny client DML. Six uncovered FK and fifteen unused-index INFO notices remain performance triage. | Safe metadata summary; no customer EXPLAIN/rows, DDL, grants or policy changes |

## Failure history and verification boundaries

The first focused attempt ran four cases and failed all four: two confirmed category
status failures, one confirmed retained-search failure and one incorrect test-selector
failure. The first post-fix seven-case run passed five; its two remaining failures
were incorrect names for the existing clear-filter button and chart summary. Those
selectors were corrected from actual source/DOM; assertions and deadlines were not
weakened. The complete seven-case retest passed 7/7; the complete phase3 file passed
19/19. All logs/traces remain in ignored `artifacts/public-launch/{before,after,retest,phase3}`.

Fresh local commands passed: five core checks (166 units), sixteen database/review
commands, three native PostgreSQL/PostgREST commands and three PWA/recovery/package
checks. The native environment is disposable PostgreSQL 18 with loopback PostgREST
16.4 and synthetic Auth/session fixtures; it is not managed-provider acceptance.
Gitleaks 8.30.1, downloaded from the official release and checksum-verified, found no
secrets in all 43 existing commits or the reviewed candidate snapshot. Publication
also scans the actual staged delta. No source scanner exemption was introduced.

The seven new cases extend the main browser catalog to **261 cases in 19 files**.
The large-report receipt is explicitly allowlisted in required CI logs and optional
synthetic artifacts; no hosted authenticated state or raw provider dump is added.

## Source review

The React review checks state ownership, stable hook order, SSR guards, current
route initialization, functional state updates, locked asynchronous saves and live
status semantics. Finance calculations, decimal/bigint transport, migrations,
Auth/MFA hooks, Supabase client and private-cache security files are byte-preserved
from PR #5. No lockfile, dependency or styling rewrite is introduced. Native and
database cases retain ownership, insufficient MFA/session, transaction precision,
transfer atomicity, principal/provenance/idempotency and shadow-ledger boundaries.

No claim in this audit supplies human sign-off, hosted staging, public-registration
acceptance or GO. Every mandatory gate must independently PASS before release.
