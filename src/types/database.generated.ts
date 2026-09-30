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
          account_id: string | null
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
          account_id?: string | null
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
          account_id?: string | null
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
            referencedRelation: "exact_person_debts"
            referencedColumns: ["user_id", "id", "currency"]
          },
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
            referencedRelation: "exact_transactions"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "debt_repayments_user_id_transaction_id_currency_fkey"
            columns: ["user_id", "transaction_id", "currency"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "repayment_owned_account"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "repayment_owned_account"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
        ]
      }
      monthly_budgets: {
        Row: {
          amount: number
          category_id: string
          category_type: string
          created_at: string
          currency: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          category_type?: string
          created_at?: string
          currency: string
          id?: string
          month: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          category_type?: string
          created_at?: string
          currency?: string
          id?: string
          month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_budgets_user_id_category_id_category_type_fkey"
            columns: ["user_id", "category_id", "category_type"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id", "type"]
          },
        ]
      }
      objective_contributions: {
        Row: {
          account_id: string | null
          amount: number | null
          contributed_at: string
          created_at: string
          currency: string
          id: string
          note: string
          objective_id: string
          transaction_id: string | null
          transfer_id: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          contributed_at?: string
          created_at?: string
          currency: string
          id?: string
          note?: string
          objective_id: string
          transaction_id?: string | null
          transfer_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          contributed_at?: string
          created_at?: string
          currency?: string
          id?: string
          note?: string
          objective_id?: string
          transaction_id?: string | null
          transfer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_owned_account"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "contribution_owned_account"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "contribution_owned_transfer"
            columns: ["user_id", "transfer_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_transfers"
            referencedColumns: ["user_id", "id", "destination_currency"]
          },
          {
            foreignKeyName: "contribution_owned_transfer"
            columns: ["user_id", "transfer_id", "currency"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["user_id", "id", "destination_currency"]
          },
          {
            foreignKeyName: "objective_contributions_user_id_objective_id_currency_fkey"
            columns: ["user_id", "objective_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_objectives"
            referencedColumns: ["user_id", "id", "currency"]
          },
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
            referencedRelation: "exact_transactions"
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
            referencedRelation: "exact_objectives"
            referencedColumns: ["user_id", "id"]
          },
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
          financial_timezone: string | null
          id: string
          language: string
          mfa_enabled: boolean
          theme: string
          username: string
        }
        Insert: {
          created_at?: string
          currency?: string
          financial_timezone?: string | null
          id: string
          language?: string
          mfa_enabled?: boolean
          theme?: string
          username?: string
        }
        Update: {
          created_at?: string
          currency?: string
          financial_timezone?: string | null
          id?: string
          language?: string
          mfa_enabled?: boolean
          theme?: string
          username?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          description: string
          end_date: string | null
          frequency: string
          id: string
          interval: number
          next_index: number
          payment_method_id: string | null
          start_date: string
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          currency: string
          description: string
          end_date?: string | null
          frequency: string
          id?: string
          interval?: number
          next_index?: number
          payment_method_id?: string | null
          start_date: string
          type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          end_date?: string | null
          frequency?: string
          id?: string
          interval?: number
          next_index?: number
          payment_method_id?: string | null
          start_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_user_id_account_id_currency_fkey"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "recurring_rules_user_id_account_id_currency_fkey"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "recurring_rules_user_id_category_id_type_fkey"
            columns: ["user_id", "category_id", "type"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id", "type"]
          },
          {
            foreignKeyName: "recurring_rules_user_id_payment_method_id_fkey"
            columns: ["user_id", "payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["user_id", "id"]
          },
        ]
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
          import_key: string | null
          payment_method_id: string | null
          recurrence_id: string | null
          recurrence_index: number | null
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
          import_key?: string | null
          payment_method_id?: string | null
          recurrence_id?: string | null
          recurrence_index?: number | null
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
          import_key?: string | null
          payment_method_id?: string | null
          recurrence_id?: string | null
          recurrence_index?: number | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_owned_rule"
            columns: ["user_id", "recurrence_id"]
            isOneToOne: false
            referencedRelation: "exact_recurring_rules"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "recurring_owned_rule"
            columns: ["user_id", "recurrence_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "transactions_owned_account_fkey"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "transactions_owned_account_fkey"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
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
      transfers: {
        Row: {
          created_at: string
          destination_account_id: string
          destination_amount: number
          destination_currency: string
          id: string
          note: string
          occurred_at: string
          source_account_id: string
          source_amount: number
          source_currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_account_id: string
          destination_amount: number
          destination_currency: string
          id?: string
          note?: string
          occurred_at?: string
          source_account_id: string
          source_amount: number
          source_currency: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_account_id?: string
          destination_amount?: number
          destination_currency?: string
          id?: string
          note?: string
          occurred_at?: string
          source_account_id?: string
          source_amount?: number
          source_currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_user_id_destination_account_id_destination_curre_fkey"
            columns: [
              "user_id",
              "destination_account_id",
              "destination_currency",
            ]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "transfers_user_id_destination_account_id_destination_curre_fkey"
            columns: [
              "user_id",
              "destination_account_id",
              "destination_currency",
            ]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "transfers_user_id_source_account_id_source_currency_fkey"
            columns: ["user_id", "source_account_id", "source_currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "transfers_user_id_source_account_id_source_currency_fkey"
            columns: ["user_id", "source_account_id", "source_currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
        ]
      }
    }
    Views: {
      exact_accounts: {
        Row: {
          archived: boolean | null
          balance: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          linked_activity_count: number | null
          name: string | null
          opening_balance: string | null
          transaction_count: number | null
          user_id: string | null
        }
        Insert: {
          archived?: boolean | null
          balance?: never
          created_at?: string | null
          currency?: string | null
          id?: string | null
          linked_activity_count?: never
          name?: string | null
          opening_balance?: never
          transaction_count?: never
          user_id?: string | null
        }
        Update: {
          archived?: boolean | null
          balance?: never
          created_at?: string | null
          currency?: string | null
          id?: string | null
          linked_activity_count?: never
          name?: string | null
          opening_balance?: never
          transaction_count?: never
          user_id?: string | null
        }
        Relationships: []
      }
      exact_debt_repayments: {
        Row: {
          account_id: string | null
          amount: string | null
          created_at: string | null
          currency: string | null
          debt_id: string | null
          effective_amount: string | null
          id: string | null
          note: string | null
          paid_at: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: never
          created_at?: string | null
          currency?: string | null
          debt_id?: string | null
          effective_amount?: never
          id?: string | null
          note?: string | null
          paid_at?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: never
          created_at?: string | null
          currency?: string | null
          debt_id?: string | null
          effective_amount?: never
          id?: string | null
          note?: string | null
          paid_at?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_repayments_user_id_debt_id_currency_fkey"
            columns: ["user_id", "debt_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_person_debts"
            referencedColumns: ["user_id", "id", "currency"]
          },
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
            referencedRelation: "exact_transactions"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "debt_repayments_user_id_transaction_id_currency_fkey"
            columns: ["user_id", "transaction_id", "currency"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "repayment_owned_account"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "repayment_owned_account"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
        ]
      }
      exact_monthly_budgets: {
        Row: {
          amount: string | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          month: string | null
          spent: string | null
          user_id: string | null
        }
        Insert: {
          amount?: never
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          month?: never
          spent?: never
          user_id?: string | null
        }
        Update: {
          amount?: never
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          month?: never
          spent?: never
          user_id?: string | null
        }
        Relationships: []
      }
      exact_objective_contributions: {
        Row: {
          account_id: string | null
          amount: string | null
          contributed_at: string | null
          created_at: string | null
          currency: string | null
          effective_amount: string | null
          id: string | null
          note: string | null
          objective_id: string | null
          transaction_id: string | null
          transfer_id: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: never
          contributed_at?: string | null
          created_at?: string | null
          currency?: string | null
          effective_amount?: never
          id?: string | null
          note?: string | null
          objective_id?: string | null
          transaction_id?: string | null
          transfer_id?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: never
          contributed_at?: string | null
          created_at?: string | null
          currency?: string | null
          effective_amount?: never
          id?: string | null
          note?: string | null
          objective_id?: string | null
          transaction_id?: string | null
          transfer_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_owned_account"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "contribution_owned_account"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "contribution_owned_transfer"
            columns: ["user_id", "transfer_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_transfers"
            referencedColumns: ["user_id", "id", "destination_currency"]
          },
          {
            foreignKeyName: "contribution_owned_transfer"
            columns: ["user_id", "transfer_id", "currency"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["user_id", "id", "destination_currency"]
          },
          {
            foreignKeyName: "objective_contributions_user_id_objective_id_currency_fkey"
            columns: ["user_id", "objective_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_objectives"
            referencedColumns: ["user_id", "id", "currency"]
          },
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
            referencedRelation: "exact_transactions"
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
      exact_objective_milestones: {
        Row: {
          amount: string | null
          created_at: string | null
          id: string | null
          name: string | null
          objective_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: never
          created_at?: string | null
          id?: string | null
          name?: string | null
          objective_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: never
          created_at?: string | null
          id?: string | null
          name?: string | null
          objective_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objective_milestones_user_id_objective_id_fkey"
            columns: ["user_id", "objective_id"]
            isOneToOne: false
            referencedRelation: "exact_objectives"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "objective_milestones_user_id_objective_id_fkey"
            columns: ["user_id", "objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      exact_objectives: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          kind: string | null
          name: string | null
          notes: string | null
          priority: string | null
          status: string | null
          target_amount: string | null
          target_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          kind?: string | null
          name?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          target_amount?: never
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          kind?: string | null
          name?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          target_amount?: never
          target_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exact_person_debts: {
        Row: {
          counterparty: string | null
          created_at: string | null
          currency: string | null
          direction: string | null
          due_date: string | null
          id: string | null
          notes: string | null
          original_amount: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          counterparty?: string | null
          created_at?: string | null
          currency?: string | null
          direction?: string | null
          due_date?: string | null
          id?: string | null
          notes?: string | null
          original_amount?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          counterparty?: string | null
          created_at?: string | null
          currency?: string | null
          direction?: string | null
          due_date?: string | null
          id?: string | null
          notes?: string | null
          original_amount?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exact_recurring_rules: {
        Row: {
          account_id: string | null
          active: boolean | null
          amount: string | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          frequency: string | null
          id: string | null
          interval: number | null
          next_index: number | null
          payment_method_id: string | null
          start_date: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          active?: boolean | null
          amount?: never
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          end_date?: never
          frequency?: string | null
          id?: string | null
          interval?: number | null
          next_index?: number | null
          payment_method_id?: string | null
          start_date?: never
          type?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          active?: boolean | null
          amount?: never
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          end_date?: never
          frequency?: string | null
          id?: string | null
          interval?: number | null
          next_index?: number | null
          payment_method_id?: string | null
          start_date?: never
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_user_id_account_id_currency_fkey"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "recurring_rules_user_id_account_id_currency_fkey"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "recurring_rules_user_id_category_id_type_fkey"
            columns: ["user_id", "category_id", "type"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id", "type"]
          },
          {
            foreignKeyName: "recurring_rules_user_id_payment_method_id_fkey"
            columns: ["user_id", "payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      exact_transactions: {
        Row: {
          account_id: string | null
          activity_kind: string | null
          amount: string | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          financial_date: string | null
          id: string | null
          payment_method_id: string | null
          transaction_date: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          activity_kind?: never
          amount?: never
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          financial_date?: never
          id?: string | null
          payment_method_id?: string | null
          transaction_date?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          activity_kind?: never
          amount?: never
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          financial_date?: never
          id?: string | null
          payment_method_id?: string | null
          transaction_date?: string | null
          type?: string | null
          user_id?: string | null
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
            foreignKeyName: "transactions_owned_account_fkey"
            columns: ["user_id", "account_id", "currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
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
      exact_transfers: {
        Row: {
          created_at: string | null
          destination_account_id: string | null
          destination_amount: string | null
          destination_currency: string | null
          id: string | null
          note: string | null
          occurred_at: string | null
          source_account_id: string | null
          source_amount: string | null
          source_currency: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          destination_account_id?: string | null
          destination_amount?: never
          destination_currency?: string | null
          id?: string | null
          note?: string | null
          occurred_at?: string | null
          source_account_id?: string | null
          source_amount?: never
          source_currency?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          destination_account_id?: string | null
          destination_amount?: never
          destination_currency?: string | null
          id?: string | null
          note?: string | null
          occurred_at?: string | null
          source_account_id?: string | null
          source_amount?: never
          source_currency?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_user_id_destination_account_id_destination_curre_fkey"
            columns: [
              "user_id",
              "destination_account_id",
              "destination_currency",
            ]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "transfers_user_id_destination_account_id_destination_curre_fkey"
            columns: [
              "user_id",
              "destination_account_id",
              "destination_currency",
            ]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "transfers_user_id_source_account_id_source_currency_fkey"
            columns: ["user_id", "source_account_id", "source_currency"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
          {
            foreignKeyName: "transfers_user_id_source_account_id_source_currency_fkey"
            columns: ["user_id", "source_account_id", "source_currency"]
            isOneToOne: false
            referencedRelation: "exact_accounts"
            referencedColumns: ["user_id", "id", "currency"]
          },
        ]
      }
      finance_monthly_totals: {
        Row: {
          amount: string | null
          category_id: string | null
          currency: string | null
          month: string | null
          transaction_count: number | null
          type: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_owned_category_fkey"
            columns: ["user_id", "category_id", "type"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["user_id", "id", "type"]
          },
        ]
      }
      finance_net_flow: {
        Row: {
          amount: string | null
          currency: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_own_account: { Args: { confirmation: string }; Returns: undefined }
      import_transactions: {
        Args: { p_batch: string; p_rows: Json; p_skip_duplicates: boolean }
        Returns: number
      }
      record_recurring_occurrence: {
        Args: { p_date: string; p_index: number; p_rule_id: string }
        Returns: string
      }
      transaction_page: {
        Args: { p_filters: Json; p_page: number }
        Returns: Json
      }
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
