export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      buyer_profiles: {
        Row: {
          budget_max_cents: number | null
          created_at: string
          current_financing_document_id: string | null
          down_payment_cents: number | null
          financing_status: Database["public"]["Enums"]["financing_status"]
          loan_amount_cents: number | null
          loan_needed: boolean | null
          profile_id: string
          project: Database["public"]["Enums"]["buyer_project"] | null
          situation_note: string | null
          target_cities: string[] | null
          updated_at: string | null
        }
        Insert: {
          budget_max_cents?: number | null
          created_at?: string
          current_financing_document_id?: string | null
          down_payment_cents?: number | null
          financing_status?: Database["public"]["Enums"]["financing_status"]
          loan_amount_cents?: number | null
          loan_needed?: boolean | null
          profile_id: string
          project?: Database["public"]["Enums"]["buyer_project"] | null
          situation_note?: string | null
          target_cities?: string[] | null
          updated_at?: string | null
        }
        Update: {
          budget_max_cents?: number | null
          created_at?: string
          current_financing_document_id?: string | null
          down_payment_cents?: number | null
          financing_status?: Database["public"]["Enums"]["financing_status"]
          loan_amount_cents?: number | null
          loan_needed?: boolean | null
          profile_id?: string
          project?: Database["public"]["Enums"]["buyer_project"] | null
          situation_note?: string | null
          target_cities?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_messages_date: string | null
          ai_messages_today: number
          avatar_path: string | null
          created_at: string
          deleted_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          notification_prefs: Json
          phone: string | null
          roles: Database["public"]["Enums"]["user_role"][]
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string | null
        }
        Insert: {
          ai_messages_date?: string | null
          ai_messages_today?: number
          avatar_path?: string | null
          created_at?: string
          deleted_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          notification_prefs?: Json
          phone?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_messages_date?: string | null
          ai_messages_today?: number
          avatar_path?: string | null
          created_at?: string
          deleted_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          notification_prefs?: Json
          phone?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      profile_add_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: Database["public"]["Enums"]["user_role"][]
      }
    }
    Enums: {
      acquisition_mode: "own_name" | "joint" | "sci" | "other"
      buyer_project:
        | "residence_principale"
        | "residence_secondaire"
        | "investissement"
      case_source: "plan_purchase" | "assistant_handoff" | "manual"
      case_status: "new" | "in_progress" | "closed"
      conversation_kind: "listing" | "advisor"
      document_type:
        | "dpe"
        | "amiante"
        | "plomb"
        | "electricite"
        | "gaz"
        | "termites"
        | "erp"
        | "carrez"
        | "titre_propriete"
        | "taxe_fonciere"
        | "pv_ag"
        | "reglement_copro"
        | "appel_charges"
        | "facture_travaux"
        | "autre"
      financing_document_type:
        | "accord_principe"
        | "attestation_courtier"
        | "simulation_bancaire"
        | "preuve_fonds_propres"
        | "autre"
      financing_mode: "no_loan" | "loan"
      financing_progress:
        | "not_presented"
        | "simulation_done"
        | "broker_consulted"
        | "agreement_in_principle"
        | "other"
      financing_status:
        | "not_provided"
        | "declared"
        | "document_provided"
        | "document_checked"
      listing_status:
        | "draft"
        | "pending"
        | "published"
        | "paused"
        | "suspended"
        | "sold"
        | "rejected"
      notification_channel: "in_app" | "email"
      offer_status:
        | "draft"
        | "submitted"
        | "viewed"
        | "accepted"
        | "declined"
        | "expired"
        | "withdrawn"
        | "superseded"
      plan_code: "autonomie" | "accompagne" | "serenite"
      plan_feature:
        | "advisor"
        | "human_price_strategy"
        | "human_listing_review"
        | "human_offer_analysis"
        | "negotiation_support"
        | "sale_file_building"
        | "deep_document_review"
        | "notary_coordination"
        | "closing_follow_up"
      property_type: "appartement" | "maison" | "terrain" | "autre"
      user_role: "seller" | "buyer" | "admin"
      visit_status: "requested" | "confirmed" | "done" | "cancelled"
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
      acquisition_mode: ["own_name", "joint", "sci", "other"],
      buyer_project: [
        "residence_principale",
        "residence_secondaire",
        "investissement",
      ],
      case_source: ["plan_purchase", "assistant_handoff", "manual"],
      case_status: ["new", "in_progress", "closed"],
      conversation_kind: ["listing", "advisor"],
      document_type: [
        "dpe",
        "amiante",
        "plomb",
        "electricite",
        "gaz",
        "termites",
        "erp",
        "carrez",
        "titre_propriete",
        "taxe_fonciere",
        "pv_ag",
        "reglement_copro",
        "appel_charges",
        "facture_travaux",
        "autre",
      ],
      financing_document_type: [
        "accord_principe",
        "attestation_courtier",
        "simulation_bancaire",
        "preuve_fonds_propres",
        "autre",
      ],
      financing_mode: ["no_loan", "loan"],
      financing_progress: [
        "not_presented",
        "simulation_done",
        "broker_consulted",
        "agreement_in_principle",
        "other",
      ],
      financing_status: [
        "not_provided",
        "declared",
        "document_provided",
        "document_checked",
      ],
      listing_status: [
        "draft",
        "pending",
        "published",
        "paused",
        "suspended",
        "sold",
        "rejected",
      ],
      notification_channel: ["in_app", "email"],
      offer_status: [
        "draft",
        "submitted",
        "viewed",
        "accepted",
        "declined",
        "expired",
        "withdrawn",
        "superseded",
      ],
      plan_code: ["autonomie", "accompagne", "serenite"],
      plan_feature: [
        "advisor",
        "human_price_strategy",
        "human_listing_review",
        "human_offer_analysis",
        "negotiation_support",
        "sale_file_building",
        "deep_document_review",
        "notary_coordination",
        "closing_follow_up",
      ],
      property_type: ["appartement", "maison", "terrain", "autre"],
      user_role: ["seller", "buyer", "admin"],
      visit_status: ["requested", "confirmed", "done", "cancelled"],
    },
  },
} as const
