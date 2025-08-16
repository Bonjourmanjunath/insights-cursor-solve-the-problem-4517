export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      advanced_analysis_config: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          project_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          project_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          project_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advanced_analysis_config_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      advanced_analysis_results: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          results: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          results?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          results?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advanced_analysis_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_results: {
        Row: {
          analysis_data: Json
          created_at: string
          id: string
          research_project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_data: Json
          created_at?: string
          id?: string
          research_project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_data?: Json
          created_at?: string
          id?: string
          research_project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_research_project_id_fkey"
            columns: ["research_project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_runs: {
        Row: {
          analysis_type: string
          chunks_used: number | null
          config: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          processing_time_ms: number | null
          project_id: string
          results: Json | null
          retrieval_params: Json | null
          status: string
          tokens_consumed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_type: string
          chunks_used?: number | null
          config?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          project_id: string
          results?: Json | null
          retrieval_params?: Json | null
          status?: string
          tokens_consumed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_type?: string
          chunks_used?: number | null
          config?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          project_id?: string
          results?: Json | null
          retrieval_params?: Json | null
          status?: string
          tokens_consumed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      async_job_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          max_retries: number | null
          payload: Json
          priority: number | null
          project_id: string
          result: Json | null
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          max_retries?: number | null
          payload?: Json
          priority?: number | null
          project_id: string
          result?: Json | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          max_retries?: number | null
          payload?: Json
          priority?: number | null
          project_id?: string
          result?: Json | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "async_job_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_interactions: {
        Row: {
          company_id: string
          conversation_data: Json | null
          created_at: string | null
          id: string
          intent_detected: string | null
          routed_to_icp: string | null
          visitor_id: string
        }
        Insert: {
          company_id: string
          conversation_data?: Json | null
          created_at?: string | null
          id?: string
          intent_detected?: string | null
          routed_to_icp?: string | null
          visitor_id: string
        }
        Update: {
          company_id?: string
          conversation_data?: Json | null
          created_at?: string | null
          id?: string
          intent_detected?: string | null
          routed_to_icp?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_interactions_routed_to_icp_fkey"
            columns: ["routed_to_icp"]
            isOneToOne: false
            referencedRelation: "icps"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_widgets: {
        Row: {
          company_id: string
          created_at: string | null
          greeting_message: string | null
          id: string
          is_active: boolean | null
          options: Json | null
          updated_at: string | null
          widget_config: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          updated_at?: string | null
          widget_config?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          updated_at?: string | null
          widget_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_widgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      codes: {
        Row: {
          color: string | null
          id: string
          name: string | null
          project_id: string | null
        }
        Insert: {
          color?: string | null
          id?: string
          name?: string | null
          project_id?: string | null
        }
        Update: {
          color?: string | null
          id?: string
          name?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          brand_colors: Json | null
          created_at: string
          domain: string | null
          fonts: Json | null
          id: string
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          owner_id: string
          slug: string
        }
        Insert: {
          brand_colors?: Json | null
          created_at?: string
          domain?: string | null
          fonts?: Json | null
          id?: string
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          owner_id: string
          slug: string
        }
        Update: {
          brand_colors?: Json | null
          created_at?: string
          domain?: string | null
          fonts?: Json | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          owner_id?: string
          slug?: string
        }
        Relationships: []
      }
      content_analysis_results: {
        Row: {
          analysis_run_id: string
          created_at: string | null
          excel_generated: boolean | null
          guide_sections: Json
          id: string
          pdf_generated: boolean | null
          profile_fields: Json | null
          project_id: string
          respondent_matrix: Json
          respondent_profiles: Json | null
        }
        Insert: {
          analysis_run_id: string
          created_at?: string | null
          excel_generated?: boolean | null
          guide_sections: Json
          id?: string
          pdf_generated?: boolean | null
          profile_fields?: Json | null
          project_id: string
          respondent_matrix: Json
          respondent_profiles?: Json | null
        }
        Update: {
          analysis_run_id?: string
          created_at?: string | null
          excel_generated?: boolean | null
          guide_sections?: Json
          id?: string
          pdf_generated?: boolean | null
          profile_fields?: Json | null
          project_id?: string
          respondent_matrix?: Json
          respondent_profiles?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_analysis_results_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_analysis_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          company_id: string
          content: string | null
          created_at: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          mapped_icps: Json | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          mapped_icps?: Json | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          content?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          mapped_icps?: Json | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_id: number
          created_at: string | null
          doc_id: string
          end_position: number | null
          id: string
          keywords: string[] | null
          language: string | null
          num_tokens: number
          participant_id: string | null
          project_id: string
          speaker: string | null
          start_position: number | null
          text: string
          timecodes: Json | null
          updated_at: string | null
          version_hash: string
        }
        Insert: {
          chunk_id: number
          created_at?: string | null
          doc_id: string
          end_position?: number | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          num_tokens: number
          participant_id?: string | null
          project_id: string
          speaker?: string | null
          start_position?: number | null
          text: string
          timecodes?: Json | null
          updated_at?: string | null
          version_hash: string
        }
        Update: {
          chunk_id?: number
          created_at?: string | null
          doc_id?: string
          end_position?: number | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          num_tokens?: number
          participant_id?: string | null
          project_id?: string
          speaker?: string | null
          start_position?: number | null
          text?: string
          timecodes?: Json | null
          updated_at?: string | null
          version_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "research_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_embeddings: {
        Row: {
          chunk_id: string
          created_at: string | null
          embedding: Json
          embedding_dimension: number | null
          embedding_model: string
          id: string
        }
        Insert: {
          chunk_id: string
          created_at?: string | null
          embedding: Json
          embedding_dimension?: number | null
          embedding_model?: string
          id?: string
        }
        Update: {
          chunk_id?: string
          created_at?: string | null
          embedding?: Json
          embedding_dimension?: number | null
          embedding_model?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "document_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          file_type: string | null
          file_url: string | null
          id: string
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      icps: {
        Row: {
          attributes: Json | null
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          landing_page_config: Json | null
          name: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          attributes?: Json | null
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          landing_page_config?: Json | null
          name: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          attributes?: Json | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          landing_page_config?: Json | null
          name?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          company_id: string
          created_at: string | null
          icp_id: string | null
          id: string
          ip_address: string | null
          page_url: string
          referrer: string | null
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          icp_id?: string | null
          id?: string
          ip_address?: string | null
          page_url: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          icp_id?: string | null
          id?: string
          ip_address?: string | null
          page_url?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_visits_icp_id_fkey"
            columns: ["icp_id"]
            isOneToOne: false
            referencedRelation: "icps"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_ingest_metadata: {
        Row: {
          chunk_token_size: number | null
          content_hash: string | null
          created_at: string | null
          embedding_model: string | null
          error_message: string | null
          id: string
          overlap_tokens: number | null
          processed_documents: number | null
          processing_completed_at: string | null
          processing_started_at: string | null
          project_id: string
          status: string
          total_chunks: number | null
          total_documents: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chunk_token_size?: number | null
          content_hash?: string | null
          created_at?: string | null
          embedding_model?: string | null
          error_message?: string | null
          id?: string
          overlap_tokens?: number | null
          processed_documents?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          project_id: string
          status?: string
          total_chunks?: number | null
          total_documents?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chunk_token_size?: number | null
          content_hash?: string | null
          created_at?: string | null
          embedding_model?: string | null
          error_message?: string | null
          id?: string
          overlap_tokens?: number | null
          processed_documents?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          project_id?: string
          status?: string
          total_chunks?: number | null
          total_documents?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_ingest_metadata_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          goal: string | null
          id: string
          name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          goal?: string | null
          id?: string
          name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          goal?: string | null
          id?: string
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      research_codes: {
        Row: {
          color: string
          created_at: string | null
          created_by: string
          description: string | null
          document_id: string | null
          frequency: number | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by: string
          description?: string | null
          document_id?: string | null
          frequency?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          document_id?: string | null
          frequency?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_codes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "research_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_documents: {
        Row: {
          code_count: number | null
          content: string | null
          file_size: number
          file_type: string
          id: string
          name: string
          processing_status: string | null
          project_id: string | null
          quotation_count: number | null
          storage_path: string | null
          upload_date: string | null
          user_id: string | null
        }
        Insert: {
          code_count?: number | null
          content?: string | null
          file_size: number
          file_type: string
          id?: string
          name: string
          processing_status?: string | null
          project_id?: string | null
          quotation_count?: number | null
          storage_path?: string | null
          upload_date?: string | null
          user_id?: string | null
        }
        Update: {
          code_count?: number | null
          content?: string | null
          file_size?: number
          file_type?: string
          id?: string
          name?: string
          processing_status?: string | null
          project_id?: string | null
          quotation_count?: number | null
          storage_path?: string | null
          upload_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_files: {
        Row: {
          content: string | null
          created_at: string | null
          file_name: string
          file_type: string
          id: string
          metadata: Json | null
          project_id: string
          project_name: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_name: string
          file_type: string
          id?: string
          metadata?: Json | null
          project_id: string
          project_name: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_name?: string
          file_type?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          project_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      research_projects: {
        Row: {
          code_count: number | null
          country: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          document_count: number | null
          guide_context: string | null
          id: string
          language: string | null
          name: string
          owner: string | null
          priority: string | null
          project_type: string | null
          quotation_count: number | null
          research_goal: string | null
          rfp_summary: string | null
          stakeholder_type: string | null
          therapy_area: string | null
          transcript_format: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          code_count?: number | null
          country?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          document_count?: number | null
          guide_context?: string | null
          id?: string
          language?: string | null
          name: string
          owner?: string | null
          priority?: string | null
          project_type?: string | null
          quotation_count?: number | null
          research_goal?: string | null
          rfp_summary?: string | null
          stakeholder_type?: string | null
          therapy_area?: string | null
          transcript_format?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          code_count?: number | null
          country?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          document_count?: number | null
          guide_context?: string | null
          id?: string
          language?: string | null
          name?: string
          owner?: string | null
          priority?: string | null
          project_type?: string | null
          quotation_count?: number | null
          research_goal?: string | null
          rfp_summary?: string | null
          stakeholder_type?: string | null
          therapy_area?: string | null
          transcript_format?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      research_quotations: {
        Row: {
          code_id: string | null
          confidence_score: number | null
          context: string | null
          created_at: string | null
          created_by: string
          document_id: string | null
          end_position: number | null
          id: string
          project_id: string | null
          start_position: number | null
          text: string
          user_id: string | null
        }
        Insert: {
          code_id?: string | null
          confidence_score?: number | null
          context?: string | null
          created_at?: string | null
          created_by: string
          document_id?: string | null
          end_position?: number | null
          id?: string
          project_id?: string | null
          start_position?: number | null
          text: string
          user_id?: string | null
        }
        Update: {
          code_id?: string | null
          confidence_score?: number | null
          context?: string | null
          created_at?: string | null
          created_by?: string
          document_id?: string | null
          end_position?: number | null
          id?: string
          project_id?: string | null
          start_position?: number | null
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_quotations_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "research_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_quotations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "research_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      transcription_logs: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          file_name: string | null
          id: string
          language: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          file_name?: string | null
          id?: string
          language?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          file_name?: string | null
          id?: string
          language?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          audio_file_url: string | null
          created_at: string
          display_name: string | null
          duration_seconds: number | null
          english_translation: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          interview_date: string | null
          language_detected: string | null
          market: string | null
          original_text: string | null
          progress: number
          project_number: string | null
          research_project_id: string | null
          respondent_initials: string | null
          speaker_count: number | null
          specialty: string | null
          status: string
          storage_path: string
          text: string | null
          transcript_content: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_file_url?: string | null
          created_at?: string
          display_name?: string | null
          duration_seconds?: number | null
          english_translation?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          interview_date?: string | null
          language_detected?: string | null
          market?: string | null
          original_text?: string | null
          progress?: number
          project_number?: string | null
          research_project_id?: string | null
          respondent_initials?: string | null
          speaker_count?: number | null
          specialty?: string | null
          status?: string
          storage_path: string
          text?: string | null
          transcript_content?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_file_url?: string | null
          created_at?: string
          display_name?: string | null
          duration_seconds?: number | null
          english_translation?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          interview_date?: string | null
          language_detected?: string | null
          market?: string | null
          original_text?: string | null
          progress?: number
          project_number?: string | null
          research_project_id?: string | null
          respondent_initials?: string | null
          speaker_count?: number | null
          specialty?: string | null
          status?: string
          storage_path?: string
          text?: string | null
          transcript_content?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_research_project_id_fkey"
            columns: ["research_project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_content_hash: {
        Args: { content: string }
        Returns: string
      }
      increment_project_document_count: {
        Args: { project_id: string }
        Returns: undefined
      }
      needs_reingest: {
        Args: { p_project_id: string; p_content_hash: string }
        Returns: boolean
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
