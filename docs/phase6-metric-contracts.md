# Phase 6 metric contracts

Entry: `codex/phase5-actions` at `3eb8ee4572d84b458426e8a3a0e8f92f0d0fad74`. Requirements: `C:/Users/moham/OneDrive/Desktop/MAIOS/PHASE 6/06_ANALYTICS_FORECASTS_AND_INTELLIGENCE.md`, SHA-256 `1FEEE48D1001B512635801AEF6F85D00B10201BB1B919DED4F1D43F9D61D4048`.

Keep the exact legacy authority, immutable provisional ledger, RLS/session/MFA, native currencies, owned query families and Phase 5 actions. Repair the misleading savings-rate identifier and inspectability of analytics. Add native position, deterministic scenarios, bounded rules and guided review. Defer live ledger cutover, unsupported merchant aggregation, historical valuations/FX, arbitrary health scores, financial automation and all publication/hosted acceptance. No new persisted projection is needed.

## Shared rules

Observed flows come from owner-scoped `finance_daily_totals`, which excludes future timestamps and non-ordinary savings/principal transactions. Account balances come only from `exact_accounts`; the latest 50 transactions are never used to reconstruct a complete balance. Present balances include opening balances, posted account transactions, own transfers and linked/unlinked repayments according to the existing SQL definitions. An archived account is still a recorded account. Accounts have no asset-class taxonomy; their sum is **recorded account balance**, not complete cash, assets or spendable cash.

Amounts remain native decimal strings with bigint minor-unit arithmetic. MYR/USD/EUR display two digits; JPY displays no fractional digits. Aggregate bounds can exceed a single record's bound. Ratios round half away from zero to one decimal percent. Calendar ranges are inclusive in the profile's IANA financial timezone. Comparisons use the existing equal elapsed window (month/3/6/12 months, YTD/custom); an incomplete period is disclosed. Empty successful queries can establish zero observed flow; errors/missing exact transport establish unavailable, never zero.

Legacy edits recompute observed reports from current source records; this is a restated record view, not an immutable historical valuation. Provisional journal corrections use inverse reversals and preserve history; they do not silently replace the legacy authority. No conversion is persisted. Converted chart/period totals are presentation estimates using one current rate set, with its source/time disclosed; there is no historical FX or net-worth chart. Accessible exact-value tables remain the numerical chart authority.

| Metric | Definition and source | Eligibility / comparison / missing policy | Drilldown |
| --- | --- | --- | --- |
| Income / expense | Sum eligible daily totals by native currency and type | Selected range; prior equal window; true zero on successful empty report | Ordinary transactions, dates/type/category |
| Operating surplus / tracked net flow | Income minus expense; `finance_net_flow` is all-time ordinary flow | Includes eligible interest; excludes own transfers, principal and earmarks; never net worth | Ordinary transactions |
| Operating surplus rate | `(income − expense) / income × 100` | Undefined when income <= 0; not actual savings/funding rate | Definition plus income/expense records |
| Category amount/share/count | Eligible daily totals for category; share divided by same-type total | Zero/negative denominator has no meaningful share; stable identity colors; new prior-zero activity has undefined percentage change | Category/date/type transactions |
| Monthly chart | Same eligible daily totals grouped by financial month | Exact native totals in table; number values only for chart geometry; partial final month disclosed | Month/type transactions |
| Recorded account balance | Native sum of exact account view balances | All owned accounts including archived; unavailable without accounts or exact balances; present snapshot only | Account records |
| Recorded debt / receivables | Original amount minus occurred effective repayment, floored at zero, split by direction | Complete owned repayments, same currency; missing linked effective amount is unavailable; not all liabilities/assets | Debt history |
| Assets / net worth / change/history | Complete reconciled ledger and valuations would be required | Unavailable in this legacy-authority phase; receivables are not cash; no fabricated zero/history | Provisional accounting explanation |
| Goal evidence during review | Occurred contributions in selected range, separately transfer / earmark / legacy-link evidence | Source-aware Phase 5 funding; overlapping earmarks are non-additive intentions, not newly saved money; no invented funding rate | Goals and source contribution history |
| Recorded debt reduction | Effective occurred repayments of `i_owe` debts in review range | Legacy schema identifies repayment amounts, not verified principal/interest splits; labeled recorded reduction, not authoritative amortization | Debt history |
| Recurring cash scenario | Recorded balance + future confirmed recurring income − future confirmed recurring expense over next 30 calendar days | Only matching recorded accounts in the same currency; uses rule next index/anchor/end; excludes overdue backlog and unmapped rules (still listed separately); not posted money | Rule/calendar source |
| Debt-plan / goal-plan scenarios | Anchored future minimum-payment / contribution cadence amounts | Displayed separately: possible overlap with rules; goals do not reduce aggregate owned cash; no automatic posting or probability | Plans / goals |
| Budget remaining | Available signed-rollover budget minus eligible spending | Existing `budgetBalances`; unknown propagates; current month only | Budget plan and ordinary category expense |
| Budget run rate | Observed month-to-date spending + observed daily pace × remaining calendar days | Rounded native scenario; ±20% sensitivity applies only to future spending, keeps observed spending fixed, and is not a confidence interval; assumes unchanged pace and complete records | Source spending and budget |
| Review variance / unusual spend | Native selected minus prior eligible totals/category | Only a comparable non-partial window supports unusual-spending rule (>=50% and positive baseline); prior zero means new activity | Prior/current transaction ranges |

## Rules and limits

At most five intelligence notices, ordered budget risk, debt due, goal pace, negative recurring scenario and category variance. Each exposes its input/formula/assumption and source. Wording asks the user to review; no automated advice or action. Forecast horizon is 30 days; bounded occurrence scans fail visibly when a rule backlog exceeds 10,000 or goal anchor exceeds 1,200 occurrences. Unmapped debts/due dates, accountless rules, inactive/paused plans and possible plan/rule overlap are disclosed. Debt due amount is outstanding balance information, never guessed payment cash.

The current month review is a guided checklist of flows, goal evidence, recorded repayments, unavailable net-worth change, variance and future bills. The selected period applies to observations; forecast dates always use today's financial date and are separately labeled. Viewing/reviewing has no mutation endpoint.
