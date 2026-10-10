import { supabase } from "@/lib/supabase";
import { decimalMoney, parseMoney } from '@/domain/money';
import type { MonthlyBudget, RecurringRule } from "@/types";
import type { Json } from "@/types/database.generated";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { financeKeys } from "./useFinanceData";
export function usePlanningData() {
  const { user, loading, requiresMfa } = useAuth();
  const client = useQueryClient();
  const id = user?.id;
  const enabled = !!id && !loading && !requiresMfa;
  const verify = () => {
    if (!id || !enabled) throw new Error("A verified session is required.");
    return id;
  };
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["platform", id] }),
      client.invalidateQueries({ queryKey: financeKeys.all(id) }),
    ]);
  const budgets = useQuery({
    queryKey: ["platform", id, "monthly_budgets"],
    enabled,
    queryFn: async ({ signal }) => {
      const rows: MonthlyBudget[] = [];
      for(let offset=0;;offset+=1000){
      const { data, error } = await supabase
        .from("exact_monthly_budgets")
        .select("*")
        .eq("user_id", verify())
        .order("month", { ascending: false })
        .order('id')
        .range(offset,offset+999)
        .abortSignal(signal);
      if (error) throw error;
      rows.push(...data);
      if(data.length<1000) return rows;
      }
    },
  });
  const rules = useQuery({
    queryKey: ["platform", id, "recurring_rules"],
    enabled,
    queryFn: async ({ signal }) => {
      const rows: RecurringRule[] = [];
      for(let offset=0;;offset+=1000){
      const { data, error } = await supabase
        .from("exact_recurring_rules")
        .select("*")
        .eq("user_id", verify())
        .order("created_at")
        .order('id')
        .range(offset,offset+999)
        .abortSignal(signal);
      if (error) throw error;
      rows.push(...data);
      if(data.length<1000) return rows;
      }
    },
  });
  const budget = useMutation({
    mutationFn: async (
      input: Omit<MonthlyBudget, "id" | "user_id" | "created_at" | "spent">,
    ) => {
      const { error } = await supabase
        .from("monthly_budgets")
        .upsert(
          { ...input, amount:decimalMoney(parseMoney(input.amount,input.currency),input.currency),user_id: verify() },
          { onConflict: "user_id,category_id,currency,month" },
        );
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const removeBudget = useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from("monthly_budgets")
        .delete()
        .eq("user_id", verify())
        .eq("id", budgetId).select('id').single();
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const rule = useMutation({
    mutationFn: async (
      input: Omit<RecurringRule, "id" | "user_id" | "created_at">,
    ) => {
      const { error } = await supabase
        .from("recurring_rules")
        .insert({ ...input, amount:decimalMoney(parseMoney(input.amount,input.currency),input.currency),user_id: verify() });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const toggleRule = useMutation({
    mutationFn: async ({
      id: ruleId,
      active,
    }: {
      id: string;
      active: boolean;
    }) => {
      const { error } = await supabase
        .from("recurring_rules")
        .update({ active })
        .eq("user_id", verify())
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const record = useMutation({
    mutationFn: async ({
      rule,
      index,
      date,
    }: {
      rule: string;
      index: number;
      date: string;
    }) => {
      verify();
      const { data, error } = await supabase.rpc(
        "record_recurring_occurrence",
        { p_rule_id: rule, p_index: index, p_date: date },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: refresh,
  });
  const importRows = useMutation({
    mutationFn: async ({
      rows,
      batch,
      skip,
    }: {
      rows: Json;
      batch: string;
      skip: boolean;
    }) => {
      verify();
      const { data, error } = await supabase.rpc("import_transactions", {
        p_rows: rows,
        p_batch: batch,
        p_skip_duplicates: skip,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: refresh,
  });
  return {
    budgets,
    rules,
    budget,
    removeBudget,
    rule,
    toggleRule,
    record,
    importRows,
  };
}
