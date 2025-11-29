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
      admin_audit: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      ai_quotas: {
        Row: {
          created_at: string
          daily_limit: number | null
          id: string
          is_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          action: string
          created_at: string
          exam_type: string | null
          id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          exam_type?: string | null
          id?: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          exam_type?: string | null
          id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          created_at: string | null
          essay_id: string | null
          id: string
          member_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          teacher_feedback: string | null
          teacher_score: number | null
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          essay_id?: string | null
          id?: string
          member_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          teacher_feedback?: string | null
          teacher_score?: number | null
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          essay_id?: string | null
          id?: string
          member_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          teacher_feedback?: string | null
          teacher_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "institution_members"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          batch_id: string | null
          created_at: string | null
          created_by: string
          due_date: string | null
          exam_type: string
          id: string
          institution_id: string
          instructions: string | null
          is_active: boolean | null
          max_word_count: number | null
          min_word_count: number | null
          title: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          created_by: string
          due_date?: string | null
          exam_type?: string
          id?: string
          institution_id: string
          instructions?: string | null
          is_active?: boolean | null
          max_word_count?: number | null
          min_word_count?: number | null
          title: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string
          due_date?: string | null
          exam_type?: string
          id?: string
          institution_id?: string
          instructions?: string | null
          is_active?: boolean | null
          max_word_count?: number | null
          min_word_count?: number | null
          title?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_members: {
        Row: {
          added_at: string | null
          batch_id: string
          id: string
          member_id: string
        }
        Insert: {
          added_at?: string | null
          batch_id: string
          id?: string
          member_id: string
        }
        Update: {
          added_at?: string | null
          batch_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_members_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "institution_members"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      essays: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          created_at: string
          essay_text: string | null
          exam_type: string
          id: string
          institution_id: string | null
          institution_member_id: string | null
          local_id: string | null
          share_token: string | null
          task1_image_url: string | null
          topic: string | null
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          created_at?: string
          essay_text?: string | null
          exam_type: string
          id?: string
          institution_id?: string | null
          institution_member_id?: string | null
          local_id?: string | null
          share_token?: string | null
          task1_image_url?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          created_at?: string
          essay_text?: string | null
          exam_type?: string
          id?: string
          institution_id?: string | null
          institution_member_id?: string | null
          local_id?: string | null
          share_token?: string | null
          task1_image_url?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "essays_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essays_institution_member_id_fkey"
            columns: ["institution_member_id"]
            isOneToOne: false
            referencedRelation: "institution_members"
            referencedColumns: ["id"]
          },
        ]
      }
      gre_topics: {
        Row: {
          created_at: string
          id: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      ielts_t1: {
        Row: {
          created_at: string
          id: string
          image_base64: string | null
          image_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_base64?: string | null
          image_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_base64?: string | null
          image_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ielts_t2: {
        Row: {
          created_at: string
          id: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      institution_members: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          role: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          role: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_user_id: string
          plan: string | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_user_id: string
          plan?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          plan?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      peer_feedback: {
        Row: {
          comment: string
          created_at: string
          essay_id: string
          id: string
          rating: number
          reviewer_user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          essay_id: string
          id?: string
          rating: number
          reviewer_user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          essay_id?: string
          id?: string
          rating?: number
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_feedback_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task1_images: {
        Row: {
          created_at: string
          essay_id: string | null
          id: string
          image_base64: string | null
          image_type: string | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          essay_id?: string | null
          id?: string
          image_base64?: string | null
          image_type?: string | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          essay_id?: string | null
          id?: string
          image_base64?: string | null
          image_type?: string | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task1_images_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          banned_by: string | null
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vocab_words: {
        Row: {
          created_at: string
          friends_example: string | null
          gg_example: string | null
          id: string
          meaning: string
          mf_example: string | null
          tbbt_example: string | null
          updated_at: string
          word: string
        }
        Insert: {
          created_at?: string
          friends_example?: string | null
          gg_example?: string | null
          id?: string
          meaning: string
          mf_example?: string | null
          tbbt_example?: string | null
          updated_at?: string
          word: string
        }
        Update: {
          created_at?: string
          friends_example?: string | null
          gg_example?: string | null
          id?: string
          meaning?: string
          mf_example?: string | null
          tbbt_example?: string | null
          updated_at?: string
          word?: string
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
      is_institution_admin: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      is_institution_member: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
      is_institution_teacher_or_admin: {
        Args: { _institution_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
