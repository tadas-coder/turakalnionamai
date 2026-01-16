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
      documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          title: string
          updated_at: string
          uploaded_by: string | null
          visible: boolean
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
          visible?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          visible?: boolean
        }
        Relationships: []
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
