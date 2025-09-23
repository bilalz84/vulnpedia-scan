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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      payload_library: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          payload: string
          source: string
          source_url: string | null
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          payload: string
          source: string
          source_url?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          payload?: string
          source?: string
          source_url?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payload_tests: {
        Row: {
          executed_at: string
          executed_by: string
          id: string
          payload: string
          payload_type: string
          response_data: string | null
          response_time: number | null
          status: string
          target_url: string
          vulnerability_id: string | null
        }
        Insert: {
          executed_at?: string
          executed_by?: string
          id?: string
          payload: string
          payload_type: string
          response_data?: string | null
          response_time?: number | null
          status: string
          target_url: string
          vulnerability_id?: string | null
        }
        Update: {
          executed_at?: string
          executed_by?: string
          id?: string
          payload?: string
          payload_type?: string
          response_data?: string | null
          response_time?: number | null
          status?: string
          target_url?: string
          vulnerability_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payload_tests_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          completed_at: string | null
          created_by: string
          critical_count: number | null
          high_count: number | null
          id: string
          low_count: number | null
          medium_count: number | null
          progress: number
          scan_data: Json | null
          scan_type: string
          started_at: string
          status: string
          target: string
          total_vulnerabilities: number | null
        }
        Insert: {
          completed_at?: string | null
          created_by?: string
          critical_count?: number | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          progress?: number
          scan_data?: Json | null
          scan_type?: string
          started_at?: string
          status?: string
          target: string
          total_vulnerabilities?: number | null
        }
        Update: {
          completed_at?: string | null
          created_by?: string
          critical_count?: number | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          progress?: number
          scan_data?: Json | null
          scan_type?: string
          started_at?: string
          status?: string
          target?: string
          total_vulnerabilities?: number | null
        }
        Relationships: []
      }
      vulnerabilities: {
        Row: {
          affected_versions: string[] | null
          confidence_score: number
          cve: string
          description: string
          discovered_at: string
          evidence: string | null
          exploit_available: boolean
          exploit_payloads: Json | null
          id: string
          location_method: string
          location_parameter: string | null
          location_path: string
          location_url: string
          port: number
          scan_id: string
          service_name: string
          severity: string
          title: string
        }
        Insert: {
          affected_versions?: string[] | null
          confidence_score?: number
          cve: string
          description: string
          discovered_at?: string
          evidence?: string | null
          exploit_available?: boolean
          exploit_payloads?: Json | null
          id?: string
          location_method: string
          location_parameter?: string | null
          location_path: string
          location_url: string
          port: number
          scan_id: string
          service_name: string
          severity: string
          title: string
        }
        Update: {
          affected_versions?: string[] | null
          confidence_score?: number
          cve?: string
          description?: string
          discovered_at?: string
          evidence?: string | null
          exploit_available?: boolean
          exploit_payloads?: Json | null
          id?: string
          location_method?: string
          location_parameter?: string | null
          location_path?: string
          location_url?: string
          port?: number
          scan_id?: string
          service_name?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "vulnerabilities_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      vulnerability_reports: {
        Row: {
          critical_count: number
          generated_at: string
          generated_by: string
          high_count: number
          id: string
          low_count: number
          medium_count: number
          report_data: Json
          report_format: string
          report_title: string
          scan_date: string
          scan_id: string
          target: string
          total_vulnerabilities: number
        }
        Insert: {
          critical_count?: number
          generated_at?: string
          generated_by: string
          high_count?: number
          id?: string
          low_count?: number
          medium_count?: number
          report_data?: Json
          report_format?: string
          report_title: string
          scan_date: string
          scan_id: string
          target: string
          total_vulnerabilities?: number
        }
        Update: {
          critical_count?: number
          generated_at?: string
          generated_by?: string
          high_count?: number
          id?: string
          low_count?: number
          medium_count?: number
          report_data?: Json
          report_format?: string
          report_title?: string
          scan_date?: string
          scan_id?: string
          target?: string
          total_vulnerabilities?: number
        }
        Relationships: [
          {
            foreignKeyName: "vulnerability_reports_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
