import { financialInstant } from "@/domain/dates";
import { decimalMoney, parseMoney } from "@/domain/money";
import { transactionPageTransport } from "@/domain/transport";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/store/useAppStore";
import type { Currency } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { financeKeys, useProfile } from "./useFinanceData";
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
export function useFinancialReport(month: string) {
  const { user, loading, requiresMfa } = useAuth();
  const profile=useProfile();
  const timezone=profile.data?.financial_timezone;
  const start = new Date(`${month}-01T00:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - 5);
  const from = start.toISOString().slice(0, 7);
  return useQuery({
    queryKey: [...financeKeys.all(user?.id), "report", month, timezone],
    enabled: !!user && !loading && !requiresMfa && !!timezone,
    queryFn: async ({ signal }) => {
      if (!user) throw new Error("Sign in first.");
      const [monthly, net] = await Promise.all([
        supabase
          .from("finance_monthly_totals")
          .select("*")
          .eq("user_id", user.id)
          .gte("month", from)
          .lte("month", month)
          .abortSignal(signal),
        supabase
          .from("finance_net_flow")
          .select("*")
          .eq("user_id", user.id)
          .abortSignal(signal),
      ]);
      if (monthly.error) throw monthly.error;
      if (net.error) throw net.error;
      return { monthly: monthly.data, net: net.data };
    },
  });
}
export function nativeBound(value: string, currency: Currency) {
  return decimalMoney(parseMoney(value, currency), currency);
}
export function dateFilterInstant(date: string, timezone: string) {
  return financialInstant(`${date}T12:00`, timezone);
}
