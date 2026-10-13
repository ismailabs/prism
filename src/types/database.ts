import type { Database as Generated } from './database.generated';
import type { Account,Category,DebtRepayment,MonthlyBudget,MonthlyTotal,Objective,ObjectiveContribution,ObjectiveMilestone,PaymentMethod,PersonDebt,Profile,RecurringRule,Transaction,Transfer } from './index';
import type { DebtPlan, ReservePlan } from '@/domain/planning';
import type { GoalActionPlan,FinancialNote,FinancialReminder,ActionReceipt,ActionPreferences } from './actions';
import type { LedgerAccount, LedgerReadLine, PostingKind } from '@/domain/accounting';

type Models={accounts:Account;categories:Category;debt_repayments:DebtRepayment;monthly_budgets:MonthlyBudget;objectives:Objective;objective_contributions:ObjectiveContribution;objective_milestones:ObjectiveMilestone;payment_methods:PaymentMethod;person_debts:PersonDebt;profiles:Profile;recurring_rules:RecurringRule;transactions:Transaction;transfers:Transfer};
type MoneyColumn='amount'|'opening_balance'|'target_amount'|'original_amount'|'source_amount'|'destination_amount';
/** Retain generated columns/default optionality. Narrow SQL CHECK-constrained
 * text fields to domain unions; raw numeric reads stay numbers. Only writes and
 * exact invoker-view reads use decimal text. Computed view fields cannot leak
 * into raw table mutations because they are absent from the generated keys. */
type Columns<G,D,Raw extends boolean=false>={ [K in keyof G]: K extends keyof D ? Raw extends true ? K extends MoneyColumn ? G[K] : Exclude<D[K],undefined> : Exclude<D[K],undefined> : G[K] };
type GeneratedTable=Generated['public']['Tables'];
type Tables={ [K in keyof GeneratedTable]:K extends keyof Models ? {
 Row:Columns<GeneratedTable[K]['Row'],Models[K],true>;
 Insert:Columns<GeneratedTable[K]['Insert'],Models[K]>;
 Update:Columns<GeneratedTable[K]['Update'],Models[K]>;
 Relationships:GeneratedTable[K]['Relationships'];
}:GeneratedTable[K] };
type ViewModels={exact_accounts:Account;exact_debt_repayments:DebtRepayment;exact_monthly_budgets:MonthlyBudget;exact_objectives:Objective;exact_objective_contributions:ObjectiveContribution;exact_objective_milestones:ObjectiveMilestone;exact_person_debts:PersonDebt;exact_recurring_rules:RecurringRule;exact_transactions:Transaction;exact_transfers:Transfer;finance_daily_totals:MonthlyTotal;finance_monthly_totals:MonthlyTotal;finance_net_flow:{user_id:string;currency:Account['currency'];amount:string}};
type GeneratedView=Generated['public']['Views'];
type Views={ [K in keyof GeneratedView]:K extends keyof ViewModels ? {Row:Columns<GeneratedView[K]['Row'],ViewModels[K]>;Relationships:GeneratedView[K]['Relationships']}:GeneratedView[K] };
// Local forward migration contract. Regenerate the hosted snapshot only after
// an approved migration; decimal text remains explicit at the transport boundary.
type PlanRow<T> = {[K in keyof T]:T[K]};
type PlanTable<T> = { Row:{[K in keyof T]:K extends 'amount'|'scenario_principal'|'minimum_payment'?number|(null extends T[K]?null:never):T[K]}; Insert:Omit<T,'id'|'created_at'> & {id?:string;created_at?:string}; Update:Partial<T>; Relationships:[] };
type BudgetOptions = {rollover_enabled?:boolean;alert_percent?:number};
type ActionTable<T>={Row:PlanRow<T>;Insert:Omit<T,'id'|'created_at'|'updated_at'> & {id?:string;created_at?:string;updated_at?:string};Update:Partial<T>;Relationships:[]};
// Explicit read projections. The immutable ledger has no direct browser writes.
type LedgerOwned={id:string;user_id:string};
type ReadOnlyLedgerTable<T>={Row:PlanRow<T>;Insert:never;Update:never;Relationships:[]};
type LocalTables = Omit<Tables,'monthly_budgets'> & {
 monthly_budgets: {Row:Tables['monthly_budgets']['Row'] & Required<BudgetOptions>;Insert:Tables['monthly_budgets']['Insert'] & BudgetOptions;Update:Tables['monthly_budgets']['Update'] & BudgetOptions;Relationships:[]};
 reserve_plans:PlanTable<ReservePlan>;debt_plans:PlanTable<DebtPlan>;
 goal_action_plans:{Row:Omit<GoalActionPlan,'cadence_amount'> & {cadence_amount:number};Insert:Omit<GoalActionPlan,'id'|'created_at'> & {id?:string;created_at?:string};Update:Partial<GoalActionPlan>;Relationships:[]};
 financial_notes:ActionTable<FinancialNote> & {Row:FinancialNote & {search_document:unknown}};
 financial_reminders:ActionTable<FinancialReminder>;action_receipts:ActionTable<ActionReceipt>;action_preferences:ActionTable<ActionPreferences>;
 ledger_accounts:ReadOnlyLedgerTable<LedgerAccount & LedgerOwned>;
 financial_events:ReadOnlyLedgerTable<LedgerOwned & {kind:PostingKind;currency:Account['currency'];financial_date:string;financial_timezone:string;request_key:string}>;
};
type LocalViews = Omit<Views,'exact_monthly_budgets'> & {
 exact_monthly_budgets:{Row:Views['exact_monthly_budgets']['Row'] & Required<BudgetOptions>;Relationships:[]};
 exact_reserve_plans:{Row:PlanRow<ReservePlan>;Relationships:[]};exact_debt_plans:{Row:PlanRow<DebtPlan>;Relationships:[]};
 exact_goal_action_plans:{Row:PlanRow<GoalActionPlan>;Relationships:[]};
 exact_ledger_lines:{Row:PlanRow<LedgerReadLine & LedgerOwned & {journal_id:string;ordinal:number}>;Relationships:[]};
 exact_ledger_allocations:{Row:LedgerOwned & {event_id:string;goal_id:string;currency:Account['currency'];amount:string};Relationships:[]};
};
export type Database=Omit<Generated,'public'> & {public:Omit<Generated['public'],'Tables'|'Views'|'Functions'> & {Tables:LocalTables;Views:LocalViews;Functions:Generated['public']['Functions'] & {record_goal_contribution:{Args:{p_id:string;p_objective:string;p_currency:string;p_amount:string;p_transfer:string|null;p_account:string|null;p_note:string;p_at:string};Returns:string}}}};
