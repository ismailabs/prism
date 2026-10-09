import { supabase } from "@/lib/supabase";
import type {
  Account,
  DebtRepayment,
  Objective,
  ObjectiveContribution,
  ObjectiveMilestone,
  PersonDebt,
  Transfer,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { financeKeys } from "./useFinanceData";
type Rows = {
  accounts: Account;
  objectives: Objective;
  objective_contributions: ObjectiveContribution;
  objective_milestones: ObjectiveMilestone;
  person_debts: PersonDebt;
  debt_repayments: DebtRepayment;
  transfers: Transfer;
};
type TableName = keyof Rows;
type Input<Row> = Omit<
  Row,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "effective_amount"
  | "balance"
  | "transaction_count"
  | "linked_activity_count"
>;
interface Repository<Row> {
  read: (userId: string, signal?: AbortSignal) => Promise<Row[]>;
  create: (userId: string, input: Input<Row>) => Promise<void>;
  update: (
    userId: string,
    id: string,
    input: Partial<Input<Row>>,
  ) => Promise<void>;
  remove: (userId: string, id: string) => Promise<void>;
}
const repositories: { [K in TableName]: Repository<Rows[K]> } = {
  accounts: {
    read: async (userId, signal) => {
      const rows: Rows["accounts"][] = [];
      for (let offset = 0; ; offset += 1000) {
        let request = supabase
          .from("exact_accounts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at")
          .order("id")
          .range(offset, offset + 999);
        if (signal) request = request.abortSignal(signal);
        const { data, error } = await request;
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
    create: async (userId, input) => {
      const { error } = await supabase
        .from("accounts")
        .insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    update: async (userId, id, input) => {
      const { error } = await supabase
        .from("accounts")
        .update(input)
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
    remove: async (userId, id) => {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
  },
  objectives: {
    read: async (userId, signal) => {
      const rows: Rows["objectives"][] = [];
      for (let offset = 0; ; offset += 1000) {
        let request = supabase
          .from("exact_objectives")
          .select("*")
          .eq("user_id", userId)
          .order("created_at")
          .order("id")
          .range(offset, offset + 999);
        if (signal) request = request.abortSignal(signal);
        const { data, error } = await request;
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
    create: async (userId, input) => {
      const { error } = await supabase
        .from("objectives")
        .insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    update: async (userId, id, input) => {
      const { error } = await supabase
        .from("objectives")
        .update(input)
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
    remove: async (userId, id) => {
      const { error } = await supabase
        .from("objectives")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
  },
  objective_contributions: {
    read: async (userId, signal) => {
      const rows: Rows["objective_contributions"][] = [];
      for (let offset = 0; ; offset += 1000) {
        let request = supabase
          .from("exact_objective_contributions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at")
          .order("id")
          .range(offset, offset + 999);
        if (signal) request = request.abortSignal(signal);
        const { data, error } = await request;
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
    create: async (userId, input) => {
      const { error } = await supabase
        .from("objective_contributions")
        .insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    update: async (userId, id, input) => {
      const { error } = await supabase
        .from("objective_contributions")
        .update(input)
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
    remove: async (userId, id) => {
      const { error } = await supabase
        .from("objective_contributions")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
  },
  objective_milestones: {
    read: async (userId, signal) => {
      const rows: Rows["objective_milestones"][] = [];
      for (let offset = 0; ; offset += 1000) {
        let request = supabase
          .from("exact_objective_milestones")
          .select("*")
          .eq("user_id", userId)
          .order("created_at")
          .order("id")
          .range(offset, offset + 999);
        if (signal) request = request.abortSignal(signal);
        const { data, error } = await request;
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
    create: async (userId, input) => {
      const { error } = await supabase
        .from("objective_milestones")
        .insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    update: async (userId, id, input) => {
      const { error } = await supabase
        .from("objective_milestones")
        .update(input)
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
    remove: async (userId, id) => {
      const { error } = await supabase
        .from("objective_milestones")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
  },
  person_debts: {
    read: async (userId, signal) => {
      const rows: Rows["person_debts"][] = [];
      for (let offset = 0; ; offset += 1000) {
        let request = supabase
          .from("exact_person_debts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at")
          .order("id")
          .range(offset, offset + 999);
        if (signal) request = request.abortSignal(signal);
        const { data, error } = await request;
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
    create: async (userId, input) => {
      const { error } = await supabase
        .from("person_debts")
        .insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    update: async (userId, id, input) => {
      const { error } = await supabase
        .from("person_debts")
        .update(input)
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
    remove: async (userId, id) => {
      // Check complete server history, rather than trusting a possibly stale UI
      // cache. The forward migration closes the INSERT/DELETE race at the DB.
      const history = await supabase.from("debt_repayments").select("id")
        .eq("user_id", userId).eq("debt_id", id).limit(1);
      if (history.error) throw history.error;
      if (history.data.length)
        throw new Error("Debt has repayment history. Keep this record until reversal support is available.");
      const { error } = await supabase
        .from("person_debts")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
  },
  debt_repayments: {
    read: async (userId, signal) => {
      const rows: Rows["debt_repayments"][] = [];
      for (let offset = 0; ; offset += 1000) {
        let request = supabase
          .from("exact_debt_repayments")
          .select("*")
          .eq("user_id", userId)
          .order("created_at")
          .order("id")
          .range(offset, offset + 999);
        if (signal) request = request.abortSignal(signal);
        const { data, error } = await request;
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
    create: async (userId, input) => {
      const { error } = await supabase
        .from("debt_repayments")
        .insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    update: async (userId, id, input) => {
      const { error } = await supabase
        .from("debt_repayments")
        .update(input)
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
    remove: async (userId, id) => {
      const { error } = await supabase
        .from("debt_repayments")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
  },
  transfers: {
    read: async (userId, signal) => {
      const rows: Rows["transfers"][] = [];
      for (let offset = 0; ; offset += 1000) {
        let request = supabase
          .from("exact_transfers")
          .select("*")
          .eq("user_id", userId)
          .order("created_at")
          .order("id")
          .range(offset, offset + 999);
        if (signal) request = request.abortSignal(signal);
        const { data, error } = await request;
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
    create: async (userId, input) => {
      const { error } = await supabase
        .from("transfers")
        .insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    update: async (userId, id, input) => {
      const { error } = await supabase
        .from("transfers")
        .update(input)
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
    remove: async (userId, id) => {
      const { error } = await supabase
        .from("transfers")
        .delete()
        .eq("user_id", userId)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    },
  },
};
export function usePlatformTable<T extends TableName>(table: T) {
  const { user, loading, requiresMfa } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["platform", userId, table],
    enabled: !!userId && !loading && !requiresMfa,
    staleTime: 20000,
    queryFn: ({ signal }) => {
      if (!userId) throw new Error("Sign in first.");
      return repositories[table].read(userId, signal);
    },
  });
}
export function usePlatformMutation<T extends TableName>(table: T) {
  const { user, loading, requiresMfa } = useAuth();
  const client = useQueryClient();
  const userId = user?.id;
  const verify = () => {
    if (!userId || loading || requiresMfa)
      throw new Error("A verified sign-in is required.");
    return userId;
  };
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["platform", userId] }),
      client.invalidateQueries({ queryKey: financeKeys.all(userId) }),
    ]);
  };
  return {
    create: useMutation({
      mutationKey: ["platform-write", userId],
      mutationFn: (input: Input<Rows[T]>) =>
        repositories[table].create(verify(), input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationKey: ["platform-write", userId],
      mutationFn: ({
        id,
        values,
      }: {
        id: string;
        values: Partial<Input<Rows[T]>>;
      }) => repositories[table].update(verify(), id, values),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationKey: ["platform-write", userId],
      mutationFn: (id: string) => repositories[table].remove(verify(), id),
      onSuccess: refresh,
    }),
  };
}
