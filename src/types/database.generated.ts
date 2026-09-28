// Generated from the live Supabase schema after both 2026-09-28 migrations.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          archived: boolean
          created_at: string
          currency: string
          id: string
          name: string
          opening_balance: number
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          currency: string
          id?: string
          name: string
          opening_balance?: number
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          currency?: string
          id?: string
          name?: string
          opening_balance?: number
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      debt_repayments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          debt_id: string
          id: string
          note: string
          paid_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency: string
          debt_id: string
          id?: string
          note?: string
          paid_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          debt_id?: string
          id?: string
          note?: string
          paid_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_repayments_user_id_debt_id_currency_fkey"
            columns: ["user_id", "debt_id", "currency"]
            isOneToOne: false
            referencedRelation: "person_debts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "debt_repayments_user_id_transaction_id_currency_fkey"
            columns: ["user_id", "transaction_id", "currency"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["user_id", "id", "currency"]
          },
        ]
      }
      objective_contributions: {
        Row: {
          amount: number | null
          contributed_at: string
          created_at: string
          currency: string
          id: string
          note: string
          objective_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          contributed_at?: string
          created_at?: string
          currency: string
          id?: string
          note?: string
          objective_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          contributed_at?: string
          created_at?: string
          currency?: string
          id?: string
          note?: string
          objective_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_contributions_user_id_objective_id_currency_fkey"
            columns: ["user_id", "objective_id", "currency"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "objective_contributions_user_id_transaction_id_currency_fkey"
            columns: ["user_id", "transaction_id", "currency"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["user_id", "id", "currency"]
          },
        ]
      }
      objective_milestones: {
        Row: {
          amount: number
          created_at: string
          id: string
          name: string
          objective_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          name: string
          objective_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          name?: string
          objective_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_milestones_user_id_objective_id_fkey"
            columns: ["user_id", "objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      objectives: {
        Row: {
          category: string
          created_at: string
          currency: string
          id: string
          kind: string
          name: string
          notes: string
          priority: string
          status: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          currency: string
          id?: string
          kind: string
          name: string
          notes?: string
          priority?: string
          status?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          name?: string
          notes?: string
          priority?: string
          status?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      person_debts: {
        Row: {
          counterparty: string
          created_at: string
          currency: string
          direction: string
          due_date: string | null
          id: string
          notes: string
          original_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          counterparty: string
          created_at?: string
          currency: string
          direction: string
          due_date?: string | null
          id?: string
          notes?: string
          original_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          counterparty?: string
          created_at?: string
          currency?: string
          direction?: string
          due_date?: string | null
          id?: string
          notes?: string
          original_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          id: string
          language: string
          mfa_enabled: boolean
          theme: string
          username: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id: string
          language?: string
          mfa_enabled?: boolean
          theme?: string
          username?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          language?: string
          mfa_enabled?: boolean
          theme?: string
          username?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          description: string
          id: string
          payment_method_id: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          payment_method_id?: string | null
          transaction_date?: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          payment_method_id?: string | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_owned_account_fkey"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "transactions_owned_category_fkey"
            columns: ["user_id", "category_id", "type"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id", "type"]
          },
          {
            foreignKeyName: "transactions_owned_payment_method_fkey"
            columns: ["user_id", "payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: { confirmation: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
