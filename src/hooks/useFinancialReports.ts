import { financialInstant } from "@/domain/dates";
import { validateDailyTotal } from '@/domain/intelligence';
import { decimalMoney, parseMoney } from "@/domain/money";
import { transactionPageTransport } from "@/domain/transport";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import type { Currency } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { financeKeys, useProfile } from "./useFinanceData";
import type { MonthlyTotal } from "@/types";
import type { Period } from "@/domain/analytics";
export interface TransactionFilters {
  search?: string;
  type?: string;
  category?: string;
  payment?: string;
  account?: string;
  currency?: string;
  min?: string;
  max?: string;
  from?: string;
  to?: string;
  activity?: string;
}
async function dailyTotals(
  userId: string,
  from: string,
  to: string,
  signal: AbortSignal,
) {
  const rows: MonthlyTotal[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabase
      .from("finance_daily_totals")
      .select("*")
      .eq("user_id", userId)
      .order("financial_date")
      .order("currency")
      .order("type")
      .order("category_id")
      .range(offset, offset + 999)
      .abortSignal(signal);
    if (from) query = query.gte('financial_date', from);
    if (to) query = query.lte('financial_date', to);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data.map(row => validateDailyTotal(row, userId)));
    if (data.length < 1000) return rows;
  }
}
export function useAnalyticsReport(period: Period, enabled = true) {
  const { user, loading, requiresMfa } = useAuth();
  const timezone = useProfile().data?.financial_timezone;
  return useQuery({
    queryKey: [
      ...financeKeys.all(user?.id),
      "analytics",
      period.comparison === false ? period.from : period.previousFrom,
      period.to,
      timezone,
    ],
    enabled: enabled && !!user && !loading && !requiresMfa && !!timezone,
    queryFn: async ({ signal }) => {
      if (!user) throw new Error("Sign in first.");
      return dailyTotals(
        user.id,
        period.comparison === false ? period.from : period.previousFrom,
        period.to,
        signal,
      );
    },
  });
}
export function useTransactionPage(filters: TransactionFilters, page: number) {
  const { user, loading, requiresMfa } = useAuth();
  const timezone = useAppStore((s) => s.financialTimezone);
  return useQuery({
    queryKey: [
      ...financeKeys.all(user?.id),
      "transaction-page",
      filters,
      page,
      timezone,
    ],
    enabled: !!user && !loading && !requiresMfa,
    queryFn: async ({ signal }) => {
      if (!user) throw new Error("Sign in first.");
      const validated = { ...filters };
      if (filters.min)
        validated.min = nativeBound(filters.min, filters.currency as Currency);
      if (filters.max)
        validated.max = nativeBound(filters.max, filters.currency as Currency);
      const { data, error } = await supabase
        .rpc("transaction_page", { p_filters: validated, p_page: page })
        .abortSignal(signal);
      if (error) throw error;
      return transactionPageTransport.parse(data);
    },
  });
}
export function useFinancialReport(period: Period, enabled = true) {
  const { user, loading, requiresMfa } = useAuth();
  const profile = useProfile();
  const timezone = profile.data?.financial_timezone;
  const totals = useAnalyticsReport(period, enabled);
  const net = useQuery({
    queryKey: [...financeKeys.all(user?.id), "net-flow", timezone],
    enabled: enabled && !!user && !loading && !requiresMfa && !!timezone,
    queryFn: async ({ signal }) => {
      if (!user) throw new Error("Sign in first.");
      const response = await supabase
          .from("finance_net_flow")
          .select("*")
          .eq("user_id", user.id)
          .abortSignal(signal);
      if (response.error) throw response.error;
      return response.data;
    },
  });
  return { data: totals.data && net.data ? { monthly: totals.data, net: net.data } : undefined,
    isPending: totals.isPending || net.isPending, error: totals.error ?? net.error,
    refetch: () => Promise.all([totals.refetch(), net.refetch()]) };
}
export function nativeBound(value: string, currency: Currency) {
  return decimalMoney(parseMoney(value, currency), currency);
}
export function dateFilterInstant(date: string, timezone: string) {
  return financialInstant(`${date}T12:00`, timezone);
}
