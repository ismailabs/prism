import type { Category, PaymentMethod, Profile, Transaction } from './index';

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
    };
    Views: { [key in never]: never };
    Functions: {
      delete_own_account: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: { [key in never]: never };
    CompositeTypes: { [key in never]: never };
  };
}

