export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string;
          id: string;
          key_hash: string;
          last_used_at: string | null;
          name: string;
          prefix: string;
          revoked_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key_hash: string;
          last_used_at?: string | null;
          name: string;
          prefix: string;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key_hash?: string;
          last_used_at?: string | null;
          name?: string;
          prefix?: string;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      gpu_types: {
        Row: {
          benchmark_score: number;
          created_at: string;
          id: string;
          model: string;
          price_inr_per_min_paise: number;
          price_usd_per_hour: number;
          ram_gb: number;
          slug: string;
          sort_order: number;
          tier: string;
          vcpus: number;
          vram_gb: number;
        };
        Insert: {
          benchmark_score?: number;
          created_at?: string;
          id?: string;
          model: string;
          price_inr_per_min_paise: number;
          price_usd_per_hour: number;
          ram_gb?: number;
          slug: string;
          sort_order?: number;
          tier?: string;
          vcpus?: number;
          vram_gb: number;
        };
        Update: {
          benchmark_score?: number;
          created_at?: string;
          id?: string;
          model?: string;
          price_inr_per_min_paise?: number;
          price_usd_per_hour?: number;
          ram_gb?: number;
          slug?: string;
          sort_order?: number;
          tier?: string;
          vcpus?: number;
          vram_gb?: number;
        };
        Relationships: [];
      };
      instance_events: {
        Row: {
          created_at: string;
          detail: string;
          event: string;
          id: string;
          instance_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          detail?: string;
          event: string;
          id?: string;
          instance_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          detail?: string;
          event?: string;
          id?: string;
          instance_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instance_events_instance_id_fkey";
            columns: ["instance_id"];
            isOneToOne: false;
            referencedRelation: "instances";
            referencedColumns: ["id"];
          },
        ];
      };
      instances: {
        Row: {
          accrued_paise: number;
          auto_shutdown_minutes: number | null;
          billed_minutes: number;
          created_at: string;
          id: string;
          jupyter_token: string;
          last_billed_at: string | null;
          name: string;
          offer_id: string;
          price_inr_per_min_paise: number;
          public_ip: string;
          spend_cap_paise: number | null;
          ssh_host: string;
          ssh_port: number;
          started_at: string | null;
          status: string;
          stopped_at: string | null;
          storage_gb: number;
          template_id: string | null;
          terminated_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accrued_paise?: number;
          auto_shutdown_minutes?: number | null;
          billed_minutes?: number;
          created_at?: string;
          id?: string;
          jupyter_token?: string;
          last_billed_at?: string | null;
          name: string;
          offer_id: string;
          price_inr_per_min_paise: number;
          public_ip?: string;
          spend_cap_paise?: number | null;
          ssh_host?: string;
          ssh_port?: number;
          started_at?: string | null;
          status?: string;
          stopped_at?: string | null;
          storage_gb?: number;
          template_id?: string | null;
          terminated_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accrued_paise?: number;
          auto_shutdown_minutes?: number | null;
          billed_minutes?: number;
          created_at?: string;
          id?: string;
          jupyter_token?: string;
          last_billed_at?: string | null;
          name?: string;
          offer_id?: string;
          price_inr_per_min_paise?: number;
          public_ip?: string;
          spend_cap_paise?: number | null;
          ssh_host?: string;
          ssh_port?: number;
          started_at?: string | null;
          status?: string;
          stopped_at?: string | null;
          storage_gb?: number;
          template_id?: string | null;
          terminated_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instances_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "provider_offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "instances_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          compute_minutes: number;
          compute_paise: number;
          created_at: string;
          gst_number: string | null;
          gst_paise: number;
          gst_rate: number;
          id: string;
          invoice_number: string | null;
          issued_at: string;
          line_items: Json;
          period_end: string;
          period_start: string;
          place_of_supply: string;
          status: string;
          storage_paise: number;
          total_paise: number;
          user_id: string;
        };
        Insert: {
          compute_minutes?: number;
          compute_paise?: number;
          created_at?: string;
          gst_number?: string | null;
          gst_paise?: number;
          gst_rate?: number;
          id?: string;
          invoice_number?: string | null;
          issued_at?: string;
          line_items?: Json;
          period_end: string;
          period_start: string;
          place_of_supply?: string;
          status?: string;
          storage_paise?: number;
          total_paise?: number;
          user_id: string;
        };
        Update: {
          compute_minutes?: number;
          compute_paise?: number;
          created_at?: string;
          gst_number?: string | null;
          gst_paise?: number;
          gst_rate?: number;
          id?: string;
          invoice_number?: string | null;
          issued_at?: string;
          line_items?: Json;
          period_end?: string;
          period_start?: string;
          place_of_supply?: string;
          status?: string;
          storage_paise?: number;
          total_paise?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          country: string;
          created_at: string;
          display_name: string;
          gst_number: string | null;
          id: string;
          org_name: string;
          updated_at: string;
        };
        Insert: {
          country?: string;
          created_at?: string;
          display_name?: string;
          gst_number?: string | null;
          id: string;
          org_name?: string;
          updated_at?: string;
        };
        Update: {
          country?: string;
          created_at?: string;
          display_name?: string;
          gst_number?: string | null;
          id?: string;
          org_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_offers: {
        Row: {
          active: boolean;
          available_units: number;
          created_at: string;
          gpu_type_id: string;
          id: string;
          is_spot: boolean;
          payout_rate: number;
          price_inr_per_min_paise: number;
          provider_id: string;
          storage_gb_included: number;
          total_units: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          available_units?: number;
          created_at?: string;
          gpu_type_id: string;
          id?: string;
          is_spot?: boolean;
          payout_rate?: number;
          price_inr_per_min_paise: number;
          provider_id: string;
          storage_gb_included?: number;
          total_units?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          available_units?: number;
          created_at?: string;
          gpu_type_id?: string;
          id?: string;
          is_spot?: boolean;
          payout_rate?: number;
          price_inr_per_min_paise?: number;
          provider_id?: string;
          storage_gb_included?: number;
          total_units?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_offers_gpu_type_id_fkey";
            columns: ["gpu_type_id"];
            isOneToOne: false;
            referencedRelation: "gpu_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provider_offers_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_verification_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: string;
          notes: string;
          provider_id: string;
          stage: string;
          status: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          notes?: string;
          provider_id: string;
          stage: string;
          status?: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          notes?: string;
          provider_id?: string;
          stage?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_verification_events_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
        ];
      };
      providers: {
        Row: {
          avg_provision_seconds: number;
          benchmark_score: number;
          company_name: string;
          contact_email: string | null;
          country: string;
          created_at: string;
          datacentre_tier: string;
          id: string;
          incidents_30d: number;
          network_gbps: number;
          notes: string | null;
          owner_id: string | null;
          power_redundancy: string;
          region: string;
          review_notes: string;
          reviewed_by: string | null;
          storage_read_mbps: number;
          storage_write_mbps: number;
          updated_at: string;
          uptime_pct: number;
          verification_status: string;
          verified_at: string | null;
        };
        Insert: {
          avg_provision_seconds?: number;
          benchmark_score?: number;
          company_name: string;
          contact_email?: string | null;
          country?: string;
          created_at?: string;
          datacentre_tier?: string;
          id?: string;
          incidents_30d?: number;
          network_gbps?: number;
          notes?: string | null;
          owner_id?: string | null;
          power_redundancy?: string;
          region: string;
          review_notes?: string;
          reviewed_by?: string | null;
          storage_read_mbps?: number;
          storage_write_mbps?: number;
          updated_at?: string;
          uptime_pct?: number;
          verification_status?: string;
          verified_at?: string | null;
        };
        Update: {
          avg_provision_seconds?: number;
          benchmark_score?: number;
          company_name?: string;
          contact_email?: string | null;
          country?: string;
          created_at?: string;
          datacentre_tier?: string;
          id?: string;
          incidents_30d?: number;
          network_gbps?: number;
          notes?: string | null;
          owner_id?: string | null;
          power_redundancy?: string;
          region?: string;
          review_notes?: string;
          reviewed_by?: string | null;
          storage_read_mbps?: number;
          storage_write_mbps?: number;
          updated_at?: string;
          uptime_pct?: number;
          verification_status?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          priority: string;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          priority?: string;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          blurb: string;
          category: string;
          default_auto_shutdown_minutes: number;
          default_storage_gb: number;
          description: string;
          docker_image: string;
          exposes_jupyter: boolean;
          id: string;
          launch_hint: string;
          min_vram_gb: number;
          name: string;
          one_click: boolean;
          slug: string;
          sort_order: number;
        };
        Insert: {
          blurb?: string;
          category?: string;
          default_auto_shutdown_minutes?: number;
          default_storage_gb?: number;
          description?: string;
          docker_image: string;
          exposes_jupyter?: boolean;
          id?: string;
          launch_hint?: string;
          min_vram_gb?: number;
          name: string;
          one_click?: boolean;
          slug: string;
          sort_order?: number;
        };
        Update: {
          blurb?: string;
          category?: string;
          default_auto_shutdown_minutes?: number;
          default_storage_gb?: number;
          description?: string;
          docker_image?: string;
          exposes_jupyter?: boolean;
          id?: string;
          launch_hint?: string;
          min_vram_gb?: number;
          name?: string;
          one_click?: boolean;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      ticket_messages: {
        Row: {
          author_role: string;
          body: string;
          created_at: string;
          id: string;
          ticket_id: string;
          user_id: string;
        };
        Insert: {
          author_role?: string;
          body: string;
          created_at?: string;
          id?: string;
          ticket_id: string;
          user_id: string;
        };
        Update: {
          author_role?: string;
          body?: string;
          created_at?: string;
          id?: string;
          ticket_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      volumes: {
        Row: {
          attached_instance_id: string | null;
          created_at: string;
          id: string;
          name: string;
          price_inr_per_gb_month_paise: number;
          region: string;
          size_gb: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attached_instance_id?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          price_inr_per_gb_month_paise?: number;
          region?: string;
          size_gb?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attached_instance_id?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          price_inr_per_gb_month_paise?: number;
          region?: string;
          size_gb?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "volumes_attached_instance_id_fkey";
            columns: ["attached_instance_id"];
            isOneToOne: false;
            referencedRelation: "instances";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_transactions: {
        Row: {
          amount_paise: number;
          balance_after_paise: number;
          created_at: string;
          description: string;
          id: string;
          kind: string;
          method: string;
          reference: string;
          user_id: string;
        };
        Insert: {
          amount_paise: number;
          balance_after_paise?: number;
          created_at?: string;
          description?: string;
          id?: string;
          kind: string;
          method?: string;
          reference?: string;
          user_id: string;
        };
        Update: {
          amount_paise?: number;
          balance_after_paise?: number;
          created_at?: string;
          description?: string;
          id?: string;
          kind?: string;
          method?: string;
          reference?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          balance_paise: number;
          created_at: string;
          low_balance_threshold_paise: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance_paise?: number;
          created_at?: string;
          low_balance_threshold_paise?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance_paise?: number;
          created_at?: string;
          low_balance_threshold_paise?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "user" | "provider" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "provider", "admin"],
    },
  },
} as const;
