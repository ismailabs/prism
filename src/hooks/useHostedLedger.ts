import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { parseMoneyTotal } from '@/domain/money';
import type { LedgerAccount, LedgerReadLine, PostingKind } from '@/domain/accounting';
import type { Currency } from '@/types';

interface Owned { id: string; user_id: string }
export interface HostedLedgerAccount extends LedgerAccount, Owned {}
export interface HostedLedgerLine extends LedgerReadLine, Owned { journal_id: string; ordinal: number }
export interface HostedLedgerEvent extends Owned { kind: PostingKind; currency: Currency; financial_date: string; financial_timezone: string; request_key: string }
export interface HostedAllocation extends Owned { event_id: string; goal_id: string; currency: Currency; amount: string }
const selections = {
  ledger_accounts: 'id,user_id,code,classification,currency',
  exact_ledger_lines: 'id,user_id,journal_id,event_id,account_id,classification,currency,side,amount,ordinal,financial_date',
  financial_events: 'id,user_id,kind,currency,financial_date,financial_timezone,request_key',
  exact_ledger_allocations: 'id,user_id,event_id,goal_id,currency,amount',
};
type Table = keyof typeof selections;
function request(table: Table, id: string, signal: AbortSignal, head = false) {
  const options = { count: 'exact' as const, head };
  switch (table) {
    case 'ledger_accounts': return supabase.from('ledger_accounts').select(selections.ledger_accounts, options).eq('user_id', id).abortSignal(signal);
    case 'exact_ledger_lines': return supabase.from('exact_ledger_lines').select(selections.exact_ledger_lines, options).eq('user_id', id).abortSignal(signal);
    case 'financial_events': return supabase.from('financial_events').select(selections.financial_events, options).eq('user_id', id).abortSignal(signal);
    case 'exact_ledger_allocations': return supabase.from('exact_ledger_allocations').select(selections.exact_ledger_allocations, options).eq('user_id', id).abortSignal(signal);
  }
}
const changed = () => new Error('Ledger records changed while loading. Refresh to load a complete report.');
async function readComplete<T extends Owned>(table: Table, id: string, signal: AbortSignal) {
  const rows: T[] = []; let expected: number | null = null;
  for (let offset = 0; ; offset += 1000) {
    const { data, error, count } = await request(table, id, signal).order('id').range(offset, offset + 999);
    if (error) throw error;
    if (!data || count === null) throw new Error('A complete private ledger read is required.');
    if (expected !== null && expected !== count) throw changed();
    expected = count;
    const page = data as unknown as T[];
    if (page.some(row => row.user_id !== id || typeof row.id !== 'string')) throw new Error('Invalid private ledger ownership.');
    rows.push(...page);
    if (page.length < 1000) break;
  }
  if (rows.length !== expected || new Set(rows.map(row => row.id)).size !== expected) throw changed();
  return rows;
}
export function useHostedLedger(active: boolean) {
  const { user, loading, requiresMfa } = useAuth(); const id = user?.id;
  return useQuery({ queryKey: ['platform', id, 'hosted-ledger'], enabled: active && !!id && !loading && !requiresMfa,
    staleTime: 20000, retry: false, queryFn: async ({ signal }) => {
      if (!id || loading || requiresMfa) throw new Error('Verified session required.');
      const [accounts, lines, events, allocations] = await Promise.all([
        readComplete<HostedLedgerAccount>('ledger_accounts', id, signal),
        readComplete<HostedLedgerLine>('exact_ledger_lines', id, signal),
        readComplete<HostedLedgerEvent>('financial_events', id, signal),
        readComplete<HostedAllocation>('exact_ledger_allocations', id, signal),
      ]);
      // Immutable history plus count fences: reject concurrent appends and
      // incomplete pages instead of presenting partial financial totals.
      await Promise.all(Object.keys(selections).map(async key => {
        const table = key as Table;
        const { error, count } = await request(table, id, signal, true);
        if (error) throw error;
        const expected = { ledger_accounts: accounts.length, exact_ledger_lines: lines.length,
          financial_events: events.length, exact_ledger_allocations: allocations.length }[table];
        if (count !== expected) throw changed();
      }));
      const accountMap = new Map(accounts.map(row => [row.id, row])), eventMap = new Map(events.map(row => [row.id, row]));
      const journals = new Map<string, { event: string; net: bigint; count: number; ordinals: Set<number> }>();
      for (const line of lines) {
        const account = accountMap.get(line.account_id), event = eventMap.get(line.event_id);
        if (!account || !event || account.currency !== line.currency || event.currency !== line.currency ||
          account.classification !== line.classification || event.financial_date !== line.financial_date ||
          !['debit', 'credit'].includes(line.side) || typeof line.amount !== 'string' || parseMoneyTotal(line.amount, line.currency) <= 0n)
          throw new Error('Incomplete exact ledger data.');
        const journal = journals.get(line.journal_id) ?? { event: line.event_id, net: 0n, count: 0, ordinals: new Set<number>() };
        if (journal.event !== line.event_id || journal.ordinals.has(line.ordinal)) throw new Error('Incomplete exact ledger journal.');
        journal.net += parseMoneyTotal(line.amount, line.currency) * (line.side === 'debit' ? 1n : -1n);
        journal.count++; journal.ordinals.add(line.ordinal); journals.set(line.journal_id, journal);
      }
      if ([...journals.values()].some(j => j.net !== 0n || j.count < 2 || j.count > 64)) throw new Error('Unbalanced or incomplete ledger journal.');
      for (const allocation of allocations) {
        if (eventMap.get(allocation.event_id)?.currency !== allocation.currency || typeof allocation.amount !== 'string')
          throw new Error('Incomplete exact allocation data.');
        parseMoneyTotal(allocation.amount, allocation.currency);
      }
      const postedEvents = new Set([...journals.values()].map(j => j.event));
      for (const event of events) {
        if (!postedEvents.has(event.id) && !allocations.some(a => a.event_id === event.id)) throw new Error('Incomplete posted ledger event.');
      }
      return { accounts, lines, events, allocations };
    },
  });
}
