import type { Objective, ObjectiveContribution, Transaction, Transfer } from '../types/index.ts';
import type { GoalActionPlan } from '../types/actions.ts';
import { decimalMoney, parseMoney } from './money.ts';
import { occurrenceDate } from './recurrence.ts';
import {hasOccurred} from './dates.ts';

/** Separate evidence of a cash transfer from notional earmarks and old links.
 * The transfer itself is never added twice. No account balance is inferred. */
export function goalFunding(goal: Objective, contributions: ObjectiveContribution[], transactions: Transaction[], transfers: Transfer[], now = Date.now()) {
  let transferred = 0n, earmarked = 0n, legacy = 0n;
  const events = new Set<string>();
  for (const row of contributions) {
    if (row.objective_id !== goal.id || row.currency !== goal.currency || !hasOccurred(row.contributed_at,now)) continue;
    if (row.transfer_id) {
      const transfer = transfers.find(t => t.id === row.transfer_id && t.destination_currency === goal.currency);
      if (!transfer || !hasOccurred(transfer.occurred_at,now) || events.has(transfer.id)) continue;
      events.add(transfer.id); transferred += parseMoney(transfer.destination_amount, goal.currency);
    } else if (row.transaction_id) {
      const tx = transactions.find(t => t.id === row.transaction_id && t.currency === goal.currency);
      if (!events.has(row.transaction_id) && ((tx && hasOccurred(tx.transaction_date,now)) || (!tx && row.effective_amount !== undefined))) {
        events.add(row.transaction_id); legacy += parseMoney(row.effective_amount ?? tx?.amount ?? '0', goal.currency);
      }
    } else earmarked += parseMoney(row.effective_amount ?? row.amount ?? '0', goal.currency);
  }
  const total = transferred + earmarked + legacy;
  const target = parseMoney(goal.target_amount, goal.currency);
  return { transferred: decimalMoney(transferred, goal.currency), earmarked: decimalMoney(earmarked, goal.currency), legacy: decimalMoney(legacy, goal.currency), funded: decimalMoney(total, goal.currency), remaining: decimalMoney(target > total ? target-total : 0n, goal.currency), percent: target > 0n ? Math.min(100,Number(total*10000n/target)/100) : 0, completed: target>0n && total>=target };
}

export function goalProjection(remaining: string, plan: GoalActionPlan, fromDate: string): string | null {
  const gap = parseMoney(remaining, plan.currency), amount = parseMoney(plan.cadence_amount, plan.currency);
  if (gap <= 0n || amount <= 0n) return null;
  const count = (gap+amount-1n)/amount;
  // Bounded forecast, not an assertion that extremely distant dates are known.
  if (count > 1200n) return null;
  const rule={start:plan.start_date,frequency:plan.frequency,interval:1,end:null};
  for(let first=0;first<1200;first++){
    const date=occurrenceDate(rule,first);
    if(date&&date>=fromDate)return first+Number(count)<=1200?occurrenceDate(rule,first+Number(count)-1):null;
  }
  return null;
}
