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
      company_settings: {
        Row: {
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Update: {
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          account_number: string | null
          agency: string | null
          balance: number
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          agency?: string | null
          balance?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          agency?: string | null
          balance?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          account_id: string | null
          category_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          project_id: string | null
          recurrence: string | null
          status: string
          type: string
          value: number
        }
        Insert: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          project_id?: string | null
          recurrence?: string | null
          status?: string
          type?: string
          value?: number
        }
        Update: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          project_id?: string | null
          recurrence?: string | null
          status?: string
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          account_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          project_id: string | null
          transaction_date: string
          type: string
          value: number
        }
        Insert: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          transaction_date?: string
          type?: string
          value?: number
        }
        Update: {
          account_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          transaction_date?: string
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          email?: string | null
          id: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blocked?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_stages: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          name: string
          order: number
          project_id: string
          responsible_id: string | null
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          order?: number
          project_id: string
          responsible_id?: string | null
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          order?: number
          project_id?: string
          responsible_id?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          initial_investment: number
          is_template: boolean
          name: string
          progress: number
          project_code: string
          responsible_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          initial_investment?: number
          is_template?: boolean
          name: string
          progress?: number
          project_code: string
          responsible_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          initial_investment?: number
          is_template?: boolean
          name?: string
          progress?: number
          project_code?: string
          responsible_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_order_attachments: {
        Row: {
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          service_order_id: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          service_order_id: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_attachments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          approved_by_creator: boolean
          assigned_to: string
          completed_by_executor: boolean
          created_at: string
          created_by: string
          id: string
          observation: string | null
          os_code: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_by_creator?: boolean
          assigned_to: string
          completed_by_executor?: boolean
          created_at?: string
          created_by: string
          id?: string
          observation?: string | null
          os_code: string
          priority?: string
          project_id: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          approved_by_creator?: boolean
          assigned_to?: string
          completed_by_executor?: boolean
          created_at?: string
          created_by?: string
          id?: string
          observation?: string | null
          os_code?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          priority: string
          progress: number
          project_id: string
          responsible_id: string | null
          stage_id: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          priority?: string
          progress?: number
          project_id: string
          responsible_id?: string | null
          stage_id?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          priority?: string
          progress?: number
          project_id?: string
          responsible_id?: string | null
          stage_id?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          module: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          module: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_module: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "operational"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "operational"],
    },
  },
} as const
