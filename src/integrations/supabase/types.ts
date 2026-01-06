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
      announcements: {
        Row: {
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          link: string | null
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      game_profiles: {
        Row: {
          user_id: string
          zcoins: number
          zgold: number
          server_region: string
          challenges_generated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          zcoins?: number
          server_region?: string
          challenges_generated?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          zcoins?: number
          zgold?: number
          server_region?: string
          challenges_generated?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          id: string
          user_id: string
          item_id: string
          item_name: string
          item_name_ar: string
          item_type: string
          created_at: string
          is_equipped: boolean
          currency_type: string
          purchase_price: number
        }
        Insert: {
          id?: string
          user_id: string
          item_id: string
          item_name: string
          item_name_ar: string
          item_type: string
          created_at?: string
          is_equipped?: boolean
          currency_type: string
          purchase_price: number
        }
        Update: {
          id?: string
          user_id?: string
          item_id?: string
          item_name?: string
          item_name_ar?: string
          item_type?: string
          created_at?: string
          is_equipped?: boolean
          currency_type?: string
          purchase_price?: number
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          id: string
          invite_code: string
          host_id: string
          guest_id: string | null
          status: string
          created_at: string
          start_time: string | null
          end_time: string | null
          host_score: number
          guest_score: number
        }
        Insert: {
          id?: string
          invite_code: string
          host_id: string
          guest_id?: string | null
          status?: string
          created_at?: string
          start_time?: string | null
          end_time?: string | null
          host_score?: number
          guest_score?: number
        }
        Update: {
          id?: string
          invite_code?: string
          host_id?: string
          guest_id?: string | null
          status?: string
          created_at?: string
          start_time?: string | null
          end_time?: string | null
          host_score?: number
          guest_score?: number
        }
        Relationships: []
      }
      player_challenges: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          status: string
          proof_url: string | null
          reward_claimed: number
          created_at: string
          completed_at: string | null
          failed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id: string
          status?: string
          proof_url?: string | null
          reward_claimed?: number
          created_at?: string
          completed_at?: string | null
          failed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string
          status?: string
          proof_url?: string | null
          reward_claimed?: number
          created_at?: string
          completed_at?: string | null
          failed_at?: string | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          title: string
          title_ar: string | null
          description: string
          description_ar: string | null
          cost: number
          reward: number
          failure_penalty: number
          difficulty: string
          verification_type: string
          time_limit: string | null
          icon: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id: string
          title: string
          title_ar?: string | null
          description: string
          description_ar?: string | null
          cost?: number
          reward?: number
          failure_penalty?: number
          difficulty: string
          verification_type: string
          time_limit?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          title_ar?: string | null
          description?: string
          description_ar?: string | null
          cost?: number
          reward?: number
          failure_penalty?: number
          difficulty?: string
          verification_type?: string
          time_limit?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          id: string
          user_id: string
          title: string
          title_ar: string
          description: string
          description_ar: string
          cost: number
          reward: number
          failure_penalty: number
          difficulty: string
          verification_type: string
          time_limit: string | null
          icon: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          title_ar: string
          description: string
          description_ar: string
          cost?: number
          reward?: number
          failure_penalty?: number
          difficulty: string
          verification_type?: string
          time_limit?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          title_ar?: string
          description?: string
          description_ar?: string
          cost?: number
          reward?: number
          failure_penalty?: number
          difficulty?: string
          verification_type?: string
          time_limit?: string | null
          icon?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      game_servers: {

        Row: {
          id: string
          name: string
          region: string
          region_ar: string | null
          location_x: number
          location_y: number
          ping: number
          player_count: number
          status: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          region: string
          region_ar?: string | null
          location_x?: number
          location_y?: number
          ping?: number
          player_count?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          region?: string
          region_ar?: string | null
          location_x?: number
          location_y?: number
          ping?: number
          player_count?: number
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      game_stats: {
        Row: {
          id: string
          total_players: number
          active_players: number
          total_challenges_completed: number
          total_zcoins_earned: number
          updated_at: string
        }
        Insert: {
          id?: string
          total_players?: number
          active_players?: number
          total_challenges_completed?: number
          total_zcoins_earned?: number
          updated_at?: string
        }
        Update: {
          id?: string
          total_players?: number
          active_players?: number
          total_challenges_completed?: number
          total_zcoins_earned?: number
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          related_comment_id: string | null
          related_post_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          related_comment_id?: string | null
          related_post_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          related_comment_id?: string | null
          related_post_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_comment_id_fkey"
            columns: ["related_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_post_id_fkey"
            columns: ["related_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified?: boolean
        }
        Relationships: []
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          session_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          session_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          session_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_name: string
          category_id: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_pinned: boolean
          pinned_at: string | null
          published: boolean
          scheduled_at: string | null
          slug: string
          title: string
          updated_at: string
          user_id: string | null
          views_count: number
        }
        Insert: {
          author_name?: string
          category_id?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_pinned?: boolean
          pinned_at?: string | null
          published?: boolean
          scheduled_at?: string | null
          slug: string
          title: string
          updated_at?: string
          user_id?: string | null
          views_count?: number
        }
        Update: {
          author_name?: string
          category_id?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_pinned?: boolean
          pinned_at?: string | null
          published?: boolean
          scheduled_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
          is_creator: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_creator?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_creator?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          company_type: string | null
          content_preferences: string[] | null
          created_at: string
          id: string
          interests: string[] | null
          onboarding_completed: boolean | null
          team_size: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_type?: string | null
          content_preferences?: string[] | null
          created_at?: string
          id?: string
          interests?: string[] | null
          onboarding_completed?: boolean | null
          team_size?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_type?: string | null
          content_preferences?: string[] | null
          created_at?: string
          id?: string
          interests?: string[] | null
          onboarding_completed?: boolean | null
          team_size?: string | null
          updated_at?: string
          user_id?: string
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
      ai_posts: {
        Row: {
          id: string
          title: string
          description: string
          cover_image: string | null
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          cover_image?: string | null
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          cover_image?: string | null
          is_published?: boolean
          created_at?: string
        }
        Relationships: []
      }
      ai_documentation: {
        Row: {
          id: string
          type: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_post_config: {
        Row: {
          id: string
          posts_today: number
          max_posts_per_day: number
          last_post_date: string | null
          last_post_at: string | null
          next_scheduled_at: string | null
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          posts_today?: number
          max_posts_per_day?: number
          last_post_date?: string | null
          last_post_at?: string | null
          next_scheduled_at?: string | null
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          posts_today?: number
          max_posts_per_day?: number
          last_post_date?: string | null
          last_post_at?: string | null
          next_scheduled_at?: string | null
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_otps: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_zcoins: {
        Args: {
          amount: number
          user_id: string
        }
        Returns: undefined
      }
      redeem_coupon: {
        Args: {
          p_user_id: string
          p_coupon_code: string
        }
        Returns: {
          success: boolean
          message: string
          reward_amount: number
          reward_currency: string
        }[]
      }
      can_ai_post: {
        Args: Record<string, never>
        Returns: boolean
      }
      record_ai_post: {
        Args: Record<string, never>
        Returns: undefined
      }
      get_ai_documentation_json: {
        Args: Record<string, never>
        Returns: Json
      }
      should_generate_ai_post: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
