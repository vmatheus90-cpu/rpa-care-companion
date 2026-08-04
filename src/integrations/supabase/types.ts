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
      aldrete_evaluations: {
        Row: {
          atividade: number
          circulacao: number
          consciencia: number
          evaluated_at: string
          evaluated_by: string | null
          id: string
          patient_id: string
          respiracao: number
          saturacao: number
          total: number
        }
        Insert: {
          atividade: number
          circulacao: number
          consciencia: number
          evaluated_at?: string
          evaluated_by?: string | null
          id?: string
          patient_id: string
          respiracao: number
          saturacao: number
          total: number
        }
        Update: {
          atividade?: number
          circulacao?: number
          consciencia?: number
          evaluated_at?: string
          evaluated_by?: string | null
          id?: string
          patient_id?: string
          respiracao?: number
          saturacao?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "aldrete_evaluations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          lido: boolean
          mensagem: string
          patient_id: string
          prioridade: Database["public"]["Enums"]["alert_priority"]
          tipo: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          lido?: boolean
          mensagem: string
          patient_id: string
          prioridade?: Database["public"]["Enums"]["alert_priority"]
          tipo: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          created_at?: string
          id?: string
          lido?: boolean
          mensagem?: string
          patient_id?: string
          prioridade?: Database["public"]["Enums"]["alert_priority"]
          tipo?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          administered_by: string | null
          created_at: string
          dose: string
          horario: string
          id: string
          medicamento: string
          observacao: string | null
          patient_id: string
          profissional: string | null
          via: string
        }
        Insert: {
          administered_by?: string | null
          created_at?: string
          dose: string
          horario?: string
          id?: string
          medicamento: string
          observacao?: string | null
          patient_id: string
          profissional?: string | null
          via: string
        }
        Update: {
          administered_by?: string | null
          created_at?: string
          dose?: string
          horario?: string
          id?: string
          medicamento?: string
          observacao?: string | null
          patient_id?: string
          profissional?: string | null
          via?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          anestesista: string | null
          cirurgiao: string | null
          created_at: string
          created_by: string | null
          entrada_rpa: string
          id: string
          idade: number
          nome: string
          procedimento: string | null
          prontuario: string
          proxima_avaliacao: string | null
          sexo: Database["public"]["Enums"]["patient_sex"]
          status: Database["public"]["Enums"]["patient_status"]
          updated_at: string
        }
        Insert: {
          anestesista?: string | null
          cirurgiao?: string | null
          created_at?: string
          created_by?: string | null
          entrada_rpa?: string
          id?: string
          idade: number
          nome: string
          procedimento?: string | null
          prontuario: string
          proxima_avaliacao?: string | null
          sexo: Database["public"]["Enums"]["patient_sex"]
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Update: {
          anestesista?: string | null
          cirurgiao?: string | null
          created_at?: string
          created_by?: string | null
          entrada_rpa?: string
          id?: string
          idade?: number
          nome?: string
          procedimento?: string | null
          prontuario?: string
          proxima_avaliacao?: string | null
          sexo?: Database["public"]["Enums"]["patient_sex"]
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vital_signs: {
        Row: {
          eva: number | null
          fc: number | null
          fr: number | null
          id: string
          pa_diastolica: number | null
          pa_sistolica: number | null
          patient_id: string
          recorded_at: string
          recorded_by: string | null
          saturacao: number | null
          temperatura: number | null
        }
        Insert: {
          eva?: number | null
          fc?: number | null
          fr?: number | null
          id?: string
          pa_diastolica?: number | null
          pa_sistolica?: number | null
          patient_id: string
          recorded_at?: string
          recorded_by?: string | null
          saturacao?: number | null
          temperatura?: number | null
        }
        Update: {
          eva?: number | null
          fc?: number | null
          fr?: number | null
          id?: string
          pa_diastolica?: number | null
          pa_sistolica?: number | null
          patient_id?: string
          recorded_at?: string
          recorded_by?: string | null
          saturacao?: number | null
          temperatura?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_signs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_priority: "baixa" | "media" | "alta" | "critica"
      alert_type:
        | "reavaliacao_vencida"
        | "proxima_avaliacao"
        | "aldrete_baixo"
        | "permanencia_prolongada"
        | "apto_alta"
      app_role: "admin" | "anestesista" | "enfermeiro" | "tecnico"
      patient_sex: "M" | "F"
      patient_status:
        | "em_avaliacao"
        | "aguardando_avaliacao"
        | "pronto_para_alta"
        | "alta"
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
      alert_priority: ["baixa", "media", "alta", "critica"],
      alert_type: [
        "reavaliacao_vencida",
        "proxima_avaliacao",
        "aldrete_baixo",
        "permanencia_prolongada",
        "apto_alta",
      ],
      app_role: ["admin", "anestesista", "enfermeiro", "tecnico"],
      patient_sex: ["M", "F"],
      patient_status: [
        "em_avaliacao",
        "aguardando_avaliacao",
        "pronto_para_alta",
        "alta",
      ],
    },
  },
} as const
