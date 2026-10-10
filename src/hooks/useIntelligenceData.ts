import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { buildIntelligence } from '@/domain/intelligence';
import { financialDate } from '@/domain/dates';
import type { Period } from '@/domain/periods';
import { useAuth } from './useAuth';
import { financeKeys, useCategories } from './useFinanceData';
import { useAnalyticsReport } from './useFinancialReports';
import { usePlatformTable } from './usePlatformData';
import { usePlanningData } from './usePlanningData';
import { useAdvancedPlanning } from './useAdvancedPlanning';
import { useGoalActions } from './useGoalActions';
import { useActionClock } from './useActionTimeline';
import { useAppStore } from '@/store/useAppStore';

/** Derive from complete owned exact views; never reconstruct from the recent-page cache. */
export function useIntelligenceData(period: Period) {
  const { user, loading, requiresMfa } = useAuth(), now = useActionClock();
  const timezone = useAppStore(s => s.financialTimezone), client = useQueryClient();
  const totals = useAnalyticsReport(period), categories = useCategories();
  const accounts = usePlatformTable('accounts'), debts = usePlatformTable('person_debts');
  const repayments = usePlatformTable('debt_repayments'), goals = usePlatformTable('objectives');
  const contributions = usePlatformTable('objective_contributions'), transfers = usePlatformTable('transfers');
  const { budgets, rules } = usePlanningData(), { contracts } = useAdvancedPlanning('contracts'), { plans } = useGoalActions();
  const queries = [totals, categories, accounts, debts, repayments, goals, contributions, transfers, budgets, rules, contracts, plans];
  const pending = queries.some(q => q.isPending), queryError = queries.find(q => q.error)?.error;
  const today = financialDate(new Date(now), timezone), lastDay = useRef(today);
  useEffect(() => {
    if (lastDay.current === today) return;
    lastDay.current = today;
    if (!user || loading || requiresMfa) return;
    // A calendar cutoff changes future eligibility even when nobody writes a record.
    void client.invalidateQueries({ queryKey: financeKeys.all(user.id) });
    void client.invalidateQueries({ queryKey: ['platform', user.id] });
  }, [today, user, loading, requiresMfa, client]);
  const result = useMemo(() => {
    if (!user || loading || requiresMfa || pending || queryError) return {};
    try {
      return { data: buildIntelligence({ userId: user.id, now, timezone, period,
        totals: totals.data!, categories: categories.data!, accounts: accounts.data!, debts: debts.data!, repayments: repayments.data!,
        goals: goals.data!, contributions: contributions.data!, transfers: transfers.data!, budgets: budgets.data!, rules: rules.data!,
        debtPlans: contracts.data!, goalPlans: plans.data! }) };
    } catch (error) { return { error }; }
  }, [user, loading, requiresMfa, pending, queryError, now, timezone, period, totals.data, categories.data,
    accounts.data, debts.data, repayments.data, goals.data, contributions.data, transfers.data,
    budgets.data, rules.data, contracts.data, plans.data]);
  return { ...result, error: queries.find(q => q.error)?.error ?? result.error,
    pending: loading || requiresMfa || queries.some(q => q.isPending), capturedAt: accounts.dataUpdatedAt,
    refreshing: queries.some(q => q.isFetching), refresh: () => Promise.all(queries.map(q => q.refetch())) };
}
