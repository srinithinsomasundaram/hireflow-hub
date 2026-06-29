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
      applications: {
        Row: {
          ai_score: number | null
          ai_summary: string | null
          applied_at: string
          candidate_id: string
          cover_letter: string | null
          id: string
          job_id: string
          organization_id: string
          source: string | null
          stage: Database["public"]["Enums"]["application_stage"]
          updated_at: string
        }
        Insert: {
          ai_score?: number | null
          ai_summary?: string | null
          applied_at?: string
          candidate_id: string
          cover_letter?: string | null
          id?: string
          job_id: string
          organization_id: string
          source?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
        }
        Update: {
          ai_score?: number | null
          ai_summary?: string | null
          applied_at?: string
          candidate_id?: string
          cover_letter?: string | null
          id?: string
          job_id?: string
          organization_id?: string
          source?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action: string
          action_config: Json | null
          created_at: string
          enabled: boolean
          id: string
          name: string
          organization_id: string
          trigger: string
          trigger_config: Json | null
          updated_at: string
        }
        Insert: {
          action: string
          action_config?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          organization_id: string
          trigger: string
          trigger_config?: Json | null
          updated_at?: string
        }
        Update: {
          action?: string
          action_config?: Json | null
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          organization_id?: string
          trigger?: string
          trigger_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          current_company: string | null
          current_salary: number | null
          email: string
          expected_salary: number | null
          experience_years: number | null
          full_name: string
          id: string
          linkedin_url: string | null
          notes: string | null
          notice_period: string | null
          organization_id: string
          phone: string | null
          portfolio_url: string | null
          resume_url: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_company?: string | null
          current_salary?: number | null
          email: string
          expected_salary?: number | null
          experience_years?: number | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          notice_period?: string | null
          organization_id: string
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_company?: string | null
          current_salary?: number | null
          email?: string
          expected_salary?: number | null
          experience_years?: number | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          notes?: string | null
          notice_period?: string | null
          organization_id?: string
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          organization_id: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          subject: string
          type?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          application_id: string | null
          candidate_id: string | null
          created_at: string
          department: string | null
          email: string
          employee_code: string | null
          full_name: string
          id: string
          joining_date: string
          manager: string | null
          organization_id: string
          position: string | null
          status: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          candidate_id?: string | null
          created_at?: string
          department?: string | null
          email: string
          employee_code?: string | null
          full_name: string
          id?: string
          joining_date: string
          manager?: string | null
          organization_id: string
          position?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string | null
          created_at?: string
          department?: string | null
          email?: string
          employee_code?: string | null
          full_name?: string
          id?: string
          joining_date?: string
          manager?: string | null
          organization_id?: string
          position?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          duration_minutes: number | null
          feedback: string | null
          id: string
          interviewer_id: string | null
          meeting_url: string | null
          organization_id: string
          rating: number | null
          scheduled_at: string
          status: Database["public"]["Enums"]["interview_status"]
          type: Database["public"]["Enums"]["interview_type"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          interviewer_id?: string | null
          meeting_url?: string | null
          organization_id: string
          rating?: number | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["interview_status"]
          type?: Database["public"]["Enums"]["interview_type"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          interviewer_id?: string | null
          meeting_url?: string | null
          organization_id?: string
          rating?: number | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["interview_status"]
          type?: Database["public"]["Enums"]["interview_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          id: string
          location: string | null
          organization_id: string
          published_at: string | null
          requirements: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          location?: string | null
          organization_id: string
          published_at?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          id?: string
          location?: string | null
          organization_id?: string
          published_at?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          brand_config: Json | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          careers_tagline: string | null
          crm_config: Json | null
          crm_enabled: boolean | null
          custom_domain: string | null
          form_config: Json | null
          organization_id: string
          pipeline_config: Json | null
          smtp_config: Json | null
          smtp_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          brand_config?: Json | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          careers_tagline?: string | null
          crm_config?: Json | null
          crm_enabled?: boolean | null
          custom_domain?: string | null
          form_config?: Json | null
          organization_id: string
          pipeline_config?: Json | null
          smtp_config?: Json | null
          smtp_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          brand_config?: Json | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          careers_tagline?: string | null
          crm_config?: Json | null
          crm_enabled?: boolean | null
          custom_domain?: string | null
          form_config?: Json | null
          organization_id?: string
          pipeline_config?: Json | null
          smtp_config?: Json | null
          smtp_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          company_name: string
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          owner_id: string
          slug: string
          subdomain: string | null
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          owner_id: string
          slug: string
          subdomain?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          owner_id?: string
          slug?: string
          subdomain?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      org_invitations: {
        Row: {
          id: string
          organization_id: string
          token: string
          role: Database["public"]["Enums"]["app_role"]
          email: string | null
          invited_by: string | null
          created_at: string
          expires_at: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          token?: string
          role?: Database["public"]["Enums"]["app_role"]
          email?: string | null
          invited_by?: string | null
          created_at?: string
          expires_at?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_seen_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_with_owner: {
        Args: {
          _company_name: string
          _industry?: string
          _slug: string
          _website?: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      accept_invitation: {
        Args: { p_token: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "recruiter"
        | "hiring_manager"
        | "interviewer"
      application_stage:
        | "applied"
        | "screening"
        | "hr_interview"
        | "technical_interview"
        | "manager_round"
        | "offer"
        | "hired"
        | "rejected"
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "internship"
        | "temporary"
      interview_status: "scheduled" | "completed" | "cancelled" | "no_show"
      interview_type:
        | "phone"
        | "video"
        | "onsite"
        | "technical"
        | "hr"
        | "manager"
      job_status: "draft" | "published" | "closed" | "archived"
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
      app_role: [
        "owner",
        "admin",
        "recruiter",
        "hiring_manager",
        "interviewer",
      ],
      application_stage: [
        "applied",
        "screening",
        "hr_interview",
        "technical_interview",
        "manager_round",
        "offer",
        "hired",
        "rejected",
      ],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "internship",
        "temporary",
      ],
      interview_status: ["scheduled", "completed", "cancelled", "no_show"],
      interview_type: [
        "phone",
        "video",
        "onsite",
        "technical",
        "hr",
        "manager",
      ],
      job_status: ["draft", "published", "closed", "archived"],
    },
  },
} as const
