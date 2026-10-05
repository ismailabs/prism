import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { beforeEach,describe,expect,it,vi } from 'vitest';
import App from './App';
import { Dashboard } from './components/Dashboard';
import { FinancialOverview } from './components/Platform';
import type { AuthContextValue } from './hooks/useAuth';
import './i18n';
import { useAppStore } from './store/useAppStore';
import type { Category,Transaction } from './types';

const fixture = vi.hoisted(() => ({
  auth: { user: null, loading: false, requiresMfa: false, authError: null } as Partial<AuthContextValue>,
  error: null as Error | null,
  profile: { id: 'test-user', username: 'Test member', currency: 'USD', language: 'en', theme: 'light', mfa_enabled: false, created_at: '' },
  platform: {} as Record<string, unknown[]>,
}));
vi.mock('./store/useAppStore', async () => {
  const actual = await vi.importActual<typeof import('./store/useAppStore')>('./store/useAppStore');
  return { useAppStore: Object.assign((selector?: (state: ReturnType<typeof actual.useAppStore.getState>) => unknown) => selector ? selector(actual.useAppStore.getState()) : actual.useAppStore.getState(), actual.useAppStore) };
});
vi.mock('./hooks/useAuth', () => ({ useAuth: () => fixture.auth }));
vi.mock('./hooks/usePlatformData', () => ({
  usePlatformTable: (table: string) => ({ data: fixture.platform[table] ?? [], isPending: false, error: null, refetch: vi.fn() }),
  usePlatformMutation: () => ({ create: { isPending: false }, update: { isPending: false }, remove: { isPending: false } }),
}));
vi.mock('./hooks/useFinancialReports',()=>({useAnalyticsReport:()=>({data:[],isPending:false,error:null}),useFinancialReport:()=>({data:undefined,isPending:false,error:null}),useTransactionPage:()=>({data:{rows:[{id:'tx-1',user_id:'test-user',description:'Coffee',amount:'7.00',currency:'USD',type:'expense',category_id:null,payment_method_id:null,transaction_date:'2026-09-19T10:00:00Z',created_at:''}],total:1},isPending:false,error:null})}));
vi.mock('./hooks/usePlanningData',()=>({usePlanningData:()=>({budgets:{data:[],isPending:false,error:null},rules:{data:[],isPending:false,error:null},importRows:{isPending:false}})}));
vi.mock('./lib/supabase', () => ({ supabase: { auth: {} } }));
vi.mock('./hooks/useFinanceData', () => ({
  useTransactions: () => ({ data: [{ id: 'tx-1', description: 'Coffee', amount: '7.00', currency: 'USD', type: 'expense', transaction_date: '2026-09-19T10:00:00Z' }], isPending: false, error: fixture.error }),
  useListUsage: () => ({data:[],isPending:false}),
  useCategories: () => ({ data: [], isPending: false }),
  usePaymentMethods: () => ({ data: [], isPending: false }),
  useProfile: () => ({ data: fixture.profile, isPending: false }),
  useFinanceRealtime: vi.fn(),
  useTransactionMutations: () => ({ remove: { isPending: false }, create: {}, update: {} }),
  useCategoryMutations: () => ({ remove: {}, create: {}, update: {} }),
  usePaymentMethodMutations: () => ({ remove: {}, create: {}, update: {} }),
  useUpdateProfile: () => ({ isPending: false }),
}));
function render() {
  return renderToString(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><App /></QueryClientProvider>);
}
beforeEach(() => {
  fixture.auth = { user: null, loading: false, requiresMfa: false, authError: null };
  fixture.error = null;
  fixture.platform = {};
  useAppStore.setState({ activeTab: 'transactions', currency: 'USD', locale: 'en', theme: 'light' });
});
describe('application auth and view integration', () => {
  it('shows email and Google login without mounting private navigation', () => {
    const html = render();
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Create account');
    expect(html).not.toContain('app-nav');
    expect(html).not.toContain('Coffee');
  });
  it('waits for the initial auth check before showing any finance data', () => {
    fixture.auth.loading = true;
    expect(render()).toContain('role="status"');
    expect(render()).not.toContain('Coffee');
  });
  it('requires MFA before mounting the financial workspace', () => {
    fixture.auth.user = { id: 'test-user' } as AuthContextValue['user'];
    fixture.auth.requiresMfa = true;
    expect(render()).toContain('One more layer of security');
    expect(render()).not.toContain('app-nav');
  });
  it('connects authenticated transactions and all navigation destinations', () => {
    fixture.auth.user = { id: 'test-user', email: 'test@example.invalid' } as AuthContextValue['user'];
    const html = render();
    expect(html).toContain('Coffee');
    expect(html).toContain('$7.00');
    for (const path of ['transactions', 'accounts', 'plans', 'debts', 'settings']) expect(html).toContain(`href="/${path}"`);
    expect(html).toContain('aria-label="Open navigation"');
    expect(html).toContain('Accounts');
  });
  it('renders real query errors instead of treating a failed read as an empty account', () => {
    fixture.auth.user = { id: 'test-user' } as AuthContextValue['user'];
    fixture.error = new Error('Permission denied');
    expect(render()).toContain('Permission denied');
    expect(render()).not.toContain('Coffee');
  });
  it('connects saved profile values to the settings form', () => {
    fixture.auth.user = { id: 'test-user', email: 'test@example.invalid' } as AuthContextValue['user'];
    useAppStore.setState({ activeTab: 'settings' });
    const html = render();
    expect(html).toContain('Test member');
    expect(html).toContain('test@example.invalid');
    expect(html).toContain('Manage 2FA');
    expect(html).toContain('Credits');
    expect(html).toContain('aria-label="System"');
    expect(html).toContain('aria-label="Light"');
    expect(html).toContain('aria-label="Dark"');
    expect(html).toContain('Danger zone');
    expect(html).toContain('Delete Prism account');
  });
  it('renders goal, savings, account, and both debt directions in the authenticated workspace', () => {
    fixture.auth.user = { id: 'test-user', email: 'test@example.invalid' } as AuthContextValue['user'];
    fixture.platform = {
      accounts: [{ id: 'a', user_id: 'test-user', name: 'Wallet', currency: 'USD', opening_balance: '100.00', archived: false, created_at: '' }],
      objectives: [{ id: 'g', user_id: 'test-user', kind: 'goal', name: 'Emergency fund', notes: '', category: 'Safety', priority: 'high', target_amount: '100.00', currency: 'USD', target_date: null, status: 'active', created_at: '', updated_at: '' }, { id: 's', user_id: 'test-user', kind: 'savings', name: 'Travel', notes: '', category: 'Travel', priority: 'normal', target_amount: '200.00', currency: 'USD', target_date: null, status: 'active', created_at: '', updated_at: '' }],
      objective_contributions: [], objective_milestones: [], debt_repayments: [],
      person_debts: [{ id: 'd1', user_id: 'test-user', direction: 'i_owe', counterparty: 'Alex', original_amount: '30.00', currency: 'USD', due_date: null, notes: '', created_at: '', updated_at: '' }, { id: 'd2', user_id: 'test-user', direction: 'owed_to_me', counterparty: 'Jo', original_amount: '20.00', currency: 'USD', due_date: null, notes: '', created_at: '', updated_at: '' }],
    };
    for (const [tab, marker] of [['accounts','Wallet'],['goals','Emergency fund'],['savings','Travel'],['debts','Alex']] as const) {
      useAppStore.setState({ activeTab: tab });
      expect(render()).toContain(marker);
    }
    useAppStore.setState({ activeTab: 'debts' });
    expect(render()).toContain('Jo');
    const overview = renderToString(<QueryClientProvider client={new QueryClient()}><FinancialOverview /></QueryClientProvider>);
    expect(overview).toContain('Your commitments');
    expect(overview).toContain('$30.00');
    expect(overview).toContain('active receivables. Separate from available cash.');
    expect(overview).not.toContain('YOUR DIRECTION');
    expect(overview).not.toContain('Financial progress');
  });
});

