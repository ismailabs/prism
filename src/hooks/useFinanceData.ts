import { useEffect } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { OptimisticLedger } from '@/lib/finance';
import { useAuth } from '@/hooks/useAuth';
import type { Category, NewCategory, NewPaymentMethod, NewTransaction, PaymentMethod, Profile, Transaction } from '@/types';

type Resource = 'transactions' | 'categories' | 'payment_methods';
interface OwnedRow { id: string; user_id: string; created_at: string }
export type UpdateTransaction = Partial<NewTransaction> & { id: string };
export type UpdateCategory = Partial<NewCategory> & { id: string };
export type UpdatePaymentMethod = Partial<NewPaymentMethod> & { id: string };
export type ProfileUpdate = Partial<Pick<Profile, 'username' | 'currency' | 'language' | 'theme'>>;
interface MutationContext<T> { token: string; ledger: OptimisticLedger<T> }
interface Repository<Row extends OwnedRow, Input extends object> {
  resource: Resource;
  create: (userId: string, input: Input) => Promise<Row>;
  update: (userId: string, input: Partial<Input> & { id: string }) => Promise<Row>;
  remove: (userId: string, id: string) => Promise<void>;
  optimistic: (userId: string, input: Input, id: string) => Row;
}

export const financeKeys = {
  all: (userId?: string) => ['finance', userId ?? 'signed-out'] as const,
  transactions: (userId?: string) => [...financeKeys.all(userId), 'transactions'] as const,
  categories: (userId?: string) => [...financeKeys.all(userId), 'categories'] as const,
  paymentMethods: (userId?: string) => [...financeKeys.all(userId), 'payment_methods'] as const,
  profile: (userId?: string) => [...financeKeys.all(userId), 'profile'] as const,
};
const mutationKey = (userId?: string) => ['finance-write', userId ?? 'signed-out'] as const;
const ledgers = new WeakMap<QueryClient, Map<string, unknown>>();

/** PostgREST serializes numeric columns as JSON numbers. Normalize immediately so
 * every subsequent financial operation receives exact decimal text. */
function normalizeTransaction(row: Transaction): Transaction {
  return { ...row, amount: String(row.amount) };
}

function requireUser(userId: string | undefined, allowed: boolean): string {
  if (!userId || !allowed) throw new Error('Please sign in and complete two-factor verification before saving.');
  return userId;
}

function useFinanceAccess() {
  const { user, loading, requiresMfa } = useAuth();
  const pending = useIsMutating({ mutationKey: mutationKey(user?.id) });
  return { userId: user?.id, allowed: Boolean(user && !loading && !requiresMfa), pending };
}

export function useTransactions() {
  const { userId, allowed, pending } = useFinanceAccess();
  return useQuery({
    queryKey: financeKeys.transactions(userId),
    enabled: allowed && pending === 0,
    staleTime: 30_000,
    queryFn: async ({ signal }): Promise<Transaction[]> => {
      const id = requireUser(userId, allowed);
      const rows: Transaction[] = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase.from('transactions').select('*').eq('user_id', id).order('transaction_date', { ascending: false }).order('id').range(offset, offset + 999).abortSignal(signal);
        if (error) throw error;
        rows.push(...data.map(normalizeTransaction));
        if (data.length < 1_000) return rows;
        offset += 1_000;
      }
    },
  });
}

export function useCategories() {
  const { userId, allowed, pending } = useFinanceAccess();
  return useQuery({
    queryKey: financeKeys.categories(userId), enabled: allowed && pending === 0, staleTime: 30_000,
    queryFn: async ({ signal }): Promise<Category[]> => {
      const id = requireUser(userId, allowed);
      const rows: Category[] = [];
      for (let offset = 0; ; offset += 1_000) {
        const { data, error } = await supabase.from('categories').select('*').eq('user_id', id).order('name').order('id').range(offset, offset + 999).abortSignal(signal);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1_000) return rows;
      }
    },
  });
}

export function usePaymentMethods() {
  const { userId, allowed, pending } = useFinanceAccess();
  return useQuery({
    queryKey: financeKeys.paymentMethods(userId), enabled: allowed && pending === 0, staleTime: 30_000,
    queryFn: async ({ signal }): Promise<PaymentMethod[]> => {
      const id = requireUser(userId, allowed);
      const rows: PaymentMethod[] = [];
      for (let offset = 0; ; offset += 1_000) {
        const { data, error } = await supabase.from('payment_methods').select('*').eq('user_id', id).order('name').order('id').range(offset, offset + 999).abortSignal(signal);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1_000) return rows;
      }
    },
  });
}

