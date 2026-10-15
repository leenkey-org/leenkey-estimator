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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          meta: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: never
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: never
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      estimations: {
        Row: {
          claim_token: string | null
          created_at: string
          email: string | null
          high_cents: number | null
          id: string
          input: Json
          low_cents: number | null
          profile_id: string | null
          result: Json
          value_cents: number | null
        }
        Insert: {
          claim_token?: string | null
          created_at?: string
          email?: string | null
          high_cents?: number | null
          id?: string
          input: Json
          low_cents?: number | null
          profile_id?: string | null
          result: Json
          value_cents?: number | null
        }
        Update: {
          claim_token?: string | null
          created_at?: string
          email?: string | null
          high_cents?: number | null
          id?: string
          input?: Json
          low_cents?: number | null
          profile_id?: string | null
          result?: Json
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimations_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          buyer_id: string
          created_at: string
          listing_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          listing_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          count: number
          day: string
          listing_id: string
        }
        Insert: {
          count?: number
          day: string
          listing_id: string
        }
        Update: {
          count?: number
          day?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          price_cents: number
          property_id: string
          published_at: string | null
          reference: string
          rejection_reason: string | null
          review: Json | null
          slug: string
          sold_at: string | null
          sold_price_cents: number | null
          status: Database["public"]["Enums"]["listing_status"]
          submitted_at: string | null
          summary: string | null
          suspended_at: string | null
          suspension_reason: string | null
          title: string
          updated_at: string | null
          views_count: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          price_cents: number
          property_id: string
          published_at?: string | null
          reference: string
          rejection_reason?: string | null
          review?: Json | null
          slug: string
          sold_at?: string | null
          sold_price_cents?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          summary?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          title: string
          updated_at?: string | null
          views_count?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          price_cents?: number
          property_id?: string
          published_at?: string | null
          reference?: string
          rejection_reason?: string | null
          review?: Json | null
          slug?: string
          sold_at?: string | null
          sold_price_cents?: number | null
          status?: Database["public"]["Enums"]["listing_status"]
          submitted_at?: string | null
          summary?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          title?: string
          updated_at?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          height: number | null
          id: string
          is_cover: boolean
          position: number
          property_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_cover?: boolean
          position: number
          property_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          is_cover?: boolean
          position?: number
          property_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
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
      properties: {
        Row: {
          address_line: string
          bedrooms: number | null
          build_year: number | null
          carrez_m2: number | null
          charges_monthly_cents: number | null
          city: string
          copro_lots: number | null
          created_at: string
          deleted_at: string | null
          district: string | null
          dpe_class: string | null
          estimation_high_cents: number | null
          estimation_id: string | null
          estimation_low_cents: number | null
          estimation_value_cents: number | null
          floor: number | null
          floors_total: number | null
          ges_class: string | null
          has_balcony: boolean | null
          has_cellar: boolean | null
          has_elevator: boolean | null
          has_garden: boolean | null
          has_parking: boolean | null
          has_terrace: boolean | null
          heating: string | null
          id: string
          is_new_build: boolean
          location: unknown | null
          orientation: string | null
          owner_id: string
          postal_code: string
          property_tax_yearly_cents: number | null
          public_location: unknown | null
          rooms: number
          surface_m2: number
          type: Database["public"]["Enums"]["property_type"]
          updated_at: string | null
        }
        Insert: {
          address_line: string
          bedrooms?: number | null
          build_year?: number | null
          carrez_m2?: number | null
          charges_monthly_cents?: number | null
          city: string
          copro_lots?: number | null
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          dpe_class?: string | null
          estimation_high_cents?: number | null
          estimation_id?: string | null
          estimation_low_cents?: number | null
          estimation_value_cents?: number | null
          floor?: number | null
          floors_total?: number | null
          ges_class?: string | null
          has_balcony?: boolean | null
          has_cellar?: boolean | null
          has_elevator?: boolean | null
          has_garden?: boolean | null
          has_parking?: boolean | null
          has_terrace?: boolean | null
          heating?: string | null
          id?: string
          is_new_build?: boolean
          location?: unknown | null
          orientation?: string | null
          owner_id: string
          postal_code: string
          property_tax_yearly_cents?: number | null
          public_location?: unknown | null
          rooms: number
          surface_m2: number
          type: Database["public"]["Enums"]["property_type"]
          updated_at?: string | null
        }
        Update: {
          address_line?: string
          bedrooms?: number | null
          build_year?: number | null
          carrez_m2?: number | null
          charges_monthly_cents?: number | null
          city?: string
          copro_lots?: number | null
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          dpe_class?: string | null
          estimation_high_cents?: number | null
          estimation_id?: string | null
          estimation_low_cents?: number | null
          estimation_value_cents?: number | null
          floor?: number | null
          floors_total?: number | null
          ges_class?: string | null
          has_balcony?: boolean | null
          has_cellar?: boolean | null
          has_elevator?: boolean | null
          has_garden?: boolean | null
          has_parking?: boolean | null
          has_terrace?: boolean | null
          heating?: string | null
          id?: string
          is_new_build?: boolean
          location?: unknown | null
          orientation?: string | null
          owner_id?: string
          postal_code?: string
          property_tax_yearly_cents?: number | null
          public_location?: unknown | null
          rooms?: number
          surface_m2?: number
          type?: Database["public"]["Enums"]["property_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_estimation_id_fkey"
            columns: ["estimation_id"]
            referencedRelation: "estimations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_listings: {
        Row: {
          bedrooms: number | null
          build_year: number | null
          charges_monthly_cents: number | null
          city: string | null
          description: string | null
          district: string | null
          dpe_class: string | null
          floor: number | null
          ges_class: string | null
          has_balcony: boolean | null
          has_cellar: boolean | null
          has_elevator: boolean | null
          has_garden: boolean | null
          has_parking: boolean | null
          has_terrace: boolean | null
          id: string | null
          orientation: string | null
          plan: Database["public"]["Enums"]["plan_code"] | null
          postal_code: string | null
          price_cents: number | null
          property_tax_yearly_cents: number | null
          public_lat: number | null
          public_lng: number | null
          public_location: unknown | null
          published_at: string | null
          reference: string | null
          rooms: number | null
          seller_first_name: string | null
          slug: string | null
          surface_m2: number | null
          title: string | null
          type: Database["public"]["Enums"]["property_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      audit: {
        Args: {
          p_entity: string
          p_meta?: Json
          p_entity_id: string
          p_action: string
        }
        Returns: undefined
      }
      estimation_claim: {
        Args: { p_token: string }
        Returns: string
      }
      estimation_record: {
        Args: {
          p_low_cents?: number
          p_input: Json
          p_result: Json
          p_value_cents?: number
          p_high_cents?: number
          p_email?: string
        }
        Returns: {
          id: string
          claim_token: string
        }[]
      }
      is_active_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      listing_bad_transition: {
        Args: {
          p_action: string
          p_from: Database["public"]["Enums"]["listing_status"]
        }
        Returns: undefined
      }
      listing_cancel_submission: {
        Args: { p_listing_id: string }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_for_seller: {
        Args: { p_listing_id: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          price_cents: number
          property_id: string
          published_at: string | null
          reference: string
          rejection_reason: string | null
          review: Json | null
          slug: string
          sold_at: string | null
          sold_price_cents: number | null
          status: Database["public"]["Enums"]["listing_status"]
          submitted_at: string | null
          summary: string | null
          suspended_at: string | null
          suspension_reason: string | null
          title: string
          updated_at: string | null
          views_count: number
        }
      }
      listing_is_public: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      listing_mark_sold: {
        Args: { p_listing_id: string; p_sold_price_cents?: number }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_pause: {
        Args: { p_listing_id: string }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_publish: {
        Args: { p_listing_id: string }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_reject: {
        Args: { p_reason: string; p_listing_id: string }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_require_admin: {
        Args: { p_listing_id: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          price_cents: number
          property_id: string
          published_at: string | null
          reference: string
          rejection_reason: string | null
          review: Json | null
          slug: string
          sold_at: string | null
          sold_price_cents: number | null
          status: Database["public"]["Enums"]["listing_status"]
          submitted_at: string | null
          summary: string | null
          suspended_at: string | null
          suspension_reason: string | null
          title: string
          updated_at: string | null
          views_count: number
        }
      }
      listing_resume: {
        Args: { p_listing_id: string }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_submit: {
        Args: { p_listing_id: string; p_review?: Json }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_suspend: {
        Args: { p_listing_id: string; p_reason: string }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_unsuspend: {
        Args: {
          p_listing_id: string
          p_to?: Database["public"]["Enums"]["listing_status"]
        }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_view_increment: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      owns_property: {
        Args: { p: string }
        Returns: boolean
      }
      profile_add_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: Database["public"]["Enums"]["user_role"][]
      }
      property_is_editable: {
        Args: { p: string }
        Returns: boolean
      }
      property_soft_delete: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      public_listings_rows: {
        Args: Record<PropertyKey, never>
        Returns: {
          has_balcony: boolean
          type: Database["public"]["Enums"]["property_type"]
          city: string
          postal_code: string
          district: string
          public_location: unknown
          public_lat: number
          public_lng: number
          surface_m2: number
          rooms: number
          bedrooms: number
          floor: number
          has_elevator: boolean
          has_terrace: boolean
          has_garden: boolean
          has_parking: boolean
          has_cellar: boolean
          orientation: string
          build_year: number
          dpe_class: string
          ges_class: string
          charges_monthly_cents: number
          property_tax_yearly_cents: number
          seller_first_name: string
          plan: Database["public"]["Enums"]["plan_code"]
          id: string
          slug: string
          reference: string
          title: string
          description: string
          price_cents: number
          published_at: string
        }[]
      }
      slugify: {
        Args: { p: string }
        Returns: string
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