describe('dashboard financial insights', () => {
  const category: Category = { id: 'category-1', user_id: 'test-user', name: 'Investment', type: 'expense', color: '#4265ee', created_at: '' };
  const transaction = (id: string, amount: string, type: Transaction['type'], date: string): Transaction => ({ id, user_id: 'test-user', amount, currency: 'MYR', type, category_id: type === 'expense' ? category.id : null, payment_method_id: null, description: id, transaction_date: date, created_at: '' });
  const renderDashboard = (transactions: Transaction[]) => renderToString(<Dashboard transactions={transactions} categories={[category]} payments={[]} month="2026-09" onEdit={() => {}} onDelete={() => {}} />);

  it('uses selected-month transaction totals and categories', () => {
    useAppStore.setState({ currency: 'MYR', locale: 'en', exchangeRates: null });
    const html = renderDashboard([transaction('income', '575.00', 'income', '2026-09-10'), transaction('expense', '29.70', 'expense', '2026-09-11'), transaction('other-month', '1000.00', 'expense', '2026-08-11')]);
    expect(html).toContain('545.30');
    expect(html).toContain('Investment');
    expect(html).toContain('MYR 29.70');
    expect(html).toContain('94.8%');
    expect(html).not.toContain('1,000.00 after expenses');
    expect(html).toContain('cash-flow-income');
    expect(html).toContain('cash-flow-expense');
  });

  it('prioritizes the monthly snapshot and cash flow before account commitments', () => {
    useAppStore.setState({ currency: 'MYR', locale: 'en', exchangeRates: null });
    const html = renderToString(<Dashboard transactions={[]} categories={[]} payments={[]} month="2026-09" onEdit={() => {}} onDelete={() => {}} accountSummary={<section>ACCOUNT SUMMARY MARKER</section>} />);
    expect(html.indexOf('snapshot')).toBeLessThan(html.indexOf('dashboard-modules'));
    expect(html.indexOf('dashboard-chart-grid')).toBeLessThan(html.indexOf('ACCOUNT SUMMARY MARKER'));
  });

  it('shows a simple empty state when the selected month has no transactions', () => {
    useAppStore.setState({ currency: 'MYR', locale: 'en', exchangeRates: null });
    expect(renderDashboard([transaction('other-month', '100.00', 'income', '2026-08-11')])).toContain('Record income and spending to see this period take shape.');
  });

  it('excludes future-dated transactions from the balance and selected-month metrics', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
    useAppStore.setState({ currency: 'MYR', locale: 'en', exchangeRates: null });
    const html = renderDashboard([
      transaction('income', '100.00', 'income', '2026-09-10T12:00:00Z'),
      transaction('future-expense', '90.00', 'expense', '2026-09-30T12:00:00Z'),
    ]);
    expect(html).toContain('MYR 100.00');
    expect(html).not.toContain('MYR 10.00');
    vi.useRealTimers();
  });
});