export function useProfile() {
  const { userId, allowed, pending } = useFinanceAccess();
  return useQuery({
    queryKey: financeKeys.profile(userId), enabled: allowed && pending === 0, staleTime: 60_000,
    queryFn: async ({ signal }): Promise<Profile> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', requireUser(userId, allowed)).abortSignal(signal).single();
      if (error) throw error;
      return data;
    },
  });
}

function useResourceMutations<Row extends OwnedRow, Input extends object>(repository: Repository<Row, Input>) {
  const client = useQueryClient();
  const { userId, allowed } = useFinanceAccess();
  const key: QueryKey = [...financeKeys.all(userId), repository.resource];
  const ledgerKey = `${userId}:${repository.resource}`;
  const scope = { id: ledgerKey };
  const begin = async (apply: (rows: Row[], token: string) => Row[]): Promise<MutationContext<Row>> => {
    requireUser(userId, allowed);
    await client.cancelQueries({ queryKey: financeKeys.all(userId) });
    let byResource = ledgers.get(client);
    if (!byResource) { byResource = new Map(); ledgers.set(client, byResource); }
    let ledger = byResource.get(ledgerKey) as OptimisticLedger<Row> | undefined;
    if (!ledger) { ledger = new OptimisticLedger(client.getQueryData<Row[]>(key) ?? []); byResource.set(ledgerKey, ledger); }
    const token = crypto.randomUUID();
    client.setQueryData<Row[]>(key, ledger.add({ token, apply: (rows) => apply(rows, token) }));
    return { token, ledger };
  };
  const settle = (context: MutationContext<Row> | undefined, commit?: (rows: Row[]) => Row[]) => {
    if (!context) return;
    const rows = context.ledger.settle(context.token, commit);
    // A sign-out clears the query cache; late responses must not recreate private data.
    if (client.getQueryState(key)) client.setQueryData<Row[]>(key, rows);
    if (context.ledger.pendingCount === 0) ledgers.get(client)?.delete(ledgerKey);
  };
  const invalidate = async () => {
    if (client.isMutating({ mutationKey: mutationKey(userId) }) === 1) await Promise.all([client.invalidateQueries({ queryKey: financeKeys.all(userId) }), client.invalidateQueries({ queryKey: ['platform', userId] })]);
  };
  const create = useMutation<Row, Error, Input, MutationContext<Row>>({
    mutationKey: mutationKey(userId), scope,
    mutationFn: (input) => repository.create(requireUser(userId, allowed), input),
    onMutate: (input) => begin((rows, token) => [repository.optimistic(requireUser(userId, allowed), input, token), ...rows]),
    onSuccess: (saved, _input, context) => settle(context, (rows) => [saved, ...rows.filter((row) => row.id !== saved.id)]),
    onError: (_error, _input, context) => settle(context),
    onSettled: invalidate,
  });
  const update = useMutation<Row, Error, Partial<Input> & { id: string }, MutationContext<Row>>({
    mutationKey: mutationKey(userId), scope,
    mutationFn: (input) => repository.update(requireUser(userId, allowed), input),
    onMutate: (input) => begin((rows) => rows.map((row) => row.id === input.id ? { ...row, ...input } : row)),
    onSuccess: (saved, _input, context) => settle(context, (rows) => rows.map((row) => row.id === saved.id ? saved : row)),
    onError: (_error, _input, context) => settle(context),
    onSettled: invalidate,
  });
  const remove = useMutation<void, Error, string, MutationContext<Row>>({
    mutationKey: mutationKey(userId), scope,
    mutationFn: (id) => repository.remove(requireUser(userId, allowed), id),
    onMutate: (id) => begin((rows) => rows.filter((row) => row.id !== id)),
    onSuccess: (_result, id, context) => settle(context, (rows) => rows.filter((row) => row.id !== id)),
    onError: (_error, _id, context) => settle(context),
    onSettled: invalidate,
  });
  return { create, update, remove };
}

