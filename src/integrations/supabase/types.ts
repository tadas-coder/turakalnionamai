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
      accounting_files: {
        Row: {
          created_at: string
          description: string | null
          file_group_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          related_asset_id: string | null
          related_invoice_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_group_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          related_asset_id?: string | null
          related_invoice_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_group_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          related_asset_id?: string | null
          related_invoice_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_files_file_group_id_fkey"
            columns: ["file_group_id"]
            isOneToOne: false
            referencedRelation: "file_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_files_related_asset_id_fkey"
            columns: ["related_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_files_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_tasks: {
        Row: {
          assigned_to: string | null
          cost: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice: string | null
          priority: string | null
          related_asset_id: string | null
          related_invoice_id: string | null
          short_description: string | null
          status: string | null
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cost?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice?: string | null
          priority?: string | null
          related_asset_id?: string | null
          related_invoice_id?: string | null
          short_description?: string | null
          status?: string | null
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cost?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice?: string | null
          priority?: string | null
          related_asset_id?: string | null
          related_invoice_id?: string | null
          short_description?: string | null
          status?: string | null
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_tasks_related_asset_id_fkey"
            columns: ["related_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_tasks_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          name2: string | null
          parent_group_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name2?: string | null
          parent_group_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name2?: string | null
          parent_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "asset_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_group_id: string | null
          created_at: string
          current_value: number | null
          depreciation_rate: number | null
          description: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_group_id?: string | null
          created_at?: string
          current_value?: number | null
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_group_id?: string | null
          created_at?: string
          current_value?: number | null
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_asset_group_id_fkey"
            columns: ["asset_group_id"]
            isOneToOne: false
            referencedRelation: "asset_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_statements: {
        Row: {
          account_number: string | null
          amount: number
          assigned_at: string | null
          assigned_by: string | null
          assigned_resident_id: string | null
          assigned_resident_invoice_id: string | null
          assigned_vendor_id: string | null
          assigned_vendor_invoice_id: string | null
          assignment_status: string | null
          created_at: string
          currency: string | null
          details: string | null
          document_no: string | null
          entry_type: string | null
          entry_unique_no: string | null
          id: string
          import_batch_id: string | null
          notes: string | null
          payer_recipient: string | null
          period_id: string | null
          reference: string | null
          transaction_date: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          amount: number
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_resident_id?: string | null
          assigned_resident_invoice_id?: string | null
          assigned_vendor_id?: string | null
          assigned_vendor_invoice_id?: string | null
          assignment_status?: string | null
          created_at?: string
          currency?: string | null
          details?: string | null
          document_no?: string | null
          entry_type?: string | null
          entry_unique_no?: string | null
          id?: string
          import_batch_id?: string | null
          notes?: string | null
          payer_recipient?: string | null
          period_id?: string | null
          reference?: string | null
          transaction_date: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          amount?: number
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_resident_id?: string | null
          assigned_resident_invoice_id?: string | null
          assigned_vendor_id?: string | null
          assigned_vendor_invoice_id?: string | null
          assignment_status?: string | null
          created_at?: string
          currency?: string | null
          details?: string | null
          document_no?: string | null
          entry_type?: string | null
          entry_unique_no?: string | null
          id?: string
          import_batch_id?: string | null
          notes?: string | null
          payer_recipient?: string | null
          period_id?: string | null
          reference?: string | null
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_assigned_resident_id_fkey"
            columns: ["assigned_resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_assigned_vendor_invoice_id_fkey"
            columns: ["assigned_vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_resident_invoice_fk"
            columns: ["assigned_resident_invoice_id"]
            isOneToOne: false
            referencedRelation: "resident_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      consumables: {
        Row: {
          asset_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          created_at: string
          id: string
          name: string
          note: string | null
          quantity: number | null
          type: string
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          id?: string
          name: string
          note?: string | null
          quantity?: number | null
          type: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          quantity?: number | null
          type?: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumables_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_categories: {
        Row: {
          budget_monthly: number | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          budget_monthly?: number | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          budget_monthly?: number | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_recognized: boolean | null
          category: string
          cost_category_id: string | null
          created_at: string
          description: string | null
          distribution_segment_ids: string[] | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          invoice_status: string | null
          is_invoice: boolean | null
          needs_distribution: boolean | null
          signed: boolean
          signed_at: string | null
          signed_by: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          vendor_pattern_hash: string | null
          visible: boolean
        }
        Insert: {
          ai_recognized?: boolean | null
          category: string
          cost_category_id?: string | null
          created_at?: string
          description?: string | null
          distribution_segment_ids?: string[] | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          invoice_status?: string | null
          is_invoice?: boolean | null
          needs_distribution?: boolean | null
          signed?: boolean
          signed_at?: string | null
          signed_by?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          vendor_pattern_hash?: string | null
          visible?: boolean
        }
        Update: {
          ai_recognized?: boolean | null
          category?: string
          cost_category_id?: string | null
          created_at?: string
          description?: string | null
          distribution_segment_ids?: string[] | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          invoice_status?: string | null
          is_invoice?: boolean | null
          needs_distribution?: boolean | null
          signed?: boolean
          signed_at?: string | null
          signed_by?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          vendor_pattern_hash?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "documents_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      duty_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          duty_date: string
          id: string
          person_name: string
          person_phone: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duty_date: string
          id?: string
          person_name: string
          person_phone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duty_date?: string
          id?: string
          person_name?: string
          person_phone?: string | null
        }
        Relationships: []
      }
      file_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_group_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_group_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "file_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_patterns: {
        Row: {
          cost_category_id: string | null
          created_at: string
          distribution_segment_ids: string[] | null
          id: string
          invoice_status: string | null
          last_used_at: string | null
          needs_distribution: boolean | null
          pattern_hash: string
          recognition_count: number | null
          updated_at: string
          vendor_name: string
        }
        Insert: {
          cost_category_id?: string | null
          created_at?: string
          distribution_segment_ids?: string[] | null
          id?: string
          invoice_status?: string | null
          last_used_at?: string | null
          needs_distribution?: boolean | null
          pattern_hash: string
          recognition_count?: number | null
          updated_at?: string
          vendor_name: string
        }
        Update: {
          cost_category_id?: string | null
          created_at?: string
          distribution_segment_ids?: string[] | null
          id?: string
          invoice_status?: string | null
          last_used_at?: string | null
          needs_distribution?: boolean | null
          pattern_hash?: string
          recognition_count?: number | null
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_patterns_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_tickets: {
        Row: {
          created_at: string
          document_id: string
          id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_tickets_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      linked_accounts: {
        Row: {
          created_at: string
          id: string
          linked_email: string
          linked_name: string | null
          primary_user_id: string
          relationship: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          linked_email: string
          linked_name?: string | null
          primary_user_id: string
          relationship?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          linked_email?: string
          linked_name?: string | null
          primary_user_id?: string
          relationship?: string | null
        }
        Relationships: []
      }
      meter_readings: {
        Row: {
          consumption: number | null
          created_at: string
          id: string
          meter_id: string
          notes: string | null
          period_id: string | null
          photo_url: string | null
          previous_value: number | null
          reading_date: string
          reading_value: number
          source: string | null
          submitted_by: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          consumption?: number | null
          created_at?: string
          id?: string
          meter_id: string
          notes?: string | null
          period_id?: string | null
          photo_url?: string | null
          previous_value?: number | null
          reading_date: string
          reading_value: number
          source?: string | null
          submitted_by?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          consumption?: number | null
          created_at?: string
          id?: string
          meter_id?: string
          notes?: string | null
          period_id?: string | null
          photo_url?: string | null
          previous_value?: number | null
          reading_date?: string
          reading_value?: number
          source?: string | null
          submitted_by?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      meters: {
        Row: {
          asset_id: string | null
          created_at: string
          id: string
          install_date: string | null
          is_active: boolean | null
          is_electronic: boolean | null
          last_verification_date: string | null
          location: string | null
          meter_number: string | null
          meter_type: string
          next_verification_date: string | null
          notes: string | null
          resident_id: string | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          id?: string
          install_date?: string | null
          is_active?: boolean | null
          is_electronic?: boolean | null
          last_verification_date?: string | null
          location?: string | null
          meter_number?: string | null
          meter_type: string
          next_verification_date?: string | null
          notes?: string | null
          resident_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          id?: string
          install_date?: string | null
          is_active?: boolean | null
          is_electronic?: boolean | null
          last_verification_date?: string | null
          location?: string | null
          meter_number?: string | null
          meter_type?: string
          next_verification_date?: string | null
          notes?: string | null
          resident_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meters_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meters_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_financial_reports: {
        Row: {
          created_at: string
          created_by: string | null
          detailed_categories: Json | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          main_categories: Json | null
          monthly_expenses: Json | null
          published: boolean | null
          report_month: string
          summary_data: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          detailed_categories?: Json | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          main_categories?: Json | null
          monthly_expenses?: Json | null
          published?: boolean | null
          report_month: string
          summary_data?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          detailed_categories?: Json | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          main_categories?: Json | null
          monthly_expenses?: Json | null
          published?: boolean | null
          report_month?: string
          summary_data?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          published: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          published?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          published?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      news_read: {
        Row: {
          id: string
          news_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          news_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          news_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_read_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      news_recipients: {
        Row: {
          created_at: string
          id: string
          news_id: string
          notified_at: string | null
          resident_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          news_id: string
          notified_at?: string | null
          resident_id: string
        }
        Update: {
          created_at?: string
          id?: string
          news_id?: string
          notified_at?: string | null
          resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_recipients_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_recipients_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_slips: {
        Row: {
          accrued_amount: number
          apartment_address: string
          apartment_number: string | null
          assignment_status: string
          balance: number | null
          buyer_name: string | null
          created_at: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          line_items: Json
          matched_by: string | null
          payment_code: string | null
          payments_received: number | null
          pdf_file_name: string | null
          pdf_url: string | null
          period_month: string
          previous_amount: number | null
          profile_id: string | null
          resident_id: string | null
          total_due: number
          updated_at: string
          upload_batch_id: string | null
          uploaded_by: string | null
          utility_readings: Json | null
        }
        Insert: {
          accrued_amount: number
          apartment_address: string
          apartment_number?: string | null
          assignment_status?: string
          balance?: number | null
          buyer_name?: string | null
          created_at?: string
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          line_items?: Json
          matched_by?: string | null
          payment_code?: string | null
          payments_received?: number | null
          pdf_file_name?: string | null
          pdf_url?: string | null
          period_month: string
          previous_amount?: number | null
          profile_id?: string | null
          resident_id?: string | null
          total_due: number
          updated_at?: string
          upload_batch_id?: string | null
          uploaded_by?: string | null
          utility_readings?: Json | null
        }
        Update: {
          accrued_amount?: number
          apartment_address?: string
          apartment_number?: string | null
          assignment_status?: string
          balance?: number | null
          buyer_name?: string | null
          created_at?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          line_items?: Json
          matched_by?: string | null
          payment_code?: string | null
          payments_received?: number | null
          pdf_file_name?: string | null
          pdf_url?: string | null
          period_month?: string
          previous_amount?: number | null
          profile_id?: string | null
          resident_id?: string | null
          total_due?: number
          updated_at?: string
          upload_batch_id?: string | null
          uploaded_by?: string | null
          utility_readings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_slips_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_slips_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_slips_upload_batch_fk"
            columns: ["upload_batch_id"]
            isOneToOne: false
            referencedRelation: "upload_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      periodic_data: {
        Row: {
          actual_amount: number | null
          category: string
          created_at: string
          created_by: string | null
          difference: number | null
          id: string
          notes: string | null
          period_month: string
          planned_amount: number | null
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          category: string
          created_at?: string
          created_by?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          period_month: string
          planned_amount?: number | null
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          period_month?: string
          planned_amount?: number | null
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          end_date: string
          id: string
          is_open: boolean
          month: number
          name: string
          notes: string | null
          start_date: string
          updated_at: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          is_open?: boolean
          month: number
          name: string
          notes?: string | null
          start_date: string
          updated_at?: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          is_open?: boolean
          month?: number
          name?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      planned_works: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          start_date: string
          title: string
          work_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date: string
          title: string
          work_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          title?: string
          work_type?: string
        }
        Relationships: []
      }
      poll_protocols: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          ballots_received: number | null
          ballots_sent: number | null
          commission_chairman: string | null
          commission_members: Json | null
          created_at: string
          decisions: Json | null
          has_quorum: boolean | null
          id: string
          live_results: Json | null
          location: string | null
          meeting_date: string | null
          organizer_address: string | null
          organizer_name: string | null
          poll_id: string
          protocol_date: string
          protocol_number: string | null
          quorum_info: string | null
          status: string
          updated_at: string
          written_results: Json | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          ballots_received?: number | null
          ballots_sent?: number | null
          commission_chairman?: string | null
          commission_members?: Json | null
          created_at?: string
          decisions?: Json | null
          has_quorum?: boolean | null
          id?: string
          live_results?: Json | null
          location?: string | null
          meeting_date?: string | null
          organizer_address?: string | null
          organizer_name?: string | null
          poll_id: string
          protocol_date?: string
          protocol_number?: string | null
          quorum_info?: string | null
          status?: string
          updated_at?: string
          written_results?: Json | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          ballots_received?: number | null
          ballots_sent?: number | null
          commission_chairman?: string | null
          commission_members?: Json | null
          created_at?: string
          decisions?: Json | null
          has_quorum?: boolean | null
          id?: string
          live_results?: Json | null
          location?: string | null
          meeting_date?: string | null
          organizer_address?: string | null
          organizer_name?: string | null
          poll_id?: string
          protocol_date?: string
          protocol_number?: string | null
          quorum_info?: string | null
          status?: string
          updated_at?: string
          written_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_protocols_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_recipients: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          resident_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          resident_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_recipients_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_recipients_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_index: number
          poll_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_index: number
          poll_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_index?: number
          poll_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          options: Json
          poll_type: string | null
          title: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          options?: Json
          poll_type?: string | null
          title: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          options?: Json
          poll_type?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apartment_number: string | null
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          apartment_number?: string | null
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          apartment_number?: string | null
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          author_id: string | null
          created_at: string | null
          description: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          published: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          published?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          published?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      resident_invoice_lines: {
        Row: {
          cost_category_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          meter_reading_id: string | null
          quantity: number | null
          sort_order: number | null
          tariff_id: string | null
          total_amount: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          cost_category_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          meter_reading_id?: string | null
          quantity?: number | null
          sort_order?: number | null
          tariff_id?: string | null
          total_amount?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          cost_category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          meter_reading_id?: string | null
          quantity?: number | null
          sort_order?: number | null
          tariff_id?: string | null
          total_amount?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "resident_invoice_lines_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "resident_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_invoice_lines_meter_reading_fk"
            columns: ["meter_reading_id"]
            isOneToOne: false
            referencedRelation: "meter_readings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_invoice_lines_tariff_fk"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          current_amount: number
          due_date: string
          fully_paid_at: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_amount: number | null
          penalty_amount: number | null
          period_id: string | null
          previous_balance: number | null
          resident_id: string
          status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_amount?: number
          due_date: string
          fully_paid_at?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number | null
          penalty_amount?: number | null
          period_id?: string | null
          previous_balance?: number | null
          resident_id: string
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_amount?: number
          due_date?: string
          fully_paid_at?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number | null
          penalty_amount?: number | null
          period_id?: string | null
          previous_balance?: number | null
          resident_id?: string
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resident_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resident_invoices_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          address: string | null
          apartment_number: string | null
          company_code: string | null
          correspondence_address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          invitation_sent_at: string | null
          invitation_token: string | null
          is_active: boolean | null
          linked_profile_id: string | null
          notes: string | null
          payment_code: string | null
          phone: string | null
          property_share: number | null
          pvm_code: string | null
          receives_email: boolean | null
          receives_mail: boolean | null
          updated_at: string
          votes_count: number | null
        }
        Insert: {
          address?: string | null
          apartment_number?: string | null
          company_code?: string | null
          correspondence_address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          invitation_sent_at?: string | null
          invitation_token?: string | null
          is_active?: boolean | null
          linked_profile_id?: string | null
          notes?: string | null
          payment_code?: string | null
          phone?: string | null
          property_share?: number | null
          pvm_code?: string | null
          receives_email?: boolean | null
          receives_mail?: boolean | null
          updated_at?: string
          votes_count?: number | null
        }
        Update: {
          address?: string | null
          apartment_number?: string | null
          company_code?: string | null
          correspondence_address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          invitation_sent_at?: string | null
          invitation_token?: string | null
          is_active?: boolean | null
          linked_profile_id?: string | null
          notes?: string | null
          payment_code?: string | null
          phone?: string | null
          property_share?: number | null
          pvm_code?: string | null
          receives_email?: boolean | null
          receives_mail?: boolean | null
          updated_at?: string
          votes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_linked_profile_id_fkey"
            columns: ["linked_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_members: {
        Row: {
          created_at: string
          id: string
          resident_id: string
          segment_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          resident_id: string
          segment_id: string
        }
        Update: {
          created_at?: string
          id?: string
          resident_id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_members_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      statement_details: {
        Row: {
          account_member: string | null
          assigned_service: string | null
          assigned_to: string | null
          cost_category_id: string | null
          created_at: string
          currency: string | null
          id: string
          main_cost_date: string | null
          notes: string | null
          payment_types: string | null
          period_month: string
          quantity: number | null
          reference: string | null
          statement_type: string
          tolerance: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          account_member?: string | null
          assigned_service?: string | null
          assigned_to?: string | null
          cost_category_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          main_cost_date?: string | null
          notes?: string | null
          payment_types?: string | null
          period_month: string
          quantity?: number | null
          reference?: string | null
          statement_type: string
          tolerance?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          account_member?: string | null
          assigned_service?: string | null
          assigned_to?: string | null
          cost_category_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          main_cost_date?: string | null
          notes?: string | null
          payment_types?: string | null
          period_month?: string
          quantity?: number | null
          reference?: string | null
          statement_type?: string
          tolerance?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "statement_details_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tariffs: {
        Row: {
          cost_category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          rate: number
          tariff_type: string
          unit: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          cost_category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          rate: number
          tariff_type: string
          unit?: string | null
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          cost_category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          rate?: number
          tariff_type?: string
          unit?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tariffs_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_photos: {
        Row: {
          created_at: string | null
          id: string
          photo_url: string
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          photo_url: string
          ticket_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          photo_url?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_photos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_read: {
        Row: {
          id: string
          read_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          id?: string
          read_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          id?: string
          read_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_read_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          location: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id?: string
          location?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          location?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transaction_payments: {
        Row: {
          amount: number
          bank_statement_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          invoice_id: string | null
          payment_date: string
          payment_method: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          bank_statement_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_date: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          bank_statement_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_batches: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string | null
          file_type: string | null
          id: string
          period_month: string | null
          slip_count: number
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          period_month?: string | null
          slip_count?: number
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          period_month?: string | null
          slip_count?: number
          status?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_invoice_items: {
        Row: {
          amount: number
          asset_id: string | null
          cost_category_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string | null
          notes: string | null
          quantity: number | null
          unit: string | null
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          amount: number
          asset_id?: string | null
          cost_category_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          unit_price: number
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          asset_id?: string | null
          cost_category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoice_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoice_items_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_invoice_patterns: {
        Row: {
          cost_category_id: string | null
          created_at: string
          id: string
          last_used_at: string | null
          pattern_hash: string
          recognition_count: number | null
          updated_at: string
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          cost_category_id?: string | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          pattern_hash: string
          recognition_count?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          cost_category_id?: string | null
          created_at?: string
          id?: string
          last_used_at?: string | null
          pattern_hash?: string
          recognition_count?: number | null
          updated_at?: string
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoice_patterns_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoice_patterns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_invoices: {
        Row: {
          cost_category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          file_name: string | null
          file_url: string | null
          id: string
          invoice_date: string
          invoice_number: string
          paid_amount: number | null
          period_month: string | null
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          vat_amount: number | null
          vendor_id: string | null
        }
        Insert: {
          cost_category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          paid_amount?: number | null
          period_month?: string | null
          status?: string
          subtotal?: number
          total_amount: number
          updated_at?: string
          vat_amount?: number | null
          vendor_id?: string | null
        }
        Update: {
          cost_category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          paid_amount?: number | null
          period_month?: string | null
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          vat_amount?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoices_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          category: string | null
          city: string | null
          company_code: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          updated_at: string
          vat_code: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          category?: string | null
          city?: string | null
          company_code?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          vat_code?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          category?: string | null
          city?: string | null
          company_code?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
          vat_code?: string | null
        }
        Relationships: []
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
      link_existing_users_with_residents: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "resident"
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
      app_role: ["admin", "resident"],
    },
  },
} as const
