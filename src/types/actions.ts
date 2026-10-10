import type { Currency } from './index';

export interface GoalActionPlan {
  id: string; user_id: string; objective_id: string; account_id: string | null;
  currency: Currency; cadence_amount: string; frequency: 'weekly' | 'monthly';
  start_date: string; created_at: string;
}
export type ActionLink = {transaction_id:string|null;account_id:string|null;debt_id:string|null;objective_id:string|null;budget_id:string|null;period_month:string|null};
export type LinkKind = 'transaction'|'account'|'debt'|'goal'|'budget'|'reminder'|'period';
export type FinancialNote = ActionLink & {id:string;user_id:string;title:string;body:string;tags:string[];pinned:boolean;archived:boolean;reminder_id:string|null;created_at:string;updated_at:string};
export type FinancialReminder = ActionLink & {id:string;user_id:string;title:string;due_local:string;timezone:string;frequency:'once'|import('../domain/recurrence').Frequency;interval:number;importance:'low'|'normal'|'high';state:'open'|'complete'|'dismissed';archived:boolean;created_at:string;updated_at:string};
export type ActionReceipt = {id:string;user_id:string;occurrence_key:string;state:'read'|'complete'|'dismissed';created_at:string;updated_at:string};
export type ActionPreferences = {id:string;user_id:string;reminders_enabled:boolean;debt_enabled:boolean;recurring_enabled:boolean;budget_enabled:boolean;goal_enabled:boolean;created_at:string;updated_at:string};
