export type Currency = 'USD' | 'EUR' | 'JPY' | 'MYR';
export type Locale = 'en' | 'ms';
export type Theme = 'light' | 'dark' | 'system';
export type Tab = 'dashboard' | 'transactions' | 'accounts' | 'goals' | 'savings' | 'debts' | 'categories' | 'payments' | 'settings';
export type TransactionType = 'income' | 'expense';
export type PaymentMethodType = 'credit_card' | 'cash' | 'bank_transfer' | 'e_wallet';
export interface Profile { id: string; username: string; currency: Currency; language: Locale; theme: Theme; mfa_enabled: boolean; created_at: string }
export interface UserSettings { username: string; currency: Currency; language: Locale; theme: Theme; mfa_enabled: boolean }
export interface Category { id: string; user_id: string; name: string; type: TransactionType; color: string; created_at: string }
export interface PaymentMethod { id: string; user_id: string; name: string; type: PaymentMethodType; created_at: string }
/** Exact decimal text. Financial amounts must not cross the client boundary as IEEE-754 numbers. */
export type Money = string;
export interface Transaction { id: string; user_id: string; amount: Money; currency: Currency; type: TransactionType; category_id: string | null; payment_method_id: string | null; account_id?: string | null; description: string; transaction_date: string; created_at: string }
export interface Account { id: string; user_id: string; name: string; currency: Currency; opening_balance: Money; archived: boolean; created_at: string }
export type ObjectiveKind = 'goal' | 'savings';
export type ObjectiveStatus = 'active' | 'paused' | 'archived';
export interface Objective { id: string; user_id: string; kind: ObjectiveKind; name: string; notes: string; category: string; priority: 'low' | 'normal' | 'high'; target_amount: Money; currency: Currency; target_date: string | null; status: ObjectiveStatus; created_at: string; updated_at: string }
export interface ObjectiveContribution { id: string; user_id: string; objective_id: string; currency: Currency; amount: Money | null; transaction_id: string | null; note: string; contributed_at: string; created_at: string }
export interface ObjectiveMilestone { id: string; user_id: string; objective_id: string; name: string; amount: Money; created_at: string }
export type DebtDirection = 'i_owe' | 'owed_to_me';
export interface PersonDebt { id: string; user_id: string; direction: DebtDirection; counterparty: string; original_amount: Money; currency: Currency; due_date: string | null; notes: string; created_at: string; updated_at: string }
export interface DebtRepayment { id: string; user_id: string; debt_id: string; currency: Currency; amount: Money | null; transaction_id: string | null; note: string; paid_at: string; created_at: string }
export interface ExchangeRates { base: Currency; rates: Record<Currency, number>; updatedAt: number; source: string }
export type NewTransaction = Omit<Transaction, 'id' | 'user_id' | 'created_at'>;
export type NewCategory = Omit<Category, 'id' | 'user_id' | 'created_at'>;
export type NewPaymentMethod = Omit<PaymentMethod, 'id' | 'user_id' | 'created_at'>;
