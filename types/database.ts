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
      admin_daily_briefs: {
        Row: {
          body: string
          conversation_id: string | null
          created_at: string
          generated_by: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          body: string
          conversation_id?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string | null
          created_at?: string
          generated_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_daily_briefs_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_daily_briefs_generated_by_fkey"
            columns: ["generated_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_interventions: {
        Row: {
          created_at: string
          done_at: string | null
          done_by: string | null
          id: string
          message: string | null
          property_id: string
          reason: Database["public"]["Enums"]["advisor_intervention_reason"]
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["advisor_intervention_status"]
          team_note: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          message?: string | null
          property_id: string
          reason: Database["public"]["Enums"]["advisor_intervention_reason"]
          requested_at?: string
          requested_by: string
          status?: Database["public"]["Enums"]["advisor_intervention_status"]
          team_note?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          message?: string | null
          property_id?: string
          reason?: Database["public"]["Enums"]["advisor_intervention_reason"]
          requested_at?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["advisor_intervention_status"]
          team_note?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisor_interventions_done_by_fkey"
            columns: ["done_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_interventions_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_interventions_requested_by_fkey"
            columns: ["requested_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      alert_similar_sent: {
        Row: {
          buyer_id: string
          created_at: string
          listing_id: string
          listings_count: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          listing_id: string
          listings_count: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          listing_id?: string
          listings_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_similar_sent_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_similar_sent_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          active: boolean
          buyer_id: string
          created_at: string
          criteria: Json
          id: string
          last_sent_at: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          buyer_id: string
          created_at?: string
          criteria: Json
          id?: string
          last_sent_at?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          buyer_id?: string
          created_at?: string
          criteria?: Json
          id?: string
          last_sent_at?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
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
      credit_notes: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          issued_at: string
          number: string
          pdf_url: string | null
          refund_email_claimed_at: string | null
          refund_emailed_at: string | null
          stripe_credit_note_id: string
          subscription_id: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          issued_at: string
          number: string
          pdf_url?: string | null
          refund_email_claimed_at?: string | null
          refund_emailed_at?: string | null
          stripe_credit_note_id: string
          subscription_id: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          issued_at?: string
          number?: string
          pdf_url?: string | null
          refund_email_claimed_at?: string | null
          refund_emailed_at?: string | null
          stripe_credit_note_id?: string
          subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_subscription_id_fkey"
            columns: ["subscription_id"]
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_requests: {
        Row: {
          answered_at: string | null
          buyer_id: string
          created_at: string
          id: string
          property_id: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          property_id: string
          status?: string
        }
        Update: {
          answered_at?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_requests_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      document_analysis_attempts: {
        Row: {
          created_at: string
          document_id: string
          id: number
          owner_id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: never
          owner_id: string
          property_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: never
          owner_id?: string
          property_id?: string
        }
        Relationships: []
      }
      document_exemptions: {
        Row: {
          created_at: string
          property_id: string
          reason: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          property_id: string
          reason: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          property_id?: string
          reason?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_exemptions_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          buyer_id: string
          document_id: string
          shared_at: string
        }
        Insert: {
          buyer_id: string
          document_id: string
          shared_at?: string
        }
        Update: {
          buyer_id?: string
          document_id?: string
          shared_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          analysis: Json | null
          analysis_attempts: number
          analysis_error: string | null
          analysis_retried_at: string[]
          analysis_started_at: string | null
          analyzed_at: string | null
          covers: Database["public"]["Enums"]["document_type"][]
          created_at: string
          deleted_at: string | null
          extracted_text: string | null
          id: string
          mime_type: string
          owner_id: string
          page_count: number | null
          property_id: string
          public_facts_approved_at: string | null
          review_note: string | null
          reviewed_at: string | null
          size_bytes: number
          storage_path: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
        }
        Insert: {
          analysis?: Json | null
          analysis_attempts?: number
          analysis_error?: string | null
          analysis_retried_at?: string[]
          analysis_started_at?: string | null
          analyzed_at?: string | null
          covers?: Database["public"]["Enums"]["document_type"][]
          created_at?: string
          deleted_at?: string | null
          extracted_text?: string | null
          id?: string
          mime_type: string
          owner_id: string
          page_count?: number | null
          property_id: string
          public_facts_approved_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          size_bytes: number
          storage_path: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
        }
        Update: {
          analysis?: Json | null
          analysis_attempts?: number
          analysis_error?: string | null
          analysis_retried_at?: string[]
          analysis_started_at?: string | null
          analyzed_at?: string | null
          covers?: Database["public"]["Enums"]["document_type"][]
          created_at?: string
          deleted_at?: string | null
          extracted_text?: string | null
          id?: string
          mime_type?: string
          owner_id?: string
          page_count?: number | null
          property_id?: string
          public_facts_approved_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          size_bytes?: number
          storage_path?: string
          title?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
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
      favorite_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorite_lists_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          buyer_id: string
          created_at: string
          list_id: string | null
          listing_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          list_id?: string | null
          listing_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          list_id?: string | null
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
            foreignKeyName: "favorites_list_id_fkey"
            columns: ["list_id"]
            referencedRelation: "favorite_lists"
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
          file_deleted_at: string | null
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
          file_deleted_at?: string | null
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
          file_deleted_at?: string | null
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
      identity_documents: {
        Row: {
          buyer_id: string
          checked_at: string | null
          created_at: string
          decided_by: string | null
          file_deleted_at: string | null
          id: string
          mime_type: string
          refusal_reason: string | null
          refused_at: string | null
          size_bytes: number
          storage_path: string
          team_note: string | null
          type: Database["public"]["Enums"]["identity_document_type"]
          updated_at: string | null
          withdrawn_at: string | null
        }
        Insert: {
          buyer_id: string
          checked_at?: string | null
          created_at?: string
          decided_by?: string | null
          file_deleted_at?: string | null
          id?: string
          mime_type: string
          refusal_reason?: string | null
          refused_at?: string | null
          size_bytes: number
          storage_path: string
          team_note?: string | null
          type: Database["public"]["Enums"]["identity_document_type"]
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          buyer_id?: string
          checked_at?: string | null
          created_at?: string
          decided_by?: string | null
          file_deleted_at?: string | null
          id?: string
          mime_type?: string
          refusal_reason?: string | null
          refused_at?: string | null
          size_bytes?: number
          storage_path?: string
          team_note?: string | null
          type?: Database["public"]["Enums"]["identity_document_type"]
          updated_at?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_documents_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_documents_decided_by_fkey"
            columns: ["decided_by"]
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
          reason: string | null
        }
        Insert: {
          changed_by: string
          created_at?: string
          field: string
          id?: string
          listing_id: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Update: {
          changed_by?: string
          created_at?: string
          field?: string
          id?: string
          listing_id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
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
          compliance_due_at: string | null
          compliance_reason: string | null
          compliance_reminded_at: string | null
          compliance_requested_at: string | null
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
          summary_requested_at: string | null
          suspended_at: string | null
          suspension_reason: string | null
          title: string
          updated_at: string | null
          views_count: number
        }
        Insert: {
          compliance_due_at?: string | null
          compliance_reason?: string | null
          compliance_reminded_at?: string | null
          compliance_requested_at?: string | null
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
          summary_requested_at?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          title: string
          updated_at?: string | null
          views_count?: number
        }
        Update: {
          compliance_due_at?: string | null
          compliance_reason?: string | null
          compliance_reminded_at?: string | null
          compliance_requested_at?: string | null
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
          summary_requested_at?: string | null
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
      offer_property_addresses: {
        Row: {
          address_line: string
          created_at: string
          offer_id: string
        }
        Insert: {
          address_line: string
          created_at?: string
          offer_id: string
        }
        Update: {
          address_line?: string
          created_at?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_property_addresses_offer_id_fkey"
            columns: ["offer_id"]
            referencedRelation: "offer_for_seller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_property_addresses_offer_id_fkey"
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
          advisor_interventions: number | null
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
          advisor_interventions?: number | null
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
          advisor_interventions?: number | null
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
          anonymize_failed_at: string | null
          anonymized_at: string | null
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
          anonymize_failed_at?: string | null
          anonymized_at?: string | null
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
          anonymize_failed_at?: string | null
          anonymized_at?: string | null
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
          withdrawal_reverts_to: string | null
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
          withdrawal_reverts_to?: string | null
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
          withdrawal_reverts_to?: string | null
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
          {
            foreignKeyName: "subscriptions_withdrawal_reverts_to_fkey"
            columns: ["withdrawal_reverts_to"]
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
          subject_id: string | null
          target_plan: Database["public"]["Enums"]["plan_code"]
          trigger_code: string
        }
        Insert: {
          clicked_at?: string | null
          dismissed_at?: string | null
          id?: string
          property_id: string
          shown_at?: string
          subject_id?: string | null
          target_plan: Database["public"]["Enums"]["plan_code"]
          trigger_code: string
        }
        Update: {
          clicked_at?: string | null
          dismissed_at?: string | null
          id?: string
          property_id?: string
          shown_at?: string
          subject_id?: string | null
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
      visit_invitations: {
        Row: {
          buyer_id: string
          created_at: string
          expires_at: string
          id: string
          property_id: string
          token: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          expires_at: string
          id?: string
          property_id: string
          token: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          property_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_invitations_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_invitations_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_slots: {
        Row: {
          capacity: number
          created_at: string
          ends_at: string
          id: string
          property_id: string
          removed_at: string | null
          starts_at: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          ends_at: string
          id?: string
          property_id: string
          removed_at?: string | null
          starts_at: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          ends_at?: string
          id?: string
          property_id?: string
          removed_at?: string | null
          starts_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_slots_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          buyer_feedback: string | null
          buyer_id: string
          buyer_interest: number | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          feedback_requested_at: string | null
          id: string
          property_id: string
          reminder_sent_at: string | null
          seller_feedback: string | null
          slot_id: string
          status: Database["public"]["Enums"]["visit_status"]
          updated_at: string | null
        }
        Insert: {
          buyer_feedback?: string | null
          buyer_id: string
          buyer_interest?: number | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          feedback_requested_at?: string | null
          id?: string
          property_id: string
          reminder_sent_at?: string | null
          seller_feedback?: string | null
          slot_id: string
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string | null
        }
        Update: {
          buyer_feedback?: string | null
          buyer_id?: string
          buyer_interest?: number | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          feedback_requested_at?: string | null
          id?: string
          property_id?: string
          reminder_sent_at?: string | null
          seller_feedback?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_cancelled_by_fkey"
            columns: ["cancelled_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_slot_id_fkey"
            columns: ["slot_id"]
            referencedRelation: "visit_slots"
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
          financing_checked_at: string | null
          financing_document_type:
            | Database["public"]["Enums"]["financing_document_type"]
            | null
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
          property_address_line: string | null
          property_id: string | null
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
          financing_checked_at?: never
          financing_document_type?: never
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
          property_address_line?: never
          property_id?: never
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
          financing_checked_at?: never
          financing_document_type?: never
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
          property_address_line?: never
          property_id?: never
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
      account_anonymize: {
        Args: { p_now?: string; p_profile: string }
        Returns: undefined
      }
      account_anonymize_failed: {
        Args: { p_now?: string; p_profile: string }
        Returns: undefined
      }
      account_close: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      account_export: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      account_files: {
        Args: { p_profile: string; p_now?: string }
        Returns: {
          bucket: string
          path: string
        }[]
      }
      account_mark_anonymized: {
        Args: { p_now?: string; p_profile: string }
        Returns: undefined
      }
      account_sale_in_progress: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      accounts_due: {
        Args: { p_now?: string }
        Returns: string[]
      }
      admin_activity: {
        Args: { p_days?: number }
        Returns: {
          signups: number
          signups_buyers: number
          signups_sellers: number
          plans_sold: number
          plans_amount_cents: number
        }[]
      }
      admin_advisor_conversations: {
        Args: Record<PropertyKey, never>
        Returns: {
          last_from_seller: boolean
          closed_at: string
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
          unread: boolean
        }[]
      }
      admin_advisor_initial_meeting: {
        Args: {
          p_status: Database["public"]["Enums"]["advisor_intervention_status"]
          p_note?: string
          p_property: string
        }
        Returns: string
      }
      admin_advisor_intervention_set: {
        Args: {
          p_intervention: string
          p_note?: string
          p_status: Database["public"]["Enums"]["advisor_intervention_status"]
        }
        Returns: undefined
      }
      admin_advisor_interventions: {
        Args: Record<PropertyKey, never>
        Returns: {
          message: string
          id: string
          property_id: string
          reason: Database["public"]["Enums"]["advisor_intervention_reason"]
          status: Database["public"]["Enums"]["advisor_intervention_status"]
          requested_at: string
          done_at: string
          done_by_first_name: string
          team_note: string
          seller_id: string
          seller_first_name: string
          seller_last_name: string
          reference: string
          listing_title: string
          property_type: Database["public"]["Enums"]["property_type"]
          rooms: number
          city: string
          cover_path: string
          plan: Database["public"]["Enums"]["plan_code"]
          quota: number
          used: number
          conversation_id: string
          advisor_ordered_at: string
        }[]
      }
      admin_advisor_interventions_open: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      admin_ai_conversations: {
        Args: { p_context?: string; p_query?: string; p_limit?: number }
        Returns: {
          first_name: string
          last_name: string
          reference: string
          first_question: string
          id: string
          context: string
          kind: string
          created_at: string
          last_at: string
          messages: number
          input_tokens: number
          output_tokens: number
        }[]
      }
      admin_ai_usage: {
        Args: { p_days?: number }
        Returns: {
          cache_read_tokens: number
          output_tokens: number
          day: string
          context: string
          model: string
          answers: number
          input_tokens: number
          cache_write_tokens: number
        }[]
      }
      admin_case_add_note: {
        Args: { p_case: string; p_body: string }
        Returns: string
      }
      admin_case_assign: {
        Args: { p_assignee?: string; p_case: string }
        Returns: undefined
      }
      admin_case_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          to_check: number
          in_progress: number
          new: number
          open: number
          closed: number
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
          p_status: Database["public"]["Enums"]["case_status"]
          p_case: string
        }
        Returns: undefined
      }
      admin_case_task_set: {
        Args: { p_task: string; p_done: boolean; p_case: string }
        Returns: boolean
      }
      admin_cases: {
        Args: {
          p_query?: string
          p_status?: Database["public"]["Enums"]["case_status"]
          p_limit?: number
        }
        Returns: {
          assigned_last_name: string
          assigned_to: string
          last_name: string
          property_id: string
          updated_at: string
          reference: string
          source: Database["public"]["Enums"]["case_source"]
          plan: Database["public"]["Enums"]["plan_code"]
          status: Database["public"]["Enums"]["case_status"]
          created_at: string
          subject: string
          first_name: string
          profile_id: string
          city: string
          id: string
          to_check: boolean
          assigned_first_name: string
        }[]
      }
      admin_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          advisor_unread: number
          reports_open: number
          cases_open: number
          listings_oldest_submitted_at: string
          listings_pending: number
        }[]
      }
      admin_daily_brief_recent: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      admin_financing_documents: {
        Args: { p_buyer_id: string }
        Returns: {
          check_note: string
          id: string
          type: Database["public"]["Enums"]["financing_document_type"]
          document_date: string
          mime_type: string
          size_bytes: number
          created_at: string
          deleted_at: string
          checked_at: string
          checked_by_name: string
          is_current: boolean
          file_deleted_at: string
        }[]
      }
      admin_identity_documents: {
        Args: { p_buyer_id: string }
        Returns: {
          id: string
          type: Database["public"]["Enums"]["identity_document_type"]
          mime_type: string
          size_bytes: number
          created_at: string
          checked_at: string
          refused_at: string
          refusal_reason: string
          withdrawn_at: string
          decided_by_name: string
          team_note: string
          file_deleted_at: string
        }[]
      }
      admin_knowledge_import: {
        Args: { p_source_file: string; p_cards: Json }
        Returns: {
          unchanged: number
          removed: number
          updated: number
          inserted: number
        }[]
      }
      admin_listing_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          status: Database["public"]["Enums"]["listing_status"]
          total: number
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
          price_cents: number
          id: string
          reference: string
          slug: string
          title: string
          status: Database["public"]["Enums"]["listing_status"]
          created_at: string
          submitted_at: string
          published_at: string
          suspended_at: string
          type: Database["public"]["Enums"]["property_type"]
          city: string
          postal_code: string
          rooms: number
          surface_m2: number
          owner_id: string
          seller_first_name: string
          seller_last_name: string
          plan: Database["public"]["Enums"]["plan_code"]
        }[]
      }
      admin_offer_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          total: number
          waiting: number
          accepted: number
          declined: number
          ended: number
        }[]
      }
      admin_offer_mark_analysed: {
        Args: { p_offer: string }
        Returns: string
      }
      admin_offers: {
        Args: {
          p_account?: string
          p_limit?: number
          p_status?: string
          p_query?: string
        }
        Returns: {
          price_cents: number
          id: string
          reference: string
          version: number
          status: Database["public"]["Enums"]["offer_status"]
          asking_price_cents: number
          submitted_at: string
          validity_until: string
          answered_at: string
          listing_id: string
          listing_reference: string
          city: string
          property_id: string
          plan: Database["public"]["Enums"]["plan_code"]
          buyer_id: string
          buyer_first_name: string
          buyer_last_name: string
          seller_id: string
          seller_first_name: string
          seller_last_name: string
        }[]
      }
      admin_refunds: {
        Args: Record<PropertyKey, never>
        Returns: {
          last_name: string
          first_name: string
          owner_id: string
          city: string
          plan: Database["public"]["Enums"]["plan_code"]
          last_refund_at: string
          credited_cents: number
          subscription_id: string
          property_id: string
          reference: string
          payment_intent_id: string
          refunded_cents: number
          refunded_at: string
          requested_at: string
          activated_at: string
          replacing_plan: Database["public"]["Enums"]["plan_code"]
          amount_paid_cents: number
          credit_notes: Json
          withdrawal_scope: string
          back_to_plan: Database["public"]["Enums"]["plan_code"]
          withdrawal_due_cents: number
          withdrawal_refunded_cents: number
          withdrawal_payments: number
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
          created_at: string
          kind: string
          body: string
          sender_id: string
          id: string
        }[]
      }
      admin_report_resolve: {
        Args: { p_report: string; p_note?: string }
        Returns: undefined
      }
      admin_report_warn: {
        Args: { p_reason: string; p_report: string }
        Returns: string
      }
      admin_reports: {
        Args: { p_open?: boolean; p_limit?: number }
        Returns: {
          reporter_first_name: string
          reporter_id: string
          reference: string
          listing_title: string
          conversation_id: string
          target_suspended_at: string
          target_deleted: boolean
          target_last_name: string
          target_first_name: string
          target_id: string
          reporter_deleted: boolean
          reporter_last_name: string
          resolved_at: string
          listing_id: string
          id: string
          reason: string
          created_at: string
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
        Args: { p_profile_id: string; p_reason: string }
        Returns: undefined
      }
      admin_unsuspend_user: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      admin_upgrade_prompt_stats: {
        Args: { p_days?: number }
        Returns: {
          shown: number
          clicked: number
          trigger_code: string
          converted: number
          dismissed: number
        }[]
      }
      admin_user_contact: {
        Args: { p_profile_id: string }
        Returns: {
          last_sign_in_at: string
          confirmed_at: string
          email: string
        }[]
      }
      admin_user_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          buyers: number
          sellers: number
          total: number
          suspended: number
          admins: number
        }[]
      }
      admin_users: {
        Args: { p_filter?: string; p_query?: string; p_limit?: number }
        Returns: {
          financing_status: Database["public"]["Enums"]["financing_status"]
          id: string
          first_name: string
          last_name: string
          email: string
          roles: Database["public"]["Enums"]["user_role"][]
          created_at: string
          suspended_at: string
          properties: number
          paid_plan: Database["public"]["Enums"]["plan_code"]
        }[]
      }
      advisor_conversation_ensure: {
        Args: { p_property: string }
        Returns: string
      }
      advisor_initial_meeting_status: {
        Args: { p_property: string }
        Returns: Database["public"]["Enums"]["advisor_intervention_status"]
      }
      advisor_intervention_quota: {
        Args: { p_property: string }
        Returns: number
      }
      advisor_intervention_reason_label: {
        Args: {
          p_reason: Database["public"]["Enums"]["advisor_intervention_reason"]
        }
        Returns: string
      }
      advisor_intervention_request: {
        Args: {
          p_message: string
          p_property: string
          p_reason: Database["public"]["Enums"]["advisor_intervention_reason"]
        }
        Returns: string
      }
      advisor_intervention_stands: {
        Args: { p_property: string; p_requested_at: string }
        Returns: boolean
      }
      advisor_intervention_summary: {
        Args: { p_property: string }
        Returns: {
          initial_meeting: Database["public"]["Enums"]["advisor_intervention_status"]
          plan_name: string
          next_plan: Database["public"]["Enums"]["plan_code"]
          next_plan_name: string
          next_quota: number
          used: number
          pending: number
          quota: number
        }[]
      }
      advisor_interventions_cancel_open: {
        Args: { p_property: string }
        Returns: undefined
      }
      advisor_interventions_pending: {
        Args: { p_property: string }
        Returns: number
      }
      advisor_interventions_used: {
        Args: { p_property: string }
        Returns: number
      }
      advisor_ordered_at: {
        Args: { p_property: string }
        Returns: string
      }
      advisor_period_start: {
        Args: { p_property: string }
        Returns: string
      }
      advisor_right: {
        Args: { p_property: string }
        Returns: boolean
      }
      ai_advisor_handoff: {
        Args: {
          p_summary: string
          p_conversation_id: string
          p_tool_use_id: string
          p_tool_name: string
          p_property: string
        }
        Returns: string
      }
      ai_conversation_of_a_task: {
        Args: { p_conversation: string }
        Returns: boolean
      }
      ai_create_case: {
        Args: {
          p_summary: string
          p_property?: string
          p_subject: string
          p_conversation_id: string
          p_tool_name: string
          p_tool_use_id: string
        }
        Returns: string
      }
      ai_listing_update: {
        Args: {
          p_description?: string
          p_price_cents?: number
          p_listing_id: string
          p_tool_name: string
          p_tool_use_id: string
          p_conversation_id: string
        }
        Returns: undefined
      }
      ai_prefill_offer: {
        Args: {
          p_conversation_id: string
          p_tool_name: string
          p_listing_id: string
          p_price_cents: number
          p_tool_use_id: string
        }
        Returns: string
      }
      ai_quota_consume: {
        Args: { p_limit: number }
        Returns: {
          used: number
          allowed: boolean
        }[]
      }
      ai_visitor_answer: {
        Args: {
          p_input_tokens: number
          p_key: string
          p_visitor: string
          p_conversation: string
          p_content: Json
          p_model: string
          p_output_tokens: number
        }
        Returns: boolean
      }
      ai_visitor_ask: {
        Args: {
          p_conversation?: string
          p_text?: string
          p_key: string
          p_visitor: string
          p_ip: string
        }
        Returns: {
          conversation_id: string
          status: string
        }[]
      }
      ai_visitor_conversation: {
        Args: { p_conversation: string; p_visitor: string }
        Returns: string
      }
      ai_visitor_day_start: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      ai_visitor_history: {
        Args: { p_visitor: string; p_key: string; p_conversation: string }
        Returns: {
          role: string
          content: Json
          created_at: string
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
      alert_digest_claim: {
        Args: { p_alert_ids: string[]; p_read: string[]; p_claimed_at: string }
        Returns: boolean
      }
      alert_digest_queue: {
        Args: Record<PropertyKey, never>
        Returns: {
          criteria: Json
          name: string
          buyer_id: string
          alert_id: string
          last_sent_at: string
          since: string
          email: string
          first_name: string
        }[]
      }
      alert_digest_release: {
        Args: { p_read: string[]; p_alert_ids: string[]; p_claimed_at: string }
        Returns: number
      }
      alert_similar_queue: {
        Args: Record<PropertyKey, never>
        Returns: {
          price_cents: number
          listing_id: string
          title: string
          city: string
          rooms: number
          buyer_id: string
          email: string
          first_name: string
        }[]
      }
      audit: {
        Args: {
          p_meta?: Json
          p_action: string
          p_entity: string
          p_entity_id: string
        }
        Returns: undefined
      }
      billing_document_opened: {
        Args: { p_kind: string; p_id: string }
        Returns: undefined
      }
      buyer_can_be_invited: {
        Args: { p_buyer: string; p_property: string }
        Returns: boolean
      }
      buyer_identity_for_seller: {
        Args: { p_property_id: string }
        Returns: {
          identity_status: Database["public"]["Enums"]["identity_status"]
          buyer_id: string
        }[]
      }
      buyer_summary_for_seller: {
        Args: { p_property_id: string }
        Returns: {
          project: Database["public"]["Enums"]["buyer_project"]
          financing_status: Database["public"]["Enums"]["financing_status"]
          financing_document_type: Database["public"]["Enums"]["financing_document_type"]
          financing_checked_at: string
          buyer_id: string
          first_name: string
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
        Args: { p_listing_id: string; p_body: string }
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
          listing_title: string
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          role: string
          property_id: string
          listing_id: string
          listing_slug: string
          listing_status: Database["public"]["Enums"]["listing_status"]
          property_type: Database["public"]["Enums"]["property_type"]
          rooms: number
          city: string
          cover_path: string
          counterpart_first_name: string
          buyer_financing_status: Database["public"]["Enums"]["financing_status"]
          last_message_at: string
          last_message_body: string
          last_message_mine: boolean
          unread: boolean
          closed_at: string
          plan: Database["public"]["Enums"]["plan_code"]
          advisor_ordered_at: string
        }[]
      }
      create_case: {
        Args: {
          p_source: Database["public"]["Enums"]["case_source"]
          p_subject: string
          p_property_id?: string
          p_summary: string
        }
        Returns: string
      }
      credit_note_email_claim: {
        Args: { p_credit_note_id: string }
        Returns: boolean
      }
      credit_note_email_release: {
        Args: { p_credit_note_id: string }
        Returns: undefined
      }
      credit_note_email_sent: {
        Args: { p_credit_note_id: string }
        Returns: undefined
      }
      credit_notes_emailed_elsewhere: {
        Args: { p_stripe_credit_note_ids: string[] }
        Returns: number
      }
      credit_notes_record: {
        Args: { p_actor?: string; p_payment_intent_id: string; p_notes: Json }
        Returns: Json
      }
      cron_call: {
        Args: { p_path: string }
        Returns: number
      }
      ddt_coverage: {
        Args: { p_covers: Database["public"]["Enums"]["document_type"][] }
        Returns: Database["public"]["Enums"]["document_type"][]
      }
      document_access_answer: {
        Args: { p_documents?: string[]; p_grant: boolean; p_request: string }
        Returns: number
      }
      document_access_request: {
        Args: { p_property: string }
        Returns: string
      }
      document_add: {
        Args: {
          p_title: string
          p_type: Database["public"]["Enums"]["document_type"]
          p_storage_path: string
          p_covers?: Database["public"]["Enums"]["document_type"][]
          p_property: string
        }
        Returns: string
      }
      document_analyses: {
        Args: { p_property: string }
        Returns: {
          status: string
          waiting_since: string
          retries_left: number
          public_facts_approved_at: string
          analysis: Json
          analyzed_at: string
          error: string
          document_id: string
        }[]
      }
      document_analysis_claim: {
        Args: { p_limit?: number }
        Returns: {
          mime_type: string
          size_bytes: number
          attempt: number
          last_error: string
          property_type: Database["public"]["Enums"]["property_type"]
          surface_m2: number
          carrez_m2: number
          document_id: string
          property_id: string
          owner_id: string
          type: Database["public"]["Enums"]["document_type"]
          title: string
          storage_path: string
        }[]
      }
      document_analysis_fail: {
        Args: { p_document: string; p_final: boolean; p_error: string }
        Returns: undefined
      }
      document_analysis_record: {
        Args: { p_document: string; p_analysis: Json }
        Returns: boolean
      }
      document_analysis_release: {
        Args: { p_document: string }
        Returns: undefined
      }
      document_analysis_retry: {
        Args: { p_document: string }
        Returns: undefined
      }
      document_coverage_set: {
        Args: {
          p_covers: Database["public"]["Enums"]["document_type"][]
          p_document: string
        }
        Returns: undefined
      }
      document_of_mine: {
        Args: { p_document: string }
        Returns: boolean
      }
      document_public_facts_set: {
        Args: { p_show: boolean; p_document: string }
        Returns: undefined
      }
      document_share: {
        Args: { p_documents: string[]; p_buyer: string }
        Returns: number
      }
      document_shared_with_me: {
        Args: { p_document: string }
        Returns: boolean
      }
      document_unshare: {
        Args: { p_buyer: string; p_document: string }
        Returns: undefined
      }
      estimation_claim: {
        Args: { p_token: string }
        Returns: string
      }
      estimation_record: {
        Args:
          | {
              p_input: Json
              p_value_cents?: number
              p_low_cents?: number
              p_high_cents?: number
              p_email?: string
              p_result: Json
            }
          | {
              p_server: string
              p_input: Json
              p_result: Json
              p_value_cents?: number
              p_low_cents?: number
              p_high_cents?: number
              p_email?: string
            }
        Returns: {
          claim_token: string
          id: string
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
          p_mime_type: string
          p_size_bytes: number
          p_document_date: string
          p_storage_path: string
          p_type: Database["public"]["Enums"]["financing_document_type"]
        }
        Returns: string
      }
      financing_document_check: {
        Args: { p_document_id: string; p_note?: string }
        Returns: undefined
      }
      financing_document_file_removed: {
        Args: { p_document_id: string }
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
      financing_file_checked: {
        Args: { p_name: string }
        Returns: boolean
      }
      financing_file_in_use: {
        Args: { p_name: string }
        Returns: boolean
      }
      financing_files_room: {
        Args: Record<PropertyKey, never>
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
      identity_document_add: {
        Args: {
          p_type: Database["public"]["Enums"]["identity_document_type"]
          p_storage_path: string
          p_mime_type: string
          p_size_bytes: number
        }
        Returns: string
      }
      identity_document_check: {
        Args: { p_note?: string; p_document_id: string }
        Returns: undefined
      }
      identity_document_file_removed: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      identity_document_opened: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      identity_document_refuse: {
        Args: { p_reason: string; p_document_id: string; p_note?: string }
        Returns: undefined
      }
      identity_document_remove: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      identity_file_buyer: {
        Args: { p_name: string }
        Returns: string
      }
      identity_file_ended: {
        Args: { p_name: string }
        Returns: boolean
      }
      identity_file_waiting: {
        Args: { p_name: string }
        Returns: boolean
      }
      identity_files_mark_swept: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      identity_files_room: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      identity_files_to_sweep: {
        Args: Record<PropertyKey, never>
        Returns: {
          path: string
        }[]
      }
      identity_status_of: {
        Args: { p_buyer: string }
        Returns: Database["public"]["Enums"]["identity_status"]
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
          question: string
          id: string
          category: string
          step_code: string
          answer: string
        }[]
      }
      knowledge_cards_visitor: {
        Args: { p_key: string }
        Returns: {
          id: string
          step_code: string
          answer: string
          question: string
          category: string
        }[]
      }
      knowledge_import_cards: {
        Args: { p_cards: Json }
        Returns: {
          question: string
          step_code: string
          category: string
          audience: string
          answer: string
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
      listing_admin_delete: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      listing_admin_edit: {
        Args: {
          p_title?: string
          p_listing_id: string
          p_price_cents?: number
          p_reason: string
          p_description?: string
        }
        Returns: string[]
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
      listing_changed_since: {
        Args: {
          p_listing: Database["public"]["Tables"]["listings"]["Row"]
          p_since: string
        }
        Returns: boolean
      }
      listing_compliance_changed: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      listing_compliance_clear: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      listing_compliance_delay: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      listing_compliance_facts: {
        Args: { p_listing: Database["public"]["Tables"]["listings"]["Row"] }
        Returns: Json
      }
      listing_compliance_request: {
        Args: { p_listing_id: string; p_reason: string }
        Returns: string
      }
      listing_delete: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      listing_delete_apply: {
        Args: {
          p_listing: Database["public"]["Tables"]["listings"]["Row"]
          p_meta: Json
        }
        Returns: undefined
      }
      listing_for_seller: {
        Args: { p_listing_id: string }
        Returns: {
          compliance_due_at: string | null
          compliance_reason: string | null
          compliance_reminded_at: string | null
          compliance_requested_at: string | null
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
          summary_requested_at: string | null
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
          compliance_due_at: string | null
          compliance_reason: string | null
          compliance_reminded_at: string | null
          compliance_requested_at: string | null
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
          summary_requested_at: string | null
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
          p_old: Json
          p_new: Json
          p_field: string
          p_listing: Database["public"]["Tables"]["listings"]["Row"]
        }
        Returns: undefined
      }
      listing_submit: {
        Args: { p_review?: Json; p_listing_id: string }
        Returns: Database["public"]["Enums"]["listing_status"]
      }
      listing_suspend: {
        Args: { p_reason: string; p_listing_id: string }
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
        Args:
          | { p_listing_id: string }
          | { p_server: string; p_listing_id: string }
        Returns: undefined
      }
      listings_compliance_remind: {
        Args: { p_now?: string }
        Returns: number
      }
      notification_add: {
        Args: {
          p_read_at?: string
          p_created_at?: string
          p_email_after?: string
          p_group_key?: string
          p_link: string
          p_data: Json
          p_type: string
          p_profile_id: string
        }
        Returns: string
      }
      notification_email_queue: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          profile_id: string
          type: string
          data: Json
          link: string
          group_key: string
          created_at: string
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
      offer_amount_label: {
        Args: { p_cents: number }
        Returns: string
      }
      offer_answer: {
        Args: {
          p_confirmed_read?: boolean
          p_offer_id: string
          p_accept: boolean
          p_message?: string
          p_ip_hash?: string
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
        Args: { p_event: string; p_offer: string; p_meta?: Json }
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
      offer_notice: {
        Args: {
          p_type: string
          p_sender: string
          p_body: string
          p_offer: Database["public"]["Tables"]["offers"]["Row"]
        }
        Returns: undefined
      }
      offer_property_address: {
        Args: { p_offer: string }
        Returns: string
      }
      offer_record_precontract: {
        Args: {
          p_offer_id: string
          p_signed_at: string
          p_withdrawal_start?: string
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
        Args: { p_photo_ids: string[]; p_property_id: string }
        Returns: undefined
      }
      plan_case_subject: {
        Args: { p_withdrawal: boolean; p_place: string; p_plan_name: string }
        Returns: string
      }
      plan_case_subject_follows: {
        Args: { p_subject: string }
        Returns: boolean
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
      property_visitable: {
        Args: { p_property: string }
        Returns: boolean
      }
      public_document_facts: {
        Args: { p_listing_id: string }
        Returns: {
          facts: Json
          type: Database["public"]["Enums"]["document_type"]
        }[]
      }
      public_listing_dpe: {
        Args: { p_slug: string }
        Returns: {
          dpe_exemption_reason: string
          dpe_kind: string
          dpe_exempt: boolean
          energy_cost_min_cents: number
          energy_cost_max_cents: number
          energy_price_year: number
          energy_kwh_m2_year: number
          ges_kg_m2_year: number
          excessive: boolean
        }[]
      }
      public_listing_energy: {
        Args: { p_slug: string }
        Returns: {
          dpe_exempt: boolean
          dpe_date: string
          energy_cost_min_cents: number
          energy_cost_max_cents: number
          energy_price_year: number
        }[]
      }
      public_listing_photos: {
        Args: { p_cover_only?: boolean; p_listing_ids: string[] }
        Returns: {
          path: string
          width: number
          height: number
          position: number
          caption: string
          total: number
          listing_id: string
        }[]
      }
      public_listing_summary: {
        Args: { p_listing_id: string }
        Returns: string
      }
      public_listings_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          public_location: unknown
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
        }[]
      }
      public_listings_rows: {
        Args: Record<PropertyKey, never>
        Returns: {
          ges_class: string
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
          orientation: string
          build_year: number
          dpe_class: string
          charges_monthly_cents: number
          property_tax_yearly_cents: number
          seller_first_name: string
          plan: Database["public"]["Enums"]["plan_code"]
        }[]
      }
      rate_limit_hit: {
        Args: {
          p_bucket: string
          p_key: string
          p_count?: boolean
          p_server: string
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
      refund_email_resent: {
        Args: { p_subscription_id: string; p_sent: number; p_failed: number }
        Returns: undefined
      }
      report_target: {
        Args: { p_reporter: string; p_buyer: string; p_seller: string }
        Returns: string
      }
      sale_declare_event: {
        Args: { p_event: string; p_property_id: string }
        Returns: boolean
      }
      sale_emit_event: {
        Args: { p_event: string; p_property_id: string }
        Returns: number
      }
      sale_file_filed: {
        Args: { p_name: string }
        Returns: boolean
      }
      sale_file_property: {
        Args: { p_name: string }
        Returns: string
      }
      sale_file_shared: {
        Args: { p_name: string }
        Returns: boolean
      }
      sale_files_room: {
        Args: { p_property: string }
        Returns: boolean
      }
      sale_refresh_progress: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      sale_task_is_seller_manual: {
        Args: { p_property_id: string; p_task_id: string }
        Returns: boolean
      }
      search_knowledge: {
        Args: {
          p_limit?: number
          p_query: string
          p_embedding: string
          p_step_code?: string
          p_audience: string
        }
        Returns: {
          score: number
          category: string
          step_code: string
          question: string
          answer: string
          id: string
          similarity: number
        }[]
      }
      search_listings: {
        Args: {
          p_filters?: Json
          p_bbox?: number[]
          p_sort?: string
          p_page?: number
        }
        Returns: {
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
          postal_code: string
          district: string
          public_lat: number
          title: string
          id: string
          slug: string
          reference: string
          price_cents: number
          published_at: string
          type: Database["public"]["Enums"]["property_type"]
          city: string
        }[]
      }
      shared_document_answers: {
        Args: { p_listing?: string }
        Returns: {
          city: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          summary_buyer: string
          type_detected: string
          document_date: string
          key_facts: Json
          points_of_attention: Json
          shared_at: string
          document_id: string
          property_id: string
          listing_id: string
          listing_title: string
        }[]
      }
      shared_document_summaries: {
        Args: Record<PropertyKey, never>
        Returns: {
          document_date: string
          points_of_attention: Json
          title: string
          type: Database["public"]["Enums"]["document_type"]
          type_detected: string
          key_facts: Json
          summary_buyer: string
          document_id: string
        }[]
      }
      shared_documents: {
        Args: Record<PropertyKey, never>
        Returns: {
          property_id: string
          type: Database["public"]["Enums"]["document_type"]
          title: string
          mime_type: string
          size_bytes: number
          shared_at: string
          listing_title: string
          listing_slug: string
          city: string
          covers: Database["public"]["Enums"]["document_type"][]
          document_id: string
        }[]
      }
      slugify: {
        Args: { p: string }
        Returns: string
      }
      stripe_charge_refunded: {
        Args: {
          p_fully_refunded: boolean
          p_amount_refunded_cents: number
          p_payment_intent_id: string
          p_event_id: string
        }
        Returns: Json
      }
      stripe_checkout_complete: {
        Args: {
          p_upgrade: boolean
          p_discount_cents: number
          p_early_start: boolean
          p_accepted_at: string
          p_cgu_version: string
          p_cgv_version: string
          p_promotion_code?: string
          p_payment_intent_id: string
          p_property_id: string
          p_owner_id: string
          p_plan: Database["public"]["Enums"]["plan_code"]
          p_amount_paid_cents: number
          p_event_id: string
          p_session_id: string
        }
        Returns: Json
      }
      subscription_withdraw: {
        Args:
          | { p_subscription_id: string; p_scope?: string }
          | { p_with_replaced: boolean; p_subscription_id: string }
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
      upgrade_prompt_record: {
        Args: {
          p_subject?: string
          p_event: string
          p_property: string
          p_trigger: string
        }
        Returns: undefined
      }
      visit_address: {
        Args: { p_visit: string }
        Returns: {
          postal_code: string
          address_line: string
          city: string
        }[]
      }
      visit_book: {
        Args: { p_slot: string; p_token: string }
        Returns: string
      }
      visit_cancel: {
        Args: { p_visit: string }
        Returns: Database["public"]["Enums"]["visit_status"]
      }
      visit_date_label: {
        Args: { p_at: string }
        Returns: string
      }
      visit_email_facts: {
        Args: { p_visit: string }
        Returns: {
          address_line: string
          ends_at: string
          starts_at: string
          status: Database["public"]["Enums"]["visit_status"]
          postal_code: string
          city: string
        }[]
      }
      visit_facts: {
        Args: { p_property: string; p_buyer: string }
        Returns: Json
      }
      visit_feedback_buyer: {
        Args: { p_interest: number; p_visit: string; p_comment: string }
        Returns: undefined
      }
      visit_feedback_seller: {
        Args: { p_comment: string; p_visit: string }
        Returns: undefined
      }
      visit_invitation_of: {
        Args: { p_token: string }
        Returns: {
          buyer_id: string
          created_at: string
          expires_at: string
          id: string
          property_id: string
          token: string
        }
      }
      visit_invite: {
        Args: { p_buyer: string; p_property: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      visit_listing: {
        Args: { p_property: string }
        Returns: {
          slug: string
          city: string
          title: string
        }[]
      }
      visit_notice: {
        Args: {
          p_buyer: string
          p_property: string
          p_sender: string
          p_kind: string
          p_body: string
          p_meta: Json
        }
        Returns: undefined
      }
      visit_open_slots: {
        Args: { p_token: string }
        Returns: {
          starts_at: string
          ends_at: string
          slot_id: string
        }[]
      }
      visit_seller_note: {
        Args: { p_visit: string }
        Returns: string
      }
      visit_slot_add: {
        Args: { p_minutes: number; p_starts_at: string; p_property: string }
        Returns: string
      }
      visit_slot_remove: {
        Args: { p_slot: string }
        Returns: undefined
      }
      visits_ask_feedback: {
        Args: { p_now?: string }
        Returns: number
      }
      visits_remind: {
        Args: { p_now?: string }
        Returns: number
      }
      withdrawal_last_day: {
        Args: { p_ordered_at: string }
        Returns: string
      }
      withdrawal_old_shape_adopt: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      withdrawal_open: {
        Args: { p_ordered_at: string; p_now?: string }
        Returns: boolean
      }
      withdrawal_refunds: {
        Args: { p_property: string }
        Returns: {
          refunded_cents: number
          due_cents: number
          requested_at: string
        }[]
      }
      words_below_1000_fr: {
        Args: { p_final: boolean; p_n: number }
        Returns: string
      }
    }
    Enums: {
      acquisition_mode: "own_name" | "joint" | "sci" | "other"
      advisor_intervention_reason:
        | "initial_meeting"
        | "price_strategy"
        | "listing"
        | "visits"
        | "offer"
        | "documents"
        | "other"
      advisor_intervention_status:
        | "requested"
        | "scheduled"
        | "done"
        | "cancelled"
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
        | "assainissement"
        | "carnet_entretien"
        | "fiche_synthetique"
        | "pre_etat_date"
        | "certificat_urbanisme"
        | "plan_pluriannuel_travaux"
        | "etat_date"
        | "ddt"
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
      identity_document_type: "carte_identite" | "passeport" | "titre_sejour"
      identity_status: "not_provided" | "provided" | "checked"
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
      advisor_intervention_reason: [
        "initial_meeting",
        "price_strategy",
        "listing",
        "visits",
        "offer",
        "documents",
        "other",
      ],
      advisor_intervention_status: [
        "requested",
        "scheduled",
        "done",
        "cancelled",
      ],
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
        "assainissement",
        "carnet_entretien",
        "fiche_synthetique",
        "pre_etat_date",
        "certificat_urbanisme",
        "plan_pluriannuel_travaux",
        "etat_date",
        "ddt",
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
      identity_document_type: ["carte_identite", "passeport", "titre_sejour"],
      identity_status: ["not_provided", "provided", "checked"],
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
