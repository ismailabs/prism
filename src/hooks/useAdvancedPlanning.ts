import { supabase } from "@/lib/supabase";
import type { DebtPlan, ReservePlan } from "@/domain/planning";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { decimalMoney, parseMoney } from "@/domain/money";

export function useAdvancedPlanning(
  scope: "reserves" | "contracts" | "all" = "all",
) {
  const { user, loading, requiresMfa } = useAuth();
  const client = useQueryClient(),
    id = user?.id;
  const enabled = !!id && !loading && !requiresMfa;
  const verify = () => {
    if (!id || !enabled) throw new Error("A verified session is required.");
    return id;
  };
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["platform", id] });
  const reserves = useQuery({
    queryKey: ["platform", id, "reserve_plans"],
    enabled: enabled && scope !== "contracts",
    queryFn: async ({ signal }) => {
      const rows: ReservePlan[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("exact_reserve_plans")
          .select("*")
          .eq("user_id", verify())
          .order("month")
          .order("id")
          .range(offset, offset + 999)
          .abortSignal(signal);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
  });
  const contracts = useQuery({
    queryKey: ["platform", id, "debt_plans"],
    enabled: enabled && scope !== "reserves",
    queryFn: async ({ signal }) => {
      const rows: DebtPlan[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("exact_debt_plans")
          .select("*")
          .eq("user_id", verify())
          .order("id")
          .range(offset, offset + 999)
          .abortSignal(signal);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
  });
  const reserve = useMutation({
    mutationFn: async (
      input: Omit<ReservePlan, "id" | "created_at" | "user_id">,
    ) => {
      const { error } = await supabase
        .from("reserve_plans")
        .upsert(
          {
            ...input,
            amount: decimalMoney(
              parseMoney(input.amount, input.currency),
              input.currency,
            ),
            user_id: verify(),
          },
          { onConflict: "user_id,month,currency,name" },
        );
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const removeReserve = useMutation({
    mutationFn: async (reserveId: string) => {
      const { error } = await supabase
        .from("reserve_plans")
        .delete()
        .eq("user_id", verify())
        .eq("id", reserveId)
        .select("id")
        .single();
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const contract = useMutation({
    mutationFn: async (
      input: Omit<DebtPlan, "id" | "created_at" | "user_id">,
    ) => {
      const { error } = await supabase
        .from("debt_plans")
        .upsert(
          {
            ...input,
            scenario_principal: decimalMoney(
              parseMoney(input.scenario_principal, input.currency),
              input.currency,
            ),
            minimum_payment:
              input.minimum_payment === null
                ? null
                : decimalMoney(
                    parseMoney(input.minimum_payment, input.currency),
                    input.currency,
                  ),
            user_id: verify(),
          },
          { onConflict: "user_id,debt_id" },
        );
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return { reserves, contracts, reserve, removeReserve, contract };
}
