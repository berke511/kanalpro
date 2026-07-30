export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string | null
          company_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          kind: string
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          company_id: string
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          id: string
          company_id: string
          customer_id: string | null
          assigned_to: string | null
          title: string
          description: string | null
          status: string
          scheduled_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_id?: string | null
          assigned_to?: string | null
          title: string
          description?: string | null
          status?: string
          scheduled_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          customer_id?: string | null
          assigned_to?: string | null
          title?: string
          description?: string | null
          status?: string
          scheduled_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_items: {
        Row: {
          id: string
          company_id: string
          kind: string
          name: string
          license_plate: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          kind?: string
          name: string
          license_plate?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          kind?: string
          name?: string
          license_plate?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          id: string
          company_id: string
          name: string
          unit: string
          quantity: number
          min_quantity: number | null
          unit_price: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          unit?: string
          quantity?: number
          min_quantity?: number | null
          unit_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          unit?: string
          quantity?: number
          min_quantity?: number | null
          unit_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reports: {
        Row: {
          id: string
          company_id: string
          order_id: string
          report_date: string
          work_performed: string
          hours_worked: number | null
          materials_notes: string | null
          customer_signature_name: string | null
          signed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          order_id: string
          report_date?: string
          work_performed: string
          hours_worked?: number | null
          materials_notes?: string | null
          customer_signature_name?: string | null
          signed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          order_id?: string
          report_date?: string
          work_performed?: string
          hours_worked?: number | null
          materials_notes?: string | null
          customer_signature_name?: string | null
          signed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invites: {
        Row: {
          id: string
          company_id: string
          token: string
          role: string
          created_by: string | null
          created_at: string
          accepted_at: string | null
          accepted_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          token?: string
          role?: string
          created_by?: string | null
          created_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          token?: string
          role?: string
          created_by?: string | null
          created_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      bootstrap_company_and_profile: {
        Args: { p_company_name: string; p_full_name: string }
        Returns: {
          company_id: string
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
      }
      accept_company_invite: {
        Args: { p_token: string; p_full_name: string }
        Returns: {
          company_id: string
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
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

// Note: this file originally also exported generic Supabase-CLI-style
// helper types (Tables<>, TablesInsert<>, TablesUpdate<>, Enums<>,
// CompositeTypes<>, Constants) generated by `supabase gen types`. None of
// them were ever imported anywhere in this project — only the `Database`
// type itself is used (e.g. `Database["public"]["Tables"]["profiles"]["Row"]`
// in profile.ts/client.ts/server.ts/proxy.ts) — so they were removed to
// keep this file small and simple.
