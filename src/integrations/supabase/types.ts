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
      bookings: {
        Row: {
          addons: string[] | null
          addons_price: number
          base_price: number
          booking_date: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          duration: number
          hour: number
          id: string
          paid_amount: number
          payment_kind: Database["public"]["Enums"]["payment_kind"]
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          qr_token: string
          refund_amount: number
          service_fee: number
          short_code: string
          stadium_id: string
          status: Database["public"]["Enums"]["booking_status"]
          total: number
          user_id: string
          verified_at: string | null
        }
        Insert: {
          addons?: string[] | null
          addons_price?: number
          base_price: number
          booking_date: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          duration: number
          hour: number
          id?: string
          paid_amount: number
          payment_kind: Database["public"]["Enums"]["payment_kind"]
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          qr_token?: string
          refund_amount?: number
          service_fee?: number
          short_code: string
          stadium_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          total: number
          user_id: string
          verified_at?: string | null
        }
        Update: {
          addons?: string[] | null
          addons_price?: number
          base_price?: number
          booking_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          duration?: number
          hour?: number
          id?: string
          paid_amount?: number
          payment_kind?: Database["public"]["Enums"]["payment_kind"]
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          qr_token?: string
          refund_amount?: number
          service_fee?: number
          short_code?: string
          stadium_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total?: number
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_stadium_id_fkey"
            columns: ["stadium_id"]
            isOneToOne: false
            referencedRelation: "stadiums"
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
          is_blocked: boolean
          lang: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_blocked?: boolean
          lang?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          lang?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stadiums: {
        Row: {
          address: string
          created_at: string
          description: string | null
          district: string
          facilities: string[] | null
          has_balls: boolean | null
          has_bibs: boolean | null
          has_referee: boolean | null
          has_video: boolean | null
          id: string
          images: string[] | null
          lat: number | null
          lng: number | null
          name: string
          owner_id: string
          price_day: number
          price_night: number
          rating: number | null
          reviews: number | null
          size: string | null
          status: Database["public"]["Enums"]["stadium_status"]
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          description?: string | null
          district: string
          facilities?: string[] | null
          has_balls?: boolean | null
          has_bibs?: boolean | null
          has_referee?: boolean | null
          has_video?: boolean | null
          id?: string
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          name: string
          owner_id: string
          price_day: number
          price_night: number
          rating?: number | null
          reviews?: number | null
          size?: string | null
          status?: Database["public"]["Enums"]["stadium_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          description?: string | null
          district?: string
          facilities?: string[] | null
          has_balls?: boolean | null
          has_bibs?: boolean | null
          has_referee?: boolean | null
          has_video?: boolean | null
          id?: string
          images?: string[] | null
          lat?: number | null
          lng?: number | null
          name?: string
          owner_id?: string
          price_day?: number
          price_night?: number
          rating?: number | null
          reviews?: number | null
          size?: string | null
          status?: Database["public"]["Enums"]["stadium_status"]
          updated_at?: string
        }
        Relationships: []
      }
      edit_requests: {
        Row: {
          id: string
          supervisor_id: string
          stadium_id: string
          field_name: string
          old_value: string | null
          new_value: string
          status: string
          admin_response: string | null
          created_at: string
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          supervisor_id: string
          stadium_id: string
          field_name: string
          old_value?: string | null
          new_value: string
          status?: string
          admin_response?: string | null
          created_at?: string
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          supervisor_id?: string
          stadium_id?: string
          field_name?: string
          old_value?: string | null
          new_value?: string
          status?: string
          admin_response?: string | null
          created_at?: string
          reviewed_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          stadium_id: string
          booking_id: string | null
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stadium_id: string
          booking_id?: string | null
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stadium_id?: string
          booking_id?: string | null
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string
          commission_amount: number
          created_at: string
          escrow_status: string
          external_ref: string | null
          id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          released_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          commission_amount?: number
          created_at?: string
          escrow_status?: string
          external_ref?: string | null
          id?: string
          provider: Database["public"]["Enums"]["payment_provider"]
          released_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          commission_amount?: number
          created_at?: string
          escrow_status?: string
          external_ref?: string | null
          id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          released_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: undefined }
      claim_owner_role: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "user"
      booking_status: "confirmed" | "cancelled" | "completed" | "no_show"
      payment_kind: "deposit" | "full"
      payment_provider: "click" | "payme" | "uzum"
      stadium_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "owner", "user"],
      booking_status: ["confirmed", "cancelled", "completed", "no_show"],
      payment_kind: ["deposit", "full"],
      payment_provider: ["click", "payme", "uzum"],
      stadium_status: ["pending", "approved", "rejected"],
    },
  },
} as const
