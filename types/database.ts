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
      ai_conversations: {
        Row: {
          context: string
          created_at: string
          id: string
          profile_id: string
          property_id: string | null
        }
        Insert: {
          context: string
          created_at?: string
          id?: string
          profile_id: string
          property_id?: string | null
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          profile_id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          role: string
        }
        Insert: {
          content: Json
          conversation_id: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role: string
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      case_notes: {
        Row: {
          author_id: string
          body: string
          case_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          case_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          case_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          ai_summary: string | null
          assigned_to: string | null
          created_at: string
          id: string
          plan: Database["public"]["Enums"]["plan_code"] | null
          profile_id: string
          property_id: string | null
          source: Database["public"]["Enums"]["case_source"]
          status: Database["public"]["Enums"]["case_status"]
          subject: string
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["plan_code"] | null
          profile_id: string
          property_id?: string | null
          source: Database["public"]["Enums"]["case_source"]
          status?: Database["public"]["Enums"]["case_status"]
          subject: string
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["plan_code"] | null
          profile_id?: string
          property_id?: string | null
          source?: Database["public"]["Enums"]["case_source"]
          status?: Database["public"]["Enums"]["case_status"]
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_to_fkey"
            columns: ["assigned_to"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string | null
          buyer_last_read_at: string | null
          closed_at: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at: string | null
          leenkey_last_read_at: string | null
          listing_id: string | null
          property_id: string
          seller_id: string
          seller_last_read_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_last_read_at?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          leenkey_last_read_at?: string | null
          listing_id?: string | null
          property_id: string
          seller_id: string
          seller_last_read_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_last_read_at?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          leenkey_last_read_at?: string | null
          listing_id?: string | null
          property_id?: string
          seller_id?: string
          seller_last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
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
      knowledge_base: {
        Row: {
          answer: string
          audience: string
          category: string
          embedding: string | null
          id: string
          question: string
          source_file: string | null
          step_code: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          audience: string
          category: string
          embedding?: string | null
          id?: string
          question: string
          source_file?: string | null
          step_code?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          audience?: string
          category?: string
          embedding?: string | null
          id?: string
          question?: string
          source_file?: string | null
          step_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          context: string
          document: string
          id: string
          profile_id: string
          subscription_id: string | null
          version: string
        }
        Insert: {
          accepted_at?: string
          context: string
          document: string
          id?: string
          profile_id: string
          subscription_id?: string | null
          version: string
        }
        Update: {
          accepted_at?: string
          context?: string
          document?: string
          id?: string
          profile_id?: string
          subscription_id?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_acceptances_subscription_id_fkey"
            columns: ["subscription_id"]
            referencedRelation: "subscriptions"
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
      messages: {
        Row: {
          ai_suggested: boolean
          body: string
          conversation_id: string
          created_at: string
          id: string
          kind: string
          meta: Json | null
          sender_id: string
        }
        Insert: {
          ai_suggested?: boolean
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json | null
          sender_id: string
        }
        Update: {
          ai_suggested?: boolean
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channels: Database["public"]["Enums"]["notification_channel"][]
          created_at: string
          email_sent_at: string | null
          id: string
          link: string | null
          profile_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          email_sent_at?: string | null
          id?: string
          link?: string | null
          profile_id: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          email_sent_at?: string | null
          id?: string
          link?: string | null
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            referencedRelation: "profiles"
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
      plan_entitlements: {
        Row: {
          feature: Database["public"]["Enums"]["plan_feature"]
          plan: Database["public"]["Enums"]["plan_code"]
        }
        Insert: {
          feature: Database["public"]["Enums"]["plan_feature"]
          plan: Database["public"]["Enums"]["plan_code"]
        }
        Update: {
          feature?: Database["public"]["Enums"]["plan_feature"]
          plan?: Database["public"]["Enums"]["plan_code"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_plan_fkey"
            columns: ["plan"]
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          code: Database["public"]["Enums"]["plan_code"]
          description: string
          features: string[]
          name: string
          position: number
          price_cents: number
          scope: string
          stripe_price_id: string | null
          tagline: string
        }
        Insert: {
          active?: boolean
          code: Database["public"]["Enums"]["plan_code"]
          description: string
          features: string[]
          name: string
          position: number
          price_cents: number
          scope?: string
          stripe_price_id?: string | null
          tagline: string
        }
        Update: {
          active?: boolean
          code?: Database["public"]["Enums"]["plan_code"]
          description?: string
          features?: string[]
          name?: string
          position?: number
          price_cents?: number
          scope?: string
          stripe_price_id?: string | null
          tagline?: string
        }
        Relationships: []
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
      reports: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_progress: {
        Row: {
          current_step_code: string
          plan: Database["public"]["Enums"]["plan_code"]
          property_id: string
          started_at: string
          updated_at: string | null
        }
        Insert: {
          current_step_code: string
          plan?: Database["public"]["Enums"]["plan_code"]
          property_id: string
          started_at?: string
          updated_at?: string | null
        }
        Update: {
          current_step_code?: string
          plan?: Database["public"]["Enums"]["plan_code"]
          property_id?: string
          started_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_progress_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_step_tasks: {
        Row: {
          auto_trigger: string | null
          code: string
          id: string
          owner: string | null
          position: number
          required: boolean
          step_id: string
          title: string
        }
        Insert: {
          auto_trigger?: string | null
          code: string
          id?: string
          owner?: string | null
          position: number
          required?: boolean
          step_id: string
          title: string
        }
        Update: {
          auto_trigger?: string | null
          code?: string
          id?: string
          owner?: string | null
          position?: number
          required?: boolean
          step_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_step_tasks_step_id_fkey"
            columns: ["step_id"]
            referencedRelation: "sale_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_steps: {
        Row: {
          auto_trigger: string | null
          code: string
          description: string
          id: string
          owner: string
          plan: Database["public"]["Enums"]["plan_code"]
          position: number
          title: string
        }
        Insert: {
          auto_trigger?: string | null
          code: string
          description: string
          id?: string
          owner: string
          plan: Database["public"]["Enums"]["plan_code"]
          position: number
          title: string
        }
        Update: {
          auto_trigger?: string | null
          code?: string
          description?: string
          id?: string
          owner?: string
          plan?: Database["public"]["Enums"]["plan_code"]
          position?: number
          title?: string
        }
        Relationships: []
      }
      sale_task_status: {
        Row: {
          done_at: string | null
          done_by: string | null
          property_id: string
          task_id: string
        }
        Insert: {
          done_at?: string | null
          done_by?: string | null
          property_id: string
          task_id: string
        }
        Update: {
          done_at?: string | null
          done_by?: string | null
          property_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_task_status_done_by_fkey"
            columns: ["done_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_task_status_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_task_status_task_id_fkey"
            columns: ["task_id"]
            referencedRelation: "sale_step_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          activated_at: string
          amount_paid_cents: number
          discount_cents: number
          ends_at: string | null
          id: string
          owner_id: string
          plan: Database["public"]["Enums"]["plan_code"]
          property_id: string
          refunded_at: string | null
          replaced_by: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_promotion_code: string | null
        }
        Insert: {
          activated_at?: string
          amount_paid_cents?: number
          discount_cents?: number
          ends_at?: string | null
          id?: string
          owner_id: string
          plan: Database["public"]["Enums"]["plan_code"]
          property_id: string
          refunded_at?: string | null
          replaced_by?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_promotion_code?: string | null
        }
        Update: {
          activated_at?: string
          amount_paid_cents?: number
          discount_cents?: number
          ends_at?: string | null
          id?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["plan_code"]
          property_id?: string
          refunded_at?: string | null
          replaced_by?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_promotion_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_replaced_by_fkey"
            columns: ["replaced_by"]
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      upgrade_prompts: {
        Row: {
          clicked_at: string | null
          dismissed_at: string | null
          id: string
          property_id: string
          shown_at: string
          target_plan: Database["public"]["Enums"]["plan_code"]
          trigger_code: string
        }
        Insert: {
          clicked_at?: string | null
          dismissed_at?: string | null
          id?: string
          property_id: string
          shown_at?: string
          target_plan: Database["public"]["Enums"]["plan_code"]
          trigger_code: string
        }
        Update: {
          clicked_at?: string | null
          dismissed_at?: string | null
          id?: string
          property_id?: string
          shown_at?: string
          target_plan?: Database["public"]["Enums"]["plan_code"]
          trigger_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_prompts_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
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
          carrez_m2: number | null
          charges_monthly_cents: number | null
          city: string | null
          copro_lots: number | null
          description: string | null
          district: string | null
          dpe_class: string | null
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
          id: string | null
          is_new_build: boolean | null
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
      admin_listing_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          total: number
          status: Database["public"]["Enums"]["listing_status"]
        }[]
      }
      admin_listing_seller_contact: {
        Args: { p_listing_id: string }
        Returns: {
          email: string
          first_name: string
        }[]
      }
      admin_listings: {
        Args: {
          p_status?: Database["public"]["Enums"]["listing_status"]
          p_query?: string
          p_limit?: number
        }
        Returns: {
          seller_first_name: string
          plan: Database["public"]["Enums"]["plan_code"]
          owner_id: string
          seller_last_name: string
          id: string
          reference: string
          slug: string
          title: string
          status: Database["public"]["Enums"]["listing_status"]
          price_cents: number
          created_at: string
          submitted_at: string
          published_at: string
          suspended_at: string
          type: Database["public"]["Enums"]["property_type"]
          city: string
          postal_code: string
          rooms: number
          surface_m2: number
        }[]
      }
      admin_set_roles: {
        Args: {
          p_roles: Database["public"]["Enums"]["user_role"][]
          p_profile_id: string
        }
        Returns: Database["public"]["Enums"]["user_role"][]
      }
      admin_suspend_user: {
        Args: { p_reason: string; p_profile_id: string }
        Returns: undefined
      }
      admin_unsuspend_user: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      audit: {
        Args: {
          p_entity: string
          p_entity_id: string
          p_meta?: Json
          p_action: string
        }
        Returns: undefined
      }
      buyer_summary_for_seller: {
        Args: { p_property_id: string }
        Returns: {
          project: Database["public"]["Enums"]["buyer_project"]
          financing_checked_at: string
          financing_document_type: Database["public"]["Enums"]["financing_document_type"]
          financing_status: Database["public"]["Enums"]["financing_status"]
          buyer_id: string
          first_name: string
        }[]
      }
      can_write_conversation: {
        Args: { c: string }
        Returns: boolean
      }
      conversation_mark_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      conversation_start: {
        Args: { p_listing_id: string }
        Returns: string
      }
      estimation_claim: {
        Args: { p_token: string }
        Returns: string
      }
      estimation_record: {
        Args: {
          p_input: Json
          p_result: Json
          p_value_cents?: number
          p_low_cents?: number
          p_high_cents?: number
          p_email?: string
        }
        Returns: {
          id: string
          claim_token: string
        }[]
      }
      has_buyer_relation: {
        Args: { b: string; p: string }
        Returns: boolean
      }
      is_active_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { c: string }
        Returns: boolean
      }
      legal_accept: {
        Args: { p_versions: Json }
        Returns: undefined
      }
      legal_record_signup: {
        Args: { p_legal: Json; p_profile_id: string }
        Returns: undefined
      }
      legal_version_valid: {
        Args: { p_version: string }
        Returns: boolean
      }
      listing_bad_transition: {
        Args: {
          p_from: Database["public"]["Enums"]["listing_status"]
          p_action: string
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
        Args: { p_listing_id: string; p_reason: string }
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
      owns_ai_conversation: {
        Args: { c: string }
        Returns: boolean
      }
      owns_property: {
        Args: { p: string }
        Returns: boolean
      }
      profile_add_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: Database["public"]["Enums"]["user_role"][]
      }
      property_current_plan: {
        Args: { p: string }
        Returns: Database["public"]["Enums"]["plan_code"]
      }
      property_is_editable: {
        Args: { p: string }
        Returns: boolean
      }
      property_soft_delete: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      public_listings_details: {
        Args: Record<PropertyKey, never>
        Returns: {
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
          floors_total: number
          carrez_m2: number
          heating: string
          copro_lots: number
          is_new_build: boolean
          id: string
          slug: string
          reference: string
          title: string
          description: string
          price_cents: number
          published_at: string
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
          has_balcony: boolean
        }[]
      }
      public_listings_rows: {
        Args: Record<PropertyKey, never>
        Returns: {
          public_location: unknown
          district: string
          floor: number
          bedrooms: number
          rooms: number
          surface_m2: number
          public_lng: number
          public_lat: number
          id: string
          slug: string
          reference: string
          title: string
          description: string
          price_cents: number
          published_at: string
          type: Database["public"]["Enums"]["property_type"]
          city: string
          postal_code: string
          plan: Database["public"]["Enums"]["plan_code"]
          seller_first_name: string
          property_tax_yearly_cents: number
          charges_monthly_cents: number
          ges_class: string
          dpe_class: string
          build_year: number
          orientation: string
          has_cellar: boolean
          has_parking: boolean
          has_garden: boolean
          has_terrace: boolean
          has_balcony: boolean
          has_elevator: boolean
        }[]
      }
      sale_task_is_seller_owned: {
        Args: { p_task_id: string }
        Returns: boolean
      }
      search_listings: {
        Args: {
          p_filters?: Json
          p_bbox?: number[]
          p_sort?: string
          p_page?: number
        }
        Returns: {
          postal_code: string
          id: string
          slug: string
          reference: string
          title: string
          price_cents: number
          published_at: string
          type: Database["public"]["Enums"]["property_type"]
          city: string
          district: string
          public_lat: number
          public_lng: number
          surface_m2: number
          rooms: number
          bedrooms: number
          floor: number
          has_elevator: boolean
          has_balcony: boolean
          has_terrace: boolean
          has_garden: boolean
          has_parking: boolean
          has_cellar: boolean
          dpe_class: string
          total_count: number
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
