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
          ip_key: string | null
          kind: string
          profile_id: string | null
          property_id: string | null
          visitor_key: string | null
        }
        Insert: {
          context: string
          created_at?: string
          id?: string
          ip_key?: string | null
          kind?: string
          profile_id?: string | null
          property_id?: string | null
          visitor_key?: string | null
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          ip_key?: string | null
          kind?: string
          profile_id?: string | null
          property_id?: string | null
          visitor_key?: string | null
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
          financing_checked_at: string | null
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
          financing_checked_at?: string | null
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
          financing_checked_at?: string | null
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
            foreignKeyName: "buyer_profiles_current_doc_fk"
            columns: ["current_financing_document_id"]
            referencedRelation: "financing_documents"
            referencedColumns: ["id"]
          },
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
          author_id: string | null
          body: string
          case_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          case_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string | null
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
      dpe_exemption_reasons: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          position: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          position: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      dpe_rules: {
        Row: {
          costs_required: boolean
          created_at: string
          excessive_classes: string[]
          figures_public: boolean
          figures_required: boolean
          kind: string
          updated_at: string | null
          valid_from: string | null
          validity_years: number
        }
        Insert: {
          costs_required: boolean
          created_at?: string
          excessive_classes?: string[]
          figures_public?: boolean
          figures_required: boolean
          kind: string
          updated_at?: string | null
          valid_from?: string | null
          validity_years: number
        }
        Update: {
          costs_required?: boolean
          created_at?: string
          excessive_classes?: string[]
          figures_public?: boolean
          figures_required?: boolean
          kind?: string
          updated_at?: string | null
          valid_from?: string | null
          validity_years?: number
        }
        Relationships: []
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
      financing_documents: {
        Row: {
          buyer_id: string
          check_note: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          deleted_at: string | null
          document_date: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          type: Database["public"]["Enums"]["financing_document_type"]
        }
        Insert: {
          buyer_id: string
          check_note?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          deleted_at?: string | null
          document_date: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          type: Database["public"]["Enums"]["financing_document_type"]
        }
        Update: {
          buyer_id?: string
          check_note?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          deleted_at?: string | null
          document_date?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          type?: Database["public"]["Enums"]["financing_document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financing_documents_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financing_documents_checked_by_fkey"
            columns: ["checked_by"]
            referencedRelation: "profiles"
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
          search_document: unknown | null
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
          search_document?: unknown | null
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
          search_document?: unknown | null
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
      listing_revisions: {
        Row: {
          changed_by: string
          created_at: string
          field: string
          id: string
          listing_id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          field: string
          id?: string
          listing_id: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          field?: string
          id?: string
          listing_id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_revisions_changed_by_fkey"
            columns: ["changed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_revisions_listing_id_fkey"
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
          data: Json
          email_after: string | null
          email_sent_at: string | null
          email_skipped_at: string | null
          group_key: string | null
          id: string
          link: string | null
          profile_id: string
          read_at: string | null
          title: string | null
          type: string
        }
        Insert: {
          body?: string | null
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          data?: Json
          email_after?: string | null
          email_sent_at?: string | null
          email_skipped_at?: string | null
          group_key?: string | null
          id?: string
          link?: string | null
          profile_id: string
          read_at?: string | null
          title?: string | null
          type: string
        }
        Update: {
          body?: string | null
          channels?: Database["public"]["Enums"]["notification_channel"][]
          created_at?: string
          data?: Json
          email_after?: string | null
          email_sent_at?: string | null
          email_skipped_at?: string | null
          group_key?: string | null
          id?: string
          link?: string | null
          profile_id?: string
          read_at?: string | null
          title?: string | null
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
      offer_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event: string
          id: number
          meta: Json | null
          offer_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event: string
          id?: never
          meta?: Json | null
          offer_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event?: string
          id?: never
          meta?: Json | null
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_events_actor_id_fkey"
            columns: ["actor_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_events_offer_id_fkey"
            columns: ["offer_id"]
            referencedRelation: "offer_for_seller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_events_offer_id_fkey"
            columns: ["offer_id"]
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          acquisition_mode: Database["public"]["Enums"]["acquisition_mode"]
          acquisition_mode_other: string | null
          answered_at: string | null
          buyer_id: string
          buyer_identity: Json
          co_buyers: Json
          condition_authorization: boolean
          condition_other: boolean
          condition_prior_sale: boolean
          conditions_details: string | null
          created_at: string
          declarations: Json
          down_payment_cents: number
          expired_at: string | null
          financing_document_id: string | null
          financing_mode: Database["public"]["Enums"]["financing_mode"] | null
          financing_progress:
            | Database["public"]["Enums"]["financing_progress"]
            | null
          financing_progress_other: string | null
          financing_status_at_submit:
            | Database["public"]["Enums"]["financing_status"]
            | null
          id: string
          lender_name: string | null
          listing_id: string
          loan_amount_cents: number
          loan_duration_years: number | null
          loan_rate_max_pct: number | null
          message: string | null
          pdf_path: string | null
          precontract_signed_at: string | null
          price_cents: number | null
          price_in_words: string | null
          property_snapshot: Json
          reference: string
          sci_details: Json | null
          seller_acceptance: Json | null
          seller_id: string
          status: Database["public"]["Enums"]["offer_status"]
          submitted_at: string | null
          superseded_by: string | null
          synthesis: Json | null
          updated_at: string | null
          validity_until: string | null
          version: number
          viewed_at: string | null
          visited: boolean | null
          withdrawal_period_start: string | null
          withdrawn_at: string | null
        }
        Insert: {
          acquisition_mode?: Database["public"]["Enums"]["acquisition_mode"]
          acquisition_mode_other?: string | null
          answered_at?: string | null
          buyer_id: string
          buyer_identity?: Json
          co_buyers?: Json
          condition_authorization?: boolean
          condition_other?: boolean
          condition_prior_sale?: boolean
          conditions_details?: string | null
          created_at?: string
          declarations?: Json
          down_payment_cents?: number
          expired_at?: string | null
          financing_document_id?: string | null
          financing_mode?: Database["public"]["Enums"]["financing_mode"] | null
          financing_progress?:
            | Database["public"]["Enums"]["financing_progress"]
            | null
          financing_progress_other?: string | null
          financing_status_at_submit?:
            | Database["public"]["Enums"]["financing_status"]
            | null
          id?: string
          lender_name?: string | null
          listing_id: string
          loan_amount_cents?: number
          loan_duration_years?: number | null
          loan_rate_max_pct?: number | null
          message?: string | null
          pdf_path?: string | null
          precontract_signed_at?: string | null
          price_cents?: number | null
          price_in_words?: string | null
          property_snapshot?: Json
          reference: string
          sci_details?: Json | null
          seller_acceptance?: Json | null
          seller_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          submitted_at?: string | null
          superseded_by?: string | null
          synthesis?: Json | null
          updated_at?: string | null
          validity_until?: string | null
          version?: number
          viewed_at?: string | null
          visited?: boolean | null
          withdrawal_period_start?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          acquisition_mode?: Database["public"]["Enums"]["acquisition_mode"]
          acquisition_mode_other?: string | null
          answered_at?: string | null
          buyer_id?: string
          buyer_identity?: Json
          co_buyers?: Json
          condition_authorization?: boolean
          condition_other?: boolean
          condition_prior_sale?: boolean
          conditions_details?: string | null
          created_at?: string
          declarations?: Json
          down_payment_cents?: number
          expired_at?: string | null
          financing_document_id?: string | null
          financing_mode?: Database["public"]["Enums"]["financing_mode"] | null
          financing_progress?:
            | Database["public"]["Enums"]["financing_progress"]
            | null
          financing_progress_other?: string | null
          financing_status_at_submit?:
            | Database["public"]["Enums"]["financing_status"]
            | null
          id?: string
          lender_name?: string | null
          listing_id?: string
          loan_amount_cents?: number
          loan_duration_years?: number | null
          loan_rate_max_pct?: number | null
          message?: string | null
          pdf_path?: string | null
          precontract_signed_at?: string | null
          price_cents?: number | null
          price_in_words?: string | null
          property_snapshot?: Json
          reference?: string
          sci_details?: Json | null
          seller_acceptance?: Json | null
          seller_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          submitted_at?: string | null
          superseded_by?: string | null
          synthesis?: Json | null
          updated_at?: string | null
          validity_until?: string | null
          version?: number
          viewed_at?: string | null
          visited?: boolean | null
          withdrawal_period_start?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_financing_document_fk"
            columns: ["financing_document_id"]
            referencedRelation: "financing_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_seller_id_fkey"
            columns: ["seller_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_superseded_by_fkey"
            columns: ["superseded_by"]
            referencedRelation: "offer_for_seller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_superseded_by_fkey"
            columns: ["superseded_by"]
            referencedRelation: "offers"
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
          position?: number
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
          dpe_date: string | null
          dpe_exempt: boolean
          dpe_exemption_reason: string | null
          dpe_kind: string
          dpe_number: string | null
          energy_cost_max_cents: number | null
          energy_cost_min_cents: number | null
          energy_kwh_m2_year: number | null
          energy_price_year: number | null
          estimation_high_cents: number | null
          estimation_id: string | null
          estimation_low_cents: number | null
          estimation_value_cents: number | null
          floor: number | null
          floors_total: number | null
          ges_class: string | null
          ges_kg_m2_year: number | null
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
          rooms: number | null
          surface_m2: number | null
          type: Database["public"]["Enums"]["property_type"] | null
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
          dpe_date?: string | null
          dpe_exempt?: boolean
          dpe_exemption_reason?: string | null
          dpe_kind?: string
          dpe_number?: string | null
          energy_cost_max_cents?: number | null
          energy_cost_min_cents?: number | null
          energy_kwh_m2_year?: number | null
          energy_price_year?: number | null
          estimation_high_cents?: number | null
          estimation_id?: string | null
          estimation_low_cents?: number | null
          estimation_value_cents?: number | null
          floor?: number | null
          floors_total?: number | null
          ges_class?: string | null
          ges_kg_m2_year?: number | null
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
          rooms?: number | null
          surface_m2?: number | null
          type?: Database["public"]["Enums"]["property_type"] | null
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
          dpe_date?: string | null
          dpe_exempt?: boolean
          dpe_exemption_reason?: string | null
          dpe_kind?: string
          dpe_number?: string | null
          energy_cost_max_cents?: number | null
          energy_cost_min_cents?: number | null
          energy_kwh_m2_year?: number | null
          energy_price_year?: number | null
          estimation_high_cents?: number | null
          estimation_id?: string | null
          estimation_low_cents?: number | null
          estimation_value_cents?: number | null
          floor?: number | null
          floors_total?: number | null
          ges_class?: string | null
          ges_kg_m2_year?: number | null
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
          rooms?: number | null
          surface_m2?: number | null
          type?: Database["public"]["Enums"]["property_type"] | null
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
      rate_limits: {
        Row: {
          bucket: string
          created_at: string
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          bucket: string
          created_at?: string
          hits?: number
          key: string
          window_start: string
        }
        Update: {
          bucket?: string
          created_at?: string
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
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
          fully_refunded: boolean | null
          id: string
          payment_intent_id: string | null
          processed_at: string
          refunded_cents: number | null
          type: string
        }
        Insert: {
          fully_refunded?: boolean | null
          id: string
          payment_intent_id?: string | null
          processed_at?: string
          refunded_cents?: number | null
          type: string
        }
        Update: {
          fully_refunded?: boolean | null
          id?: string
          payment_intent_id?: string | null
          processed_at?: string
          refunded_cents?: number | null
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          activated_at: string
          amount_paid_cents: number
          discount_cents: number
          early_start_requested_at: string | null
          end_reminded_at: string | null
          ends_at: string | null
          id: string
          owner_id: string
          plan: Database["public"]["Enums"]["plan_code"]
          plan_snapshot: Json | null
          property_id: string
          refunded_at: string | null
          replaced_by: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_promotion_code: string | null
          withdrawal_requested_at: string | null
        }
        Insert: {
          activated_at?: string
          amount_paid_cents?: number
          discount_cents?: number
          early_start_requested_at?: string | null
          end_reminded_at?: string | null
          ends_at?: string | null
          id?: string
          owner_id: string
          plan: Database["public"]["Enums"]["plan_code"]
          plan_snapshot?: Json | null
          property_id: string
          refunded_at?: string | null
          replaced_by?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_promotion_code?: string | null
          withdrawal_requested_at?: string | null
        }
        Update: {
          activated_at?: string
          amount_paid_cents?: number
          discount_cents?: number
          early_start_requested_at?: string | null
          end_reminded_at?: string | null
          ends_at?: string | null
          id?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["plan_code"]
          plan_snapshot?: Json | null
          property_id?: string
          refunded_at?: string | null
          replaced_by?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_promotion_code?: string | null
          withdrawal_requested_at?: string | null
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
      offer_for_seller: {
        Row: {
          acquisition_mode:
            | Database["public"]["Enums"]["acquisition_mode"]
            | null
          acquisition_mode_other: string | null
          answered_at: string | null
          buyer_id: string | null
          buyer_identity: Json | null
          co_buyers: Json | null
          condition_authorization: boolean | null
          condition_other: boolean | null
          condition_prior_sale: boolean | null
          conditions_details: string | null
          created_at: string | null
          declarations: Json | null
          down_payment_cents: number | null
          expired_at: string | null
          financing_mode: Database["public"]["Enums"]["financing_mode"] | null
          financing_progress:
            | Database["public"]["Enums"]["financing_progress"]
            | null
          financing_progress_other: string | null
          financing_status_at_submit:
            | Database["public"]["Enums"]["financing_status"]
            | null
          id: string | null
          lender_name: string | null
          listing_id: string | null
          loan_amount_cents: number | null
          loan_duration_years: number | null
          loan_rate_max_pct: number | null
          message: string | null
          pdf_path: string | null
          precontract_signed_at: string | null
          price_cents: number | null
          price_in_words: string | null
          property_snapshot: Json | null
          reference: string | null
          sci_details: Json | null
          seller_acceptance: Json | null
          seller_id: string | null
          status: Database["public"]["Enums"]["offer_status"] | null
          submitted_at: string | null
          superseded_by: string | null
          synthesis: Json | null
          validity_until: string | null
          version: number | null
          viewed_at: string | null
          visited: boolean | null
          withdrawal_period_start: string | null
          withdrawn_at: string | null
        }
        Insert: {
          acquisition_mode?:
            | Database["public"]["Enums"]["acquisition_mode"]
            | null
          acquisition_mode_other?: string | null
          answered_at?: string | null
          buyer_id?: string | null
          buyer_identity?: never
          co_buyers?: never
          condition_authorization?: boolean | null
          condition_other?: boolean | null
          condition_prior_sale?: boolean | null
          conditions_details?: string | null
          created_at?: string | null
          declarations?: Json | null
          down_payment_cents?: number | null
          expired_at?: never
          financing_mode?: Database["public"]["Enums"]["financing_mode"] | null
          financing_progress?:
            | Database["public"]["Enums"]["financing_progress"]
            | null
          financing_progress_other?: string | null
          financing_status_at_submit?:
            | Database["public"]["Enums"]["financing_status"]
            | null
          id?: string | null
          lender_name?: string | null
          listing_id?: string | null
          loan_amount_cents?: number | null
          loan_duration_years?: number | null
          loan_rate_max_pct?: number | null
          message?: string | null
          pdf_path?: never
          precontract_signed_at?: string | null
          price_cents?: number | null
          price_in_words?: string | null
          property_snapshot?: Json | null
          reference?: string | null
          sci_details?: never
          seller_acceptance?: Json | null
          seller_id?: string | null
          status?: never
          submitted_at?: string | null
          superseded_by?: string | null
          synthesis?: Json | null
          validity_until?: string | null
          version?: number | null
          viewed_at?: string | null
          visited?: boolean | null
          withdrawal_period_start?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          acquisition_mode?:
            | Database["public"]["Enums"]["acquisition_mode"]
            | null
          acquisition_mode_other?: string | null
          answered_at?: string | null
          buyer_id?: string | null
          buyer_identity?: never
          co_buyers?: never
          condition_authorization?: boolean | null
          condition_other?: boolean | null
          condition_prior_sale?: boolean | null
          conditions_details?: string | null
          created_at?: string | null
          declarations?: Json | null
          down_payment_cents?: number | null
          expired_at?: never
          financing_mode?: Database["public"]["Enums"]["financing_mode"] | null
          financing_progress?:
            | Database["public"]["Enums"]["financing_progress"]
            | null
          financing_progress_other?: string | null
          financing_status_at_submit?:
            | Database["public"]["Enums"]["financing_status"]
            | null
          id?: string | null
          lender_name?: string | null
          listing_id?: string | null
          loan_amount_cents?: number | null
          loan_duration_years?: number | null
          loan_rate_max_pct?: number | null
          message?: string | null
          pdf_path?: never
          precontract_signed_at?: string | null
          price_cents?: number | null
          price_in_words?: string | null
          property_snapshot?: Json | null
          reference?: string | null
          sci_details?: never
          seller_acceptance?: Json | null
          seller_id?: string | null
          status?: never
          submitted_at?: string | null
          superseded_by?: string | null
          synthesis?: Json | null
          validity_until?: string | null
          version?: number | null
          viewed_at?: string | null
          visited?: boolean | null
          withdrawal_period_start?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_seller_id_fkey"
            columns: ["seller_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_superseded_by_fkey"
            columns: ["superseded_by"]
            referencedRelation: "offer_for_seller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_superseded_by_fkey"
            columns: ["superseded_by"]
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
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
      admin_activity: {
        Args: { p_days?: number }
        Returns: {
          plans_sold: number
          plans_amount_cents: number
          signups: number
          signups_sellers: number
          signups_buyers: number
        }[]
      }
      admin_advisor_conversations: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          property_id: string
          seller_id: string
          case_id: string
          reference: string
          listing_title: string
          property_type: Database["public"]["Enums"]["property_type"]
          rooms: number
          city: string
          cover_path: string
          seller_first_name: string
          seller_last_name: string
          plan: Database["public"]["Enums"]["plan_code"]
          last_message_at: string
          last_message_body: string
          last_from_seller: boolean
          unread: boolean
          closed_at: string
        }[]
      }
      admin_ai_conversations: {
        Args: { p_limit?: number; p_query?: string; p_context?: string }
        Returns: {
          reference: string
          first_name: string
          last_name: string
          context: string
          id: string
          messages: number
          output_tokens: number
          last_at: string
          input_tokens: number
          created_at: string
          kind: string
          first_question: string
        }[]
      }
      admin_ai_usage: {
        Args: { p_days?: number }
        Returns: {
          day: string
          cache_write_tokens: number
          cache_read_tokens: number
          output_tokens: number
          input_tokens: number
          answers: number
          model: string
          context: string
        }[]
      }
      admin_case_add_note: {
        Args: { p_case: string; p_body: string }
        Returns: string
      }
      admin_case_assign: {
        Args: { p_case: string; p_assignee?: string }
        Returns: undefined
      }
      admin_case_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          new: number
          to_check: number
          closed: number
          in_progress: number
          open: number
        }[]
      }
      admin_case_lock: {
        Args: { p_case: string }
        Returns: {
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
      }
      admin_case_set_status: {
        Args: {
          p_case: string
          p_status: Database["public"]["Enums"]["case_status"]
        }
        Returns: undefined
      }
      admin_case_task_set: {
        Args: { p_case: string; p_done: boolean; p_task: string }
        Returns: boolean
      }
      admin_cases: {
        Args: {
          p_limit?: number
          p_query?: string
          p_status?: Database["public"]["Enums"]["case_status"]
        }
        Returns: {
          id: string
          to_check: boolean
          property_id: string
          subject: string
          source: Database["public"]["Enums"]["case_source"]
          plan: Database["public"]["Enums"]["plan_code"]
          updated_at: string
          status: Database["public"]["Enums"]["case_status"]
          created_at: string
          assigned_to: string
          last_name: string
          first_name: string
          profile_id: string
          city: string
          reference: string
          assigned_first_name: string
          assigned_last_name: string
        }[]
      }
      admin_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          listings_oldest_submitted_at: string
          listings_pending: number
          cases_open: number
          reports_open: number
          advisor_unread: number
        }[]
      }
      admin_financing_documents: {
        Args: { p_buyer_id: string }
        Returns: {
          checked_by_name: string
          type: Database["public"]["Enums"]["financing_document_type"]
          document_date: string
          mime_type: string
          deleted_at: string
          created_at: string
          id: string
          check_note: string
          is_current: boolean
          checked_at: string
          size_bytes: number
        }[]
      }
      admin_knowledge_import: {
        Args: { p_source_file: string; p_cards: Json }
        Returns: {
          inserted: number
          removed: number
          updated: number
          unchanged: number
        }[]
      }
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
          first_name: string
          email: string
        }[]
      }
      admin_listings: {
        Args: {
          p_limit?: number
          p_query?: string
          p_status?: Database["public"]["Enums"]["listing_status"]
        }
        Returns: {
          postal_code: string
          plan: Database["public"]["Enums"]["plan_code"]
          seller_last_name: string
          seller_first_name: string
          owner_id: string
          surface_m2: number
          rooms: number
          city: string
          type: Database["public"]["Enums"]["property_type"]
          suspended_at: string
          published_at: string
          submitted_at: string
          created_at: string
          price_cents: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          slug: string
          reference: string
          id: string
        }[]
      }
      admin_report_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          open: number
          resolved: number
        }[]
      }
      admin_report_lock: {
        Args: { p_report: string }
        Returns: {
          conversation_id: string | null
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
        }
      }
      admin_report_read: {
        Args: { p_report: string }
        Returns: {
          sender_id: string
          id: string
          body: string
          created_at: string
          kind: string
        }[]
      }
      admin_report_resolve: {
        Args: { p_note?: string; p_report: string }
        Returns: undefined
      }
      admin_report_warn: {
        Args: { p_report: string; p_reason: string }
        Returns: string
      }
      admin_reports: {
        Args: { p_limit?: number; p_open?: boolean }
        Returns: {
          reporter_last_name: string
          target_suspended_at: string
          target_deleted: boolean
          target_last_name: string
          target_first_name: string
          target_id: string
          reporter_deleted: boolean
          reporter_first_name: string
          reporter_id: string
          reference: string
          listing_title: string
          listing_id: string
          conversation_id: string
          resolved_at: string
          created_at: string
          reason: string
          id: string
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
      admin_user_contact: {
        Args: { p_profile_id: string }
        Returns: {
          confirmed_at: string
          email: string
          last_sign_in_at: string
        }[]
      }
      admin_user_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          total: number
          suspended: number
          admins: number
          buyers: number
          sellers: number
        }[]
      }
      admin_users: {
        Args: { p_limit?: number; p_query?: string; p_filter?: string }
        Returns: {
          id: string
          financing_status: Database["public"]["Enums"]["financing_status"]
          paid_plan: Database["public"]["Enums"]["plan_code"]
          properties: number
          suspended_at: string
          created_at: string
          roles: Database["public"]["Enums"]["user_role"][]
          email: string
          last_name: string
          first_name: string
        }[]
      }
      advisor_conversation_ensure: {
        Args: { p_property: string }
        Returns: string
      }
      advisor_right: {
        Args: { p_property: string }
        Returns: boolean
      }
      ai_advisor_handoff: {
        Args: {
          p_conversation_id: string
          p_tool_use_id: string
          p_tool_name: string
          p_property: string
          p_summary: string
        }
        Returns: string
      }
      ai_create_case: {
        Args: {
          p_tool_name: string
          p_subject: string
          p_summary: string
          p_tool_use_id: string
          p_property?: string
          p_conversation_id: string
        }
        Returns: string
      }
      ai_listing_update: {
        Args: {
          p_conversation_id: string
          p_tool_use_id: string
          p_tool_name: string
          p_listing_id: string
          p_description?: string
          p_price_cents?: number
        }
        Returns: undefined
      }
      ai_quota_consume: {
        Args: { p_limit: number }
        Returns: {
          allowed: boolean
          used: number
        }[]
      }
      ai_visitor_answer: {
        Args: {
          p_visitor: string
          p_key: string
          p_conversation: string
          p_content: Json
          p_model: string
          p_input_tokens: number
          p_output_tokens: number
        }
        Returns: boolean
      }
      ai_visitor_ask: {
        Args: {
          p_visitor: string
          p_key: string
          p_text?: string
          p_conversation?: string
          p_ip: string
        }
        Returns: {
          status: string
          conversation_id: string
        }[]
      }
      ai_visitor_conversation: {
        Args: { p_visitor: string; p_conversation: string }
        Returns: string
      }
      ai_visitor_day_start: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      ai_visitor_history: {
        Args: { p_key: string; p_visitor: string; p_conversation: string }
        Returns: {
          role: string
          created_at: string
          content: Json
        }[]
      }
      ai_visitor_purge: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      ai_visitor_questions: {
        Args: { p_visitor?: string; p_ip?: string }
        Returns: number
      }
      ai_visitor_server: {
        Args: { p_key: string }
        Returns: undefined
      }
      audit: {
        Args: {
          p_entity: string
          p_action: string
          p_meta?: Json
          p_entity_id: string
        }
        Returns: undefined
      }
      buyer_summary_for_seller: {
        Args: { p_property_id: string }
        Returns: {
          financing_checked_at: string
          buyer_id: string
          first_name: string
          project: Database["public"]["Enums"]["buyer_project"]
          financing_status: Database["public"]["Enums"]["financing_status"]
          financing_document_type: Database["public"]["Enums"]["financing_document_type"]
        }[]
      }
      can_write_conversation: {
        Args: { c: string }
        Returns: boolean
      }
      case_has_check: {
        Args: { p_case: string }
        Returns: boolean
      }
      conversation_mark_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      conversation_open: {
        Args: { p_body: string; p_listing_id: string }
        Returns: string
      }
      conversation_senders: {
        Args: { p_conversation_id: string }
        Returns: {
          first_name: string
          sender_id: string
        }[]
      }
      conversation_start: {
        Args: { p_listing_id: string }
        Returns: string
      }
      conversation_summaries: {
        Args: { p_conversation_id?: string }
        Returns: {
          plan: Database["public"]["Enums"]["plan_code"]
          closed_at: string
          unread: boolean
          last_message_mine: boolean
          last_message_at: string
          last_message_body: string
          buyer_financing_status: Database["public"]["Enums"]["financing_status"]
          counterpart_first_name: string
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          role: string
          property_id: string
          listing_id: string
          listing_slug: string
          listing_status: Database["public"]["Enums"]["listing_status"]
          listing_title: string
          property_type: Database["public"]["Enums"]["property_type"]
          rooms: number
          city: string
          cover_path: string
          advisor_ordered_at: string
        }[]
      }
      create_case: {
        Args: {
          p_summary: string
          p_property_id?: string
          p_subject: string
          p_source: Database["public"]["Enums"]["case_source"]
        }
        Returns: string
      }
      cron_call: {
        Args: { p_path: string }
        Returns: number
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
      estimations_purge: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      euros: {
        Args: { p_cents: number }
        Returns: string
      }
      financing_document_add: {
        Args: {
          p_size_bytes: number
          p_mime_type: string
          p_storage_path: string
          p_document_date: string
          p_type: Database["public"]["Enums"]["financing_document_type"]
        }
        Returns: string
      }
      financing_document_check: {
        Args: { p_document_id: string; p_note?: string }
        Returns: undefined
      }
      financing_document_remove: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      financing_file_buyer: {
        Args: { p_name: string }
        Returns: string
      }
      financing_file_in_use: {
        Args: { p_name: string }
        Returns: boolean
      }
      has_buyer_relation: {
        Args: { b: string; p: string }
        Returns: boolean
      }
      has_entitlement: {
        Args: {
          p_feature: Database["public"]["Enums"]["plan_feature"]
          p_property: string
        }
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
      knowledge_cards: {
        Args: { p_audience: string }
        Returns: {
          step_code: string
          id: string
          category: string
          question: string
          answer: string
        }[]
      }
      knowledge_cards_visitor: {
        Args: { p_key: string }
        Returns: {
          answer: string
          id: string
          category: string
          question: string
          step_code: string
        }[]
      }
      knowledge_import_cards: {
        Args: { p_cards: Json }
        Returns: {
          category: string
          step_code: string
          answer: string
          question: string
          audience: string
        }[]
      }
      legal_accept: {
        Args: { p_versions: Json }
        Returns: undefined
      }
      legal_record_signup: {
        Args: { p_profile_id: string; p_legal: Json }
        Returns: undefined
      }
      legal_version_valid: {
        Args: { p_version: string }
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
        Args: { p_sold_price_cents?: number; p_listing_id: string }
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
      listing_revision_add: {
        Args: {
          p_field: string
          p_old: Json
          p_listing: Database["public"]["Tables"]["listings"]["Row"]
          p_new: Json
        }
        Returns: undefined
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
          p_to?: Database["public"]["Enums"]["listing_status"]
          p_listing_id: string
        }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_view_increment: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      notification_add: {
        Args: {
          p_read_at?: string
          p_profile_id: string
          p_type: string
          p_created_at?: string
          p_email_after?: string
          p_group_key?: string
          p_link: string
          p_data: Json
        }
        Returns: string
      }
      notification_email_queue: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          id: string
          profile_id: string
          type: string
          data: Json
          link: string
          group_key: string
          email_after: string
          read_at: string
          email: string
          first_name: string
          prefs: Json
          active: boolean
          group_last_sent_at: string
        }[]
      }
      number_in_words_fr: {
        Args: { p_n: number }
        Returns: string
      }
      offer_answer: {
        Args: {
          p_accept: boolean
          p_confirmed_read?: boolean
          p_message?: string
          p_ip_hash?: string
          p_offer_id: string
        }
        Returns: Database["public"]["Enums"]["offer_status"]
      }
      offer_bad_transition: {
        Args: {
          p_action: string
          p_status: Database["public"]["Enums"]["offer_status"]
        }
        Returns: undefined
      }
      offer_can_draft: {
        Args: { p_listing: string }
        Returns: boolean
      }
      offer_event: {
        Args: { p_offer: string; p_event: string; p_meta?: Json }
        Returns: undefined
      }
      offer_expire_if_due: {
        Args: { p_offer: Database["public"]["Tables"]["offers"]["Row"] }
        Returns: {
          acquisition_mode: Database["public"]["Enums"]["acquisition_mode"]
          acquisition_mode_other: string | null
          answered_at: string | null
          buyer_id: string
          buyer_identity: Json
          co_buyers: Json
          condition_authorization: boolean
          condition_other: boolean
          condition_prior_sale: boolean
          conditions_details: string | null
          created_at: string
          declarations: Json
          down_payment_cents: number
          expired_at: string | null
          financing_document_id: string | null
          financing_mode: Database["public"]["Enums"]["financing_mode"] | null
          financing_progress:
            | Database["public"]["Enums"]["financing_progress"]
            | null
          financing_progress_other: string | null
          financing_status_at_submit:
            | Database["public"]["Enums"]["financing_status"]
            | null
          id: string
          lender_name: string | null
          listing_id: string
          loan_amount_cents: number
          loan_duration_years: number | null
          loan_rate_max_pct: number | null
          message: string | null
          pdf_path: string | null
          precontract_signed_at: string | null
          price_cents: number | null
          price_in_words: string | null
          property_snapshot: Json
          reference: string
          sci_details: Json | null
          seller_acceptance: Json | null
          seller_id: string
          status: Database["public"]["Enums"]["offer_status"]
          submitted_at: string | null
          superseded_by: string | null
          synthesis: Json | null
          updated_at: string | null
          validity_until: string | null
          version: number
          viewed_at: string | null
          visited: boolean | null
          withdrawal_period_start: string | null
          withdrawn_at: string | null
        }
      }
      offer_identity_complete: {
        Args: { p: Json }
        Returns: boolean
      }
      offer_identity_for_seller: {
        Args: { p_full: boolean; p_identity: Json }
        Returns: Json
      }
      offer_is_party: {
        Args: { p_offer: string }
        Returns: boolean
      }
      offer_mark_viewed: {
        Args: { p_offer_id: string }
        Returns: Database["public"]["Enums"]["offer_status"]
      }
      offer_record_precontract: {
        Args: {
          p_withdrawal_start?: string
          p_offer_id: string
          p_signed_at: string
        }
        Returns: undefined
      }
      offer_submit: {
        Args: { p_offer_id: string }
        Returns: Database["public"]["Enums"]["offer_status"]
      }
      offer_withdraw: {
        Args: { p_offer_id: string }
        Returns: Database["public"]["Enums"]["offer_status"]
      }
      offers_expire_due: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      owns_ai_conversation: {
        Args: { c: string }
        Returns: boolean
      }
      owns_property: {
        Args: { p: string }
        Returns: boolean
      }
      photo_file_property: {
        Args: { p_name: string }
        Returns: string
      }
      photo_file_readable: {
        Args: { p_name: string }
        Returns: boolean
      }
      photo_file_removable: {
        Args: { p_name: string }
        Returns: boolean
      }
      photo_file_writable: {
        Args: { p_name: string }
        Returns: boolean
      }
      photos_reorder: {
        Args: { p_property_id: string; p_photo_ids: string[] }
        Returns: undefined
      }
      price_in_words_fr: {
        Args: { p_cents: number }
        Returns: string
      }
      profile_add_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: Database["public"]["Enums"]["user_role"][]
      }
      property_current_plan: {
        Args: { p: string }
        Returns: Database["public"]["Enums"]["plan_code"]
      }
      property_dpe_issue: {
        Args: { p: Database["public"]["Tables"]["properties"]["Row"] }
        Returns: string
      }
      property_is_editable: {
        Args: { p: string }
        Returns: boolean
      }
      property_soft_delete: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      public_listing_dpe: {
        Args: { p_slug: string }
        Returns: {
          ges_kg_m2_year: number
          dpe_kind: string
          dpe_exempt: boolean
          dpe_exemption_reason: string
          energy_cost_min_cents: number
          energy_cost_max_cents: number
          energy_price_year: number
          energy_kwh_m2_year: number
          excessive: boolean
        }[]
      }
      public_listing_energy: {
        Args: { p_slug: string }
        Returns: {
          energy_cost_min_cents: number
          energy_cost_max_cents: number
          dpe_exempt: boolean
          energy_price_year: number
          dpe_date: string
        }[]
      }
      public_listing_photos: {
        Args: { p_cover_only?: boolean; p_listing_ids: string[] }
        Returns: {
          height: number
          width: number
          path: string
          listing_id: string
          caption: string
          total: number
          position: number
        }[]
      }
      public_listings_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          orientation: string
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
          has_terrace: boolean
          has_garden: boolean
          has_parking: boolean
          has_cellar: boolean
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
        }[]
      }
      public_listings_rows: {
        Args: Record<PropertyKey, never>
        Returns: {
          dpe_class: string
          orientation: string
          has_cellar: boolean
          has_parking: boolean
          has_garden: boolean
          has_terrace: boolean
          has_balcony: boolean
          has_elevator: boolean
          floor: number
          bedrooms: number
          rooms: number
          surface_m2: number
          public_lng: number
          public_lat: number
          public_location: unknown
          district: string
          postal_code: string
          city: string
          type: Database["public"]["Enums"]["property_type"]
          published_at: string
          price_cents: number
          description: string
          title: string
          reference: string
          slug: string
          id: string
          build_year: number
          plan: Database["public"]["Enums"]["plan_code"]
          seller_first_name: string
          property_tax_yearly_cents: number
          charges_monthly_cents: number
          ges_class: string
        }[]
      }
      rate_limit_hit: {
        Args: {
          p_bucket: string
          p_count?: boolean
          p_server: string
          p_key: string
        }
        Returns: boolean
      }
      rate_limit_server: {
        Args: { p_key: string }
        Returns: undefined
      }
      rate_limits_purge: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      report_target: {
        Args: { p_buyer: string; p_reporter: string; p_seller: string }
        Returns: string
      }
      sale_declare_event: {
        Args: { p_event: string; p_property_id: string }
        Returns: boolean
      }
      sale_emit_event: {
        Args: { p_property_id: string; p_event: string }
        Returns: number
      }
      sale_refresh_progress: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      sale_task_is_seller_manual: {
        Args: { p_task_id: string; p_property_id: string }
        Returns: boolean
      }
      search_knowledge: {
        Args: {
          p_embedding: string
          p_query: string
          p_limit?: number
          p_step_code?: string
          p_audience: string
        }
        Returns: {
          step_code: string
          id: string
          similarity: number
          score: number
          answer: string
          category: string
          question: string
        }[]
      }
      search_listings: {
        Args: {
          p_sort?: string
          p_filters?: Json
          p_page?: number
          p_bbox?: number[]
        }
        Returns: {
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
          public_lng: number
          public_lat: number
          district: string
          postal_code: string
          city: string
          type: Database["public"]["Enums"]["property_type"]
          surface_m2: number
          published_at: string
          price_cents: number
          title: string
          reference: string
          slug: string
          id: string
        }[]
      }
      slugify: {
        Args: { p: string }
        Returns: string
      }
      stripe_charge_refunded: {
        Args: {
          p_event_id: string
          p_payment_intent_id: string
          p_amount_refunded_cents: number
          p_fully_refunded: boolean
        }
        Returns: Json
      }
      stripe_checkout_complete: {
        Args: {
          p_event_id: string
          p_property_id: string
          p_owner_id: string
          p_upgrade: boolean
          p_plan: Database["public"]["Enums"]["plan_code"]
          p_amount_paid_cents: number
          p_discount_cents: number
          p_early_start: boolean
          p_accepted_at: string
          p_payment_intent_id: string
          p_cgu_version: string
          p_cgv_version: string
          p_promotion_code?: string
          p_session_id: string
        }
        Returns: Json
      }
      subscription_withdraw: {
        Args: { p_with_replaced?: boolean; p_subscription_id: string }
        Returns: Json
      }
      subscriptions_daily: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      team_email_addresses: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      words_below_1000_fr: {
        Args: { p_final: boolean; p_n: number }
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
