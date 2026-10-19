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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      boards: {
        Row: {
          background: string
          board_type: string
          created_at: string
          id: string
          is_starred: boolean
          owner_id: string
          position: number
          title: string
        }
        Insert: {
          background?: string
          board_type?: string
          created_at?: string
          id?: string
          is_starred?: boolean
          owner_id?: string
          position?: number
          title: string
        }
        Update: {
          background?: string
          board_type?: string
          created_at?: string
          id?: string
          is_starred?: boolean
          owner_id?: string
          position?: number
          title?: string
        }
        Relationships: []
      }
      card_activity: {
        Row: {
          action: string
          actor: string
          card_id: string
          created_at: string
          id: string
        }
        Insert: {
          action: string
          actor?: string
          card_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          card_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_activity_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_activity_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "claude_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      card_labels: {
        Row: {
          card_id: string
          label_id: string
        }
        Insert: {
          card_id: string
          label_id: string
        }
        Update: {
          card_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_labels_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_labels_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "claude_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          archived: boolean
          board_id: string
          claude_enabled: boolean
          claude_instructions: string | null
          claude_last_run_at: string | null
          claude_output: string | null
          claude_status: string
          created_at: string
          description: string | null
          due_date: string | null
          goal_card_id: string | null
          id: string
          is_complete: boolean
          list_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          board_id: string
          claude_enabled?: boolean
          claude_instructions?: string | null
          claude_last_run_at?: string | null
          claude_output?: string | null
          claude_status?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_card_id?: string | null
          id?: string
          is_complete?: boolean
          list_id: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          board_id?: string
          claude_enabled?: boolean
          claude_instructions?: string | null
          claude_last_run_at?: string | null
          claude_output?: string | null
          claude_status?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          goal_card_id?: string | null
          id?: string
          is_complete?: boolean
          list_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_goal_card_id_fkey"
            columns: ["goal_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_goal_card_id_fkey"
            columns: ["goal_card_id"]
            isOneToOne: false
            referencedRelation: "claude_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checklist_id: string
          id: string
          is_done: boolean
          position: number
          text: string
        }
        Insert: {
          checklist_id: string
          id?: string
          is_done?: boolean
          position?: number
          text: string
        }
        Update: {
          checklist_id?: string
          id?: string
          is_done?: boolean
          position?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          card_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          card_id: string
          id?: string
          position?: number
          title?: string
        }
        Update: {
          card_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "claude_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          board_id: string
          color: string
          id: string
          name: string
        }
        Insert: {
          board_id: string
          color?: string
          id?: string
          name?: string
        }
        Update: {
          board_id?: string
          color?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          archived: boolean
          board_id: string
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          archived?: boolean
          board_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          archived?: boolean
          board_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      youtube_details: {
        Row: {
          card_id: string
          hook: string | null
          publish_date: string | null
          script: string | null
          tags: string | null
          thumbnail_concept: string | null
          title_options: string | null
          video_type: string | null
          video_url: string | null
          working_title: string | null
          yt_description: string | null
        }
        Insert: {
          card_id: string
          hook?: string | null
          publish_date?: string | null
          script?: string | null
          tags?: string | null
          thumbnail_concept?: string | null
          title_options?: string | null
          video_type?: string | null
          video_url?: string | null
          working_title?: string | null
          yt_description?: string | null
        }
        Update: {
          card_id?: string
          hook?: string | null
          publish_date?: string | null
          script?: string | null
          tags?: string | null
          thumbnail_concept?: string | null
          title_options?: string | null
          video_type?: string | null
          video_url?: string | null
          working_title?: string | null
          yt_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_details_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "youtube_details_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "claude_queue"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      claude_queue: {
        Row: {
          archived: boolean | null
          board_id: string | null
          board_title: string | null
          claude_enabled: boolean | null
          claude_instructions: string | null
          claude_last_run_at: string | null
          claude_output: string | null
          claude_status: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          goal_card_id: string | null
          hook: string | null
          id: string | null
          is_complete: boolean | null
          list_id: string | null
          list_title: string | null
          position: number | null
          publish_date: string | null
          script: string | null
          tags: string | null
          thumbnail_concept: string | null
          title: string | null
          title_options: string | null
          updated_at: string | null
          video_type: string | null
          video_url: string | null
          working_title: string | null
          yt_description: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_goal_card_id_fkey"
            columns: ["goal_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_goal_card_id_fkey"
            columns: ["goal_card_id"]
            isOneToOne: false
            referencedRelation: "claude_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_completed: { Args: { _board_id: string }; Returns: number }
      owns_board: { Args: { _board_id: string }; Returns: boolean }
      seed_default_boards: { Args: never; Returns: undefined }
      weekly_reset: { Args: { _board_id: string }; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
