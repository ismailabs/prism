import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import type { Account, DebtRepayment, Objective, ObjectiveContribution, ObjectiveMilestone, PersonDebt } from '@/types';

type TableName = 'accounts' | 'objectives' | 'objective_contributions' | 'objective_milestones' | 'person_debts' | 'debt_repayments';
type Rows = {
  accounts: Account;
  objectives: Objective;
  objective_contributions: ObjectiveContribution;
  objective_milestones: ObjectiveMilestone;
  person_debts: PersonDebt;
  debt_repayments: DebtRepayment;
};

function normalize<T extends TableName>(table: T, row: Rows[T]): Rows[T] {
  const copy = { ...row } as Record<string, unknown>;
  for (const key of table === 'accounts' ? ['opening_balance'] : table === 'objectives' ? ['target_amount'] : table === 'objective_milestones' || table === 'objective_contributions' || table === 'debt_repayments' ? ['amount'] : ['original_amount']) {
    if (copy[key] !== null && copy[key] !== undefined) copy[key] = String(copy[key]);
  }
  return copy as unknown as Rows[T];
}

export function usePlatformTable<T extends TableName>(table: T) {
  const { user, loading, requiresMfa } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['platform', userId, table], enabled: !!userId && !loading && !requiresMfa, staleTime: 20_000,
    queryFn: async ({ signal }): Promise<Rows[T][]> => {
      if (!userId) throw new Error('Sign in first.');
      const rows: Rows[T][] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from(table as 'accounts').select('*').eq('user_id', userId).range(offset, offset + 999).abortSignal(signal);
        if (error) throw error;
        rows.push(...(data as unknown as Rows[T][]).map(row => normalize(table, row)));
        if (data.length < 1000) return rows;
      }
    },
  });
}

export function usePlatformMutation<T extends TableName>(table: T) {
  const { user, requiresMfa } = useAuth();
  const client = useQueryClient();
  const userId = user?.id;
  const verify = () => { if (!userId || requiresMfa) throw new Error('A verified sign-in is required.'); return userId; };
  const refresh = () => client.invalidateQueries({ queryKey: ['platform', userId] });
  return {
    create: useMutation({
      mutationFn: async (input: Omit<Rows[T], 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        const { data, error } = await supabase.from(table as 'accounts').insert({ ...input, user_id: verify() } as never).select('*').single();
        if (error) throw error;
        return normalize(table, data as unknown as Rows[T]);
      }, onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: async ({ id, values }: { id: string; values: Partial<Rows[T]> }) => {
        const { data, error } = await supabase.from(table as 'accounts').update(values as never).eq('id', id).eq('user_id', verify()).select('*').single();
        if (error) throw error;
        return normalize(table, data as unknown as Rows[T]);
      }, onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from(table as 'accounts').delete().eq('id', id).eq('user_id', verify()).select('id').single();
        if (error) throw error;
      }, onSuccess: refresh,
    }),
  };
}