const transactions: Repository<Transaction, NewTransaction> = {
  resource: 'transactions',
  create: async (userId, input) => {
    const { data, error } = await supabase.from('transactions').insert({ ...input, user_id: userId }).select('*').single();
    if (error) throw error;
    return normalizeTransaction(data);
  },
  update: async (userId, { id, ...input }) => {
    const { data, error } = await supabase.from('transactions').update(input).eq('id', id).eq('user_id', userId).select('*').single();
    if (error) throw error;
    return normalizeTransaction(data);
  },
  remove: async (userId, id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId).select('id').single();
    if (error) throw error;
  },
  optimistic: (userId, input, id) => ({ ...input, id, user_id: userId, created_at: new Date().toISOString() }),
};
const categories: Repository<Category, NewCategory> = {
  resource: 'categories',
  create: async (userId, input) => {
    const { data, error } = await supabase.from('categories').insert({ ...input, user_id: userId }).select('*').single();
    if (error) throw error;
    return data;
  },
  update: async (userId, { id, ...input }) => {
    const { data, error } = await supabase.from('categories').update(input).eq('id', id).eq('user_id', userId).select('*').single();
    if (error) throw error;
    return data;
  },
  remove: async (userId, id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', userId).select('id').single();
    if (error) throw error;
  },
  optimistic: (userId, input, id) => ({ ...input, id, user_id: userId, created_at: new Date().toISOString() }),
};
const paymentMethods: Repository<PaymentMethod, NewPaymentMethod> = {
  resource: 'payment_methods',
  create: async (userId, input) => {
    const { data, error } = await supabase.from('payment_methods').insert({ ...input, user_id: userId }).select('*').single();
    if (error) throw error;
    return data;
  },
  update: async (userId, { id, ...input }) => {
    const { data, error } = await supabase.from('payment_methods').update(input).eq('id', id).eq('user_id', userId).select('*').single();
    if (error) throw error;
    return data;
  },
  remove: async (userId, id) => {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id).eq('user_id', userId).select('id').single();
    if (error) throw error;
  },
  optimistic: (userId, input, id) => ({ ...input, id, user_id: userId, created_at: new Date().toISOString() }),
};

export function useTransactionMutations() { return useResourceMutations(transactions); }
export function useCategoryMutations() { return useResourceMutations(categories); }
export function usePaymentMethodMutations() { return useResourceMutations(paymentMethods); }

export function useUpdateProfile() {
  const client = useQueryClient();
  const { userId, allowed } = useFinanceAccess();
  const key = financeKeys.profile(userId);
  const ledgerKey = `${userId}:profile`;
  const settle = (context: MutationContext<Profile> | undefined, saved?: Profile) => {
    if (!context) return;
    const rows = context.ledger.settle(context.token, saved ? () => [saved] : undefined);
    if (rows[0] && client.getQueryState(key)) client.setQueryData(key, rows[0]);
    if (context.ledger.pendingCount === 0) ledgers.get(client)?.delete(ledgerKey);
  };
  return useMutation<Profile, Error, ProfileUpdate, MutationContext<Profile>>({
    mutationKey: mutationKey(userId), scope: { id: ledgerKey },
    mutationFn: async (input) => {
      const { data, error } = await supabase.from('profiles').update(input).eq('id', requireUser(userId, allowed)).select('*').single();
      if (error) throw error;
      return data;
    },
    onMutate: async (input) => {
      requireUser(userId, allowed);
      await client.cancelQueries({ queryKey: key });
      let byResource = ledgers.get(client);
      if (!byResource) { byResource = new Map(); ledgers.set(client, byResource); }
      let ledger = byResource.get(ledgerKey) as OptimisticLedger<Profile> | undefined;
      if (!ledger) {
        const previous = client.getQueryData<Profile>(key);
        ledger = new OptimisticLedger(previous ? [previous] : []);
        byResource.set(ledgerKey, ledger);
      }
      const token = crypto.randomUUID();
      const rows = ledger.add({ token, apply: (profiles) => profiles.map((profile) => ({ ...profile, ...input })) });
      if (rows[0]) client.setQueryData<Profile>(key, rows[0]);
      return { token, ledger };
    },
    onError: (_error, _input, context) => settle(context),
    onSuccess: (saved, _input, context) => settle(context, saved),
    onSettled: async () => { if (client.isMutating({ mutationKey: mutationKey(userId) }) === 1) await client.invalidateQueries({ queryKey: financeKeys.all(userId) }); },
  });
}

export function useFinanceRealtime(): void {
  const { userId, allowed } = useFinanceAccess();
  const client = useQueryClient();
  useEffect(() => {
    if (!userId || !allowed) return;
    const refresh = () => {
      if (client.isMutating({ mutationKey: mutationKey(userId) }) === 0) void client.invalidateQueries({ queryKey: financeKeys.all(userId) });
    };
    const channel = supabase.channel(`finance:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods', filter: `user_id=eq.${userId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, refresh)
      // Deleted rows expose only their primary keys, so invalidate and let RLS scope the subsequent read.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'transactions' }, refresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'categories' }, refresh)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'payment_methods' }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [allowed, client, userId]);
}
