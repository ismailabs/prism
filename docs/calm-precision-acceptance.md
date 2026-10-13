# Calm Precision acceptance register

Source package revision: 13 October 2026. Implementation began at
`d1438197a33d179cedd6c54bad3bfcf9a06db31f` in the supplied `0d5f` worktree.
This register maps the package's scenarios to actual local test sources. Final
results and source hashes are recorded in the delivery report and verification receipt; this mapping
alone does not assert a pass.

| Contract IDs | Required behavior | Verification source |
| --- | --- | --- |
| FIN-01, FIN-02 | Exact large decimal text, currency precision, invalid no-write behavior | money/transport domain tests; native PostgREST; transaction-amount browser cases |
| FIN-03, FIN-04 | Eligible ordinary flow; separate account cash and opening amounts; exclude future records | dashboard/progress/period domain tests; independent Calm Precision fixture |
| FIN-05, FIN-06 | Atomic transfers, two historical native amounts, no ordinary spending | foundations/native database suites; foundations browser cases |
| FIN-07, FIN-08 | Allocation without cash movement; funded/unfunded principal and debt direction | goals/actions/progress database and browser cases; independent fixture |
| FIN-09, FIN-10 | Ownership, direction, overpayment, DST, recurrence anchors and confirmation idempotency | native PostgreSQL; planning/actions/period suites |
| FIN-11 | Missing FX produces unavailable estimates while native records remain exact | enhancement/domain/intelligence cases |
| FIN-12 | Partial read-only shadow ledger, separate synthetic example and currencies | hosted-ledger browser fixtures; ledger database/preview |
| DATA-01 | Server-filtered/paged transactions; account/currency deep links | transaction page/pagination tests; Calm Precision account drilldown |
| DATA-02 | Atomic bounded CSV preview/import, semantic duplicates, safe current-page export | foundations/planning/hardening browser and database cases |
| DATA-03 | Identity/session/deletion query-cache isolation | privateCache/connectivity unit tests; auth-security and PWA fixtures |
| AUTH-01, AUTH-02 | Safe protected returns, PKCE, MFA, recovery, CAPTCHA representation | auth-routing, phase3, auth-security; no hosted Auth configuration changes |
| AUTH-03 | Anonymous/cross-owner/session/MFA denials | disposable native PostgreSQL/PostgREST and deletion/ledger suites |
| UX-01, UX-06 | All deep routes, back/forward, connected source links and filters | actions/intelligence/phase3/Calm Precision fixtures |
| UX-02 | Confirmed CRUD, one exact rapid submit, accessible error/save | transaction-amount, modal-focus, Calm Precision submit/reflow |
| UX-03 | Loading/error distinct from empty, disabled/retry feedback | Calm Precision pending/error test; hardening/actions suites |
| UX-04 | Working CTAs, synthetic separation, no invented bank or prediction claims | public/phase3/planning/actions/hosted-ledger cases and source review |
| UX-05 | Independent MYR 2140 cash flow, native 2840/2200 cash, 60% allocation, 900 principal | Calm Precision independent synthetic fixture |
| A11Y-01, A11Y-05 | Landmarks, names, labels, chart data and automated WCAG checks | 64 route/viewport/locale/theme axe scans; existing focused axe cases |
| A11Y-02, A11Y-03 | Drawer/dialog focus, Escape, restoration, palette and keyboard actions | modal-focus, enhancements, phase3 and Calm Precision |
| A11Y-04 | 320px reflow, huge/long values, short dialogs, touch targets and safe area | responsive runner; 200/400% equivalent CSS reflow; amount forms |
| I18N-01, THEME-01 | EN/MS, light/dark, contrast, reduced motion | localization AST audit; four-mode screen captures; axe and responsive |
| PWA-01 | Public-only cache, offline denial, deliberate update and no financial replay | PWA/review/connectivity/cache suites |
| DELIV-01 | No secrets, credentials, customer finance or generated build output in publication | redacted Gitleaks history/source/candidate scans and staged allowlist |
| DELIV-02 | Dedicated branch and actual PR; no deployments or merge | final remote-ref and provider deployment inspection |

The fixture dates and identities are artificial. Account cash is independently
calculated from an opening balance, ordinary transactions, transfer and funded
principal; goal earmarks are not subtracted. The visual references supply no
financial records or product functionality.

The 640/320 CSS-pixel reflow cases represent 1280-pixel content at 200/400 percent
zoom geometry. They do not certify a real device's virtual keyboard, OS zoom or
screen reader. Those human checks and operational/legal launch acceptance remain
separate from this development PR. Automated axe results are not a complete WCAG
conformance claim.

## Approved scope crosswalk

The package's fifteen areas are evidenced by the implementation and delivery
records below; they are not separate invented product features.

| Area | Concrete delivery evidence |
| --- | --- |
| 1 Executive outcome / 5 UX strategy | Recorded cash-flow hierarchy, separate native position, ranked categories, working source drilldowns and deliberate next actions |
| 2 Research confidence | Initially clean exact main SHA, refreshed remote/repository identity, metadata-only provider receipts, package hash and factual README chronology |
| 3 Feature inventory / 8 Screen specifications | Every retained route and workflow in the delivery report's screen matrix; original domain/database/browser contracts retained |
| 4 Findings | Reproducible SSR, target-size, contextual URL, amount-label, tablet decimal and test-readiness findings with remediation logs |
| 6 Chosen direction / 9 Design system | Shared semantic CSS tokens, local typography, canonical icon assets, responsive navigation, EN/MS copy, focus and form primitives |
| 7 Information architecture | Typed groups include all sixteen destinations; native href/current-page behavior, mobile drawer and complete tablet navigation |
| 10 Ethical interaction | Explicit flow/earmark/principal/estimate definitions, separate synthetic example, confirmed partial saves, no automatic financial writes or fabricated forecasts |
| 11 Technology | React/Vite/Supabase retained; selected app-shell extraction and bounded trend source; no financial-domain/schema/Auth/cache rewrite or new dependency |
| 12 Roadmap | Milestones 0–9 in the implementation ledger, tied to final actual verification and publication outcomes |
| 13 Visual references | Three product boards inspected; actual phone/tablet/desktop images reviewed; six synthetic representative images retained in documentation |
| 14 Autonomous implementation | Supplied worktree reused, authorized branch publication and actual PR identity in the final delivery record |
| 15 Readiness | Local tests separated from no-deployment scope, hosted provider uncertainty, human/device/AT and operational/legal launch gates |

Final PASS outcomes depend on the execution receipts and real publication record,
not on this crosswalk alone. The ledger and delivery report record outstanding work
until their final checks complete.
