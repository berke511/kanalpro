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
      company_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          customer_label: string | null
          id: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string
          customer_id?: string | null
          customer_label?: string | null
          id?: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_label?: string | null
          id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string
          content_type: string | null
          created_at: string
          customer_id: string
          file_name: string
          id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          content_type?: string | null
          created_at?: string
          customer_id: string
          file_name: string
          id?: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          content_type?: string | null
          created_at?: string
          customer_id?: string
          file_name?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          author_id: string | null
          company_id: string
          created_at: string
          customer_id: string
          id: string
          note: string
        }
        Insert: {
          author_id?: string | null
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          note: string
        }
        Update: {
          author_id?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      customers: {
        Row: {
          assigned_employee_id: string | null
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
          assigned_employee_id?: string | null
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
          assigned_employee_id?: string | null
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
            foreignKeyName: "customers_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_items: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kind: string
          license_plate: string | null
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          kind?: string
          license_plate?: string | null
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          license_plate?: string | null
          name?: string
          notes?: string | null
          status?: string
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
      invoice_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string
          kind: string
          notes: string | null
          order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string
          kind?: string
          notes?: string | null
          order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string
          kind?: string
          notes?: string | null
          order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      materials: {
        Row: {
          company_id: string
          created_at: string
          id: string
          min_quantity: number | null
          name: string
          notes: string | null
          quantity: number
          unit: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          min_quantity?: number | null
          name: string
          notes?: string | null
          quantity?: number
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          min_quantity?: number | null
          name?: string
          notes?: string | null
          quantity?: number
          unit?: string
          unit_price?: number | null
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
      orders: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
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
      service_reports: {
        Row: {
          company_id: string
          created_at: string
          customer_signature_name: string | null
          hours_worked: number | null
          id: string
          materials_notes: string | null
          order_id: string
          report_date: string
          signed_at: string | null
          updated_at: string
          work_performed: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_signature_name?: string | null
          hours_worked?: number | null
          id?: string
          materials_notes?: string | null
          order_id: string
          report_date?: string
          signed_at?: string | null
          updated_at?: string
          work_performed: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_signature_name?: string | null
          hours_worked?: number | null
          id?: string
          materials_notes?: string | null
          order_id?: string
          report_date?: string
          signed_at?: string | null
          updated_at?: string
          work_performed?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_company_invite: {
        Args: { p_full_name: string; p_token: string }
        Returns: {
          company_id: string
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
      }
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
      current_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
