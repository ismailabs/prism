import type { Database as Generated } from './database.generated';
import type { Account,Category,DebtRepayment,MonthlyBudget,MonthlyTotal,Objective,ObjectiveContribution,ObjectiveMilestone,PaymentMethod,PersonDebt,Profile,RecurringRule,Transaction,Transfer } from './index';

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
type ViewModels={exact_accounts:Account;exact_debt_repayments:DebtRepayment;exact_monthly_budgets:MonthlyBudget;exact_objectives:Objective;exact_objective_contributions:ObjectiveContribution;exact_objective_milestones:ObjectiveMilestone;exact_person_debts:PersonDebt;exact_recurring_rules:RecurringRule;exact_transactions:Transaction;exact_transfers:Transfer;finance_monthly_totals:MonthlyTotal;finance_net_flow:{user_id:string;currency:Account['currency'];amount:string}};
type GeneratedView=Generated['public']['Views'];
type Views={ [K in keyof GeneratedView]:K extends keyof ViewModels ? {Row:Columns<GeneratedView[K]['Row'],ViewModels[K]>;Relationships:GeneratedView[K]['Relationships']}:GeneratedView[K] };
export type Database=Omit<Generated,'public'> & {public:Omit<Generated['public'],'Tables'|'Views'> & {Tables:Tables;Views:Views}};
