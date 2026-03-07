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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aniversariantes: {
        Row: {
          created_at: string
          data_aniversario: string
          id: string
          nome: string
          parentesco: string
          updated_at: string
          user_id: string
          user_phone: string
        }
        Insert: {
          created_at?: string
          data_aniversario: string
          id?: string
          nome: string
          parentesco?: string
          updated_at?: string
          user_id: string
          user_phone: string
        }
        Update: {
          created_at?: string
          data_aniversario?: string
          id?: string
          nome?: string
          parentesco?: string
          updated_at?: string
          user_id?: string
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "aniversariantes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          tipo: string
          user_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          tipo?: string
          user_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financas: {
        Row: {
          categoria_id: string | null
          created_at: string
          data_vencimento: string | null
          descricao: string | null
          id: string
          is_recorrente: boolean
          status: string
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          is_recorrente?: boolean
          status?: string
          tipo: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          is_recorrente?: boolean
          status?: string
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_cerebro: {
        Row: {
          categoria_id: string | null
          completed_at: string | null
          created_at: string
          data_hora_agendada: string | null
          descricao: string | null
          id: string
          status: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string | null
          user_phone: string
        }
        Insert: {
          categoria_id?: string | null
          completed_at?: string | null
          created_at?: string
          data_hora_agendada?: string | null
          descricao?: string | null
          id?: string
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
          user_id?: string | null
          user_phone: string
        }
        Update: {
          categoria_id?: string | null
          completed_at?: string | null
          created_at?: string
          data_hora_agendada?: string | null
          descricao?: string | null
          id?: string
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string | null
          user_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_cerebro_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_cerebro_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_activations: {
        Row: {
          created_at: string
          credits: number
          email: string
          id: string
          platform: string | null
          subscription_expires_at: string | null
          subscription_status: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          credits?: number
          email: string
          id?: string
          platform?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          credits?: number
          email?: string
          id?: string
          platform?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          credits: number
          email: string | null
          id: string
          subscription_expires_at: string | null
          subscription_status: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          credits?: number
          email?: string | null
          id: string
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          credits?: number
          email?: string | null
          id?: string
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string | null
          connected_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_expired_subscriptions: { Args: never; Returns: undefined }
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
    Enums: {},
  },
} as const
