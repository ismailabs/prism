import { decimalMoney, parseMoney } from './money';
import type { Account, DebtRepayment, Objective, ObjectiveContribution, PersonDebt, Transaction } from '@/types';

function linkedAmount(amount: string | null, transactionId: string | null, transactions: Transaction[], currency: Objective['currency']): bigint {
  if (!transactionId) return parseMoney(amount ?? '0', currency);
  const transaction = transactions.find(item => item.id === transactionId);
  return transaction && transaction.currency === currency && new Date(transaction.transaction_date).getTime() <= Date.now() ? parseMoney(transaction.amount, currency) : 0n;
}

export function objectiveProgress(objective: Objective, contributions: ObjectiveContribution[], transactions: Transaction[]) {
  const fundedMinor = contributions.filter(item => item.objective_id === objective.id).reduce((total, item) => total + linkedAmount(item.amount, item.transaction_id, transactions, objective.currency), 0n);
  const targetMinor = parseMoney(objective.target_amount, objective.currency);
  return {
    funded: decimalMoney(fundedMinor, objective.currency),
    remaining: decimalMoney(targetMinor > fundedMinor ? targetMinor - fundedMinor : 0n, objective.currency),
    percent: Math.min(100, Number(fundedMinor * 10000n / targetMinor) / 100),
    completed: fundedMinor >= targetMinor,
  };
}

export function debtProgress(debt: PersonDebt, repayments: DebtRepayment[], transactions: Transaction[]) {
  const paidMinor = repayments.filter(item => item.debt_id === debt.id).reduce((total, item) => total + linkedAmount(item.amount, item.transaction_id, transactions, debt.currency), 0n);
  const originalMinor = parseMoney(debt.original_amount, debt.currency);
  const remainingMinor = originalMinor > paidMinor ? originalMinor - paidMinor : 0n;
  return {
    paid: decimalMoney(paidMinor, debt.currency),
    remaining: decimalMoney(remainingMinor, debt.currency),
    percent: Math.min(100, Number(paidMinor * 10000n / originalMinor) / 100),
    settled: remainingMinor === 0n,
    overdue: remainingMinor > 0n && !!debt.due_date && debt.due_date < new Date().toISOString().slice(0, 10),
  };
}

export function accountBalance(account: Account, transactions: Transaction[]) {
  const opening = parseMoney(account.opening_balance, account.currency);
  const now = Date.now();
  const movement = transactions.filter(item => item.account_id === account.id && item.currency === account.currency && new Date(item.transaction_date).getTime() <= now).reduce((total, item) => total + (item.type === 'income' ? 1n : -1n) * parseMoney(item.amount, account.currency), 0n);
  return decimalMoney(opening + movement, account.currency);
}
