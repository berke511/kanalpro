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
          billing_city: string | null
          billing_postal_code: string | null
          billing_same_as_main: boolean
          billing_street: string | null
          city: string | null
          company_id: string
          company_name: string | null
          contact_person: string | null
          country: string
          created_at: string
          created_by: string | null
          customer_number: string | null
          debitor_number: string | null
          discount_days: number | null
          discount_percent: number | null
          email: string | null
          fax: string | null
          first_name: string | null
          id: string
          kind: string
          last_name: string | null
          latitude: number | null
          legal_form: string | null
          longitude: number | null
          mobile: string | null
          name: string
          notes: string | null
          payment_term_days: number | null
          phone: string | null
          postal_code: string | null
          register_number: string | null
          service_city: string | null
          service_postal_code: string | null
          service_same_as_main: boolean
          service_street: string | null
          status: string
          street: string | null
          tags: string[]
          updated_at: string
          updated_by: string | null
          vat_id: string | null
          website: string | null
        }
        Insert: {
          billing_city?: string | null
          billing_postal_code?: string | null
          billing_same_as_main?: boolean
          billing_street?: string | null
          city?: string | null
          company_id: string
          company_name?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          customer_number?: string | null
          debitor_number?: string | null
          discount_days?: number | null
          discount_percent?: number | null
          email?: string | null
          fax?: string | null
          first_name?: string | null
          id?: string
          kind?: string
          last_name?: string | null
          latitude?: number | null
          legal_form?: string | null
          longitude?: number | null
          mobile?: string | null
          name: string
          notes?: string | null
          payment_term_days?: number | null
          phone?: string | null
          postal_code?: string | null
          register_number?: string | null
          service_city?: string | null
          service_postal_code?: string | null
          service_same_as_main?: boolean
          service_street?: string | null
          status?: string
          street?: string | null
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          vat_id?: string | null
          website?: string | null
        }
        Update: {
          billing_city?: string | null
          billing_postal_code?: string | null
          billing_same_as_main?: boolean
          billing_street?: string | null
          city?: string | null
          company_id?: string
          company_name?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          customer_number?: string | null
          debitor_number?: string | null
          discount_days?: number | null
          discount_percent?: number | null
          email?: string | null
          fax?: string | null
          first_name?: string | null
          id?: string
          kind?: string
          last_name?: string | null
          latitude?: number | null
          legal_form?: string | null
          longitude?: number | null
          mobile?: string | null
          name?: string
          notes?: string | null
          payment_term_days?: number | null
          phone?: string | null
          postal_code?: string | null
          register_number?: string | null
          service_city?: string | null
          service_postal_code?: string | null
          service_same_as_main?: boolean
          service_street?: string | null
          status?: string
          street?: string | null
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          vat_id?: string | null
          website?: string | null
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
      customer_number_counters: {
        Row: {
          company_id: string
          next_number: number
        }
        Insert: {
          company_id: string
          next_number?: number
        }
        Update: {
          company_id?: string
          next_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_number_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          id: string
          company_id: string
          customer_id: string
          name: string
          role: string | null
          phone: string | null
          email: string | null
          is_primary: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_id: string
          name: string
          role?: string | null
          phone?: string | null
          email?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          customer_id?: string
          name?: string
          role?: string | null
          phone?: string | null
          email?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          id: string
          company_id: string
          customer_id: string
          file_name: string
          storage_path: string
          content_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_id: string
          file_name: string
          storage_path: string
          content_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          customer_id?: string
          file_name?: string
          storage_path?: string
          content_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          id: string
          company_id: string
          customer_id: string
          author_id: string | null
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_id: string
          author_id?: string | null
          note: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          customer_id?: string
          author_id?: string | null
          note?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_audit_log: {
        Row: {
          id: string
          company_id: string
          customer_id: string | null
          customer_label: string | null
          actor_id: string | null
          action: string
          summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_id?: string | null
          customer_label?: string | null
          actor_id?: string | null
          action: string
          summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          customer_id?: string | null
          customer_label?: string | null
          actor_id?: string | null
          action?: string
          summary?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      invoices: {
        Row: {
          id: string
          company_id: string
          customer_id: string | null
          order_id: string | null
          kind: string
          invoice_number: string | null
          status: string
          issue_date: string
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_id?: string | null
          order_id?: string | null
          kind?: string
          invoice_number?: string | null
          status?: string
          issue_date?: string
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          customer_id?: string | null
          order_id?: string | null
          kind?: string
          invoice_number?: string | null
          status?: string
          issue_date?: string
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          id: string
          company_id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price?: number
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          position?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      next_customer_number: {
        Args: { p_company_id: string }
        Returns: string
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
