import type { Account, Category, DebtRepayment, Objective, ObjectiveContribution, ObjectiveMilestone, PaymentMethod, PersonDebt, Profile, Transaction } from './index';

type RowObject<T> = { [K in keyof T]: T[K] };
interface Table<Row, Insert, Update> {
  Row: RowObject<Row>;
  Insert: RowObject<Insert>;
  Update: RowObject<Update>;
  Relationships: [];
}
type OwnedInsert<T extends { id: string; created_at: string }> = Omit<T, 'id' | 'created_at'> & { id?: string; created_at?: string };

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile, Pick<Profile, 'id'> & Partial<Omit<Profile, 'id'>>, Partial<Pick<Profile, 'username' | 'currency' | 'language' | 'theme'>>>;
      categories: Table<Category, OwnedInsert<Category>, Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>>;
      payment_methods: Table<PaymentMethod, OwnedInsert<PaymentMethod>, Partial<Omit<PaymentMethod, 'id' | 'user_id' | 'created_at'>>>;
      transactions: Table<Transaction, OwnedInsert<Transaction>, Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>>;
      accounts: Table<Account, OwnedInsert<Account>, Partial<Omit<Account, 'id' | 'user_id' | 'created_at'>>>;
      objectives: Table<Objective, OwnedInsert<Objective>, Partial<Omit<Objective, 'id' | 'user_id' | 'created_at'>>>;
      objective_contributions: Table<ObjectiveContribution, OwnedInsert<ObjectiveContribution>, Partial<Omit<ObjectiveContribution, 'id' | 'user_id' | 'created_at'>>>;
      objective_milestones: Table<ObjectiveMilestone, OwnedInsert<ObjectiveMilestone>, Partial<Omit<ObjectiveMilestone, 'id' | 'user_id' | 'created_at'>>>;
      person_debts: Table<PersonDebt, OwnedInsert<PersonDebt>, Partial<Omit<PersonDebt, 'id' | 'user_id' | 'created_at'>>>;
      debt_repayments: Table<DebtRepayment, OwnedInsert<DebtRepayment>, Partial<Omit<DebtRepayment, 'id' | 'user_id' | 'created_at'>>>;
    };
    Views: { [key in never]: never };
    Functions: {
      delete_own_account: { Args: { confirmation: string }; Returns: undefined };
    };
    Enums: { [key in never]: never };
    CompositeTypes: { [key in never]: never };
  };
}

