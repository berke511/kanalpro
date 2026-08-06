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
      chat_messages: {
        Row: {
          body: string
          company_id: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
        }
        Insert: {
          body: string
          company_id: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Update: {
          body?: string
          company_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
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
      customer_properties: {
        Row: {
          city: string | null
          company_id: string
          country: string
          created_at: string
          customer_id: string
          id: string
          name: string
          notes: string | null
          postal_code: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_id: string
          country?: string
          created_at?: string
          customer_id: string
          id?: string
          name: string
          notes?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_id?: string
          country?: string
          created_at?: string
          customer_id?: string
          id?: string
          name?: string
          notes?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
          is_archived: boolean
          is_favorite: boolean
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
          is_archived?: boolean
          is_favorite?: boolean
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
          is_archived?: boolean
          is_favorite?: boolean
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
      employee_documents: {
        Row: {
          category: string
          company_id: string
          created_at: string
          employee_id: string
          expires_at: string | null
          file_name: string
          id: string
          reminder_sent_at: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          employee_id: string
          expires_at?: string | null
          file_name: string
          id?: string
          reminder_sent_at?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          employee_id?: string
          expires_at?: string | null
          file_name?: string
          id?: string
          reminder_sent_at?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_qualifications: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          expires_at: string | null
          id: string
          issued_date: string | null
          label: string | null
          notes: string | null
          qualification_type: string
          reminder_sent_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          expires_at?: string | null
          id?: string
          issued_date?: string | null
          label?: string | null
          notes?: string | null
          qualification_type: string
          reminder_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          expires_at?: string | null
          id?: string
          issued_date?: string | null
          label?: string | null
          notes?: string | null
          qualification_type?: string
          reminder_sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_qualifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_qualifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_qualifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_vehicle_history: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          company_id: string
          employee_id: string
          fleet_item_id: string
          id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          company_id: string
          employee_id: string
          fleet_item_id: string
          id?: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string
          employee_id?: string
          fleet_item_id?: string
          id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_vehicle_history_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vehicle_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vehicle_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vehicle_history_fleet_item_id_fkey"
            columns: ["fleet_item_id"]
            isOneToOne: false
            referencedRelation: "fleet_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_cost_entries: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          fleet_item_id: string
          id: string
          note: string | null
          occurred_at: string
        }
        Insert: {
          amount: number
          category: string
          company_id: string
          created_at?: string
          created_by?: string | null
          fleet_item_id: string
          id?: string
          note?: string | null
          occurred_at: string
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          fleet_item_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_cost_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_cost_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_cost_entries_fleet_item_id_fkey"
            columns: ["fleet_item_id"]
            isOneToOne: false
            referencedRelation: "fleet_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_documents: {
        Row: {
          category: string
          company_id: string
          created_at: string
          expires_at: string | null
          file_name: string
          fleet_item_id: string
          id: string
          reminder_sent_at: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          expires_at?: string | null
          file_name: string
          fleet_item_id: string
          id?: string
          reminder_sent_at?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          expires_at?: string | null
          file_name?: string
          fleet_item_id?: string
          id?: string
          reminder_sent_at?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_documents_fleet_item_id_fkey"
            columns: ["fleet_item_id"]
            isOneToOne: false
            referencedRelation: "fleet_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
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
          default_crew_size: number | null
          default_equipment: string | null
          fuel_type: string | null
          id: string
          insurance_due_date: string | null
          insurance_reminder_sent_at: string | null
          inventory_number: string | null
          is_archived: boolean
          kind: string
          last_maintenance_at: string | null
          leasing_end_date: string | null
          leasing_reminder_sent_at: string | null
          license_plate: string | null
          linked_vehicle_id: string | null
          location: string | null
          maintenance_reminder_sent_at: string | null
          manufacturer: string | null
          max_crew_size: number | null
          model: string | null
          name: string
          next_maintenance_at: string | null
          next_maintenance_note: string | null
          notes: string | null
          odometer_interval_km: number | null
          odometer_km: number | null
          operating_hours: number | null
          operating_hours_interval: number | null
          ownership: string | null
          photo_path: string | null
          service_area: string | null
          status: string
          tuv_due_date: string | null
          tuv_reminder_sent_at: string | null
          updated_at: string
          uvv_due_date: string | null
          uvv_reminder_sent_at: string | null
          year_built: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          default_crew_size?: number | null
          default_equipment?: string | null
          fuel_type?: string | null
          id?: string
          insurance_due_date?: string | null
          insurance_reminder_sent_at?: string | null
          inventory_number?: string | null
          is_archived?: boolean
          kind?: string
          last_maintenance_at?: string | null
          leasing_end_date?: string | null
          leasing_reminder_sent_at?: string | null
          license_plate?: string | null
          linked_vehicle_id?: string | null
          location?: string | null
          maintenance_reminder_sent_at?: string | null
          manufacturer?: string | null
          max_crew_size?: number | null
          model?: string | null
          name: string
          next_maintenance_at?: string | null
          next_maintenance_note?: string | null
          notes?: string | null
          odometer_interval_km?: number | null
          odometer_km?: number | null
          operating_hours?: number | null
          operating_hours_interval?: number | null
          ownership?: string | null
          photo_path?: string | null
          service_area?: string | null
          status?: string
          tuv_due_date?: string | null
          tuv_reminder_sent_at?: string | null
          updated_at?: string
          uvv_due_date?: string | null
          uvv_reminder_sent_at?: string | null
          year_built?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          default_crew_size?: number | null
          default_equipment?: string | null
          fuel_type?: string | null
          id?: string
          insurance_due_date?: string | null
          insurance_reminder_sent_at?: string | null
          inventory_number?: string | null
          is_archived?: boolean
          kind?: string
          last_maintenance_at?: string | null
          leasing_end_date?: string | null
          leasing_reminder_sent_at?: string | null
          license_plate?: string | null
          linked_vehicle_id?: string | null
          location?: string | null
          maintenance_reminder_sent_at?: string | null
          manufacturer?: string | null
          max_crew_size?: number | null
          model?: string | null
          name?: string
          next_maintenance_at?: string | null
          next_maintenance_note?: string | null
          notes?: string | null
          odometer_interval_km?: number | null
          odometer_km?: number | null
          operating_hours?: number | null
          operating_hours_interval?: number | null
          ownership?: string | null
          photo_path?: string | null
          service_area?: string | null
          status?: string
          tuv_due_date?: string | null
          tuv_reminder_sent_at?: string | null
          updated_at?: string
          uvv_due_date?: string | null
          uvv_reminder_sent_at?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_items_linked_vehicle_id_fkey"
            columns: ["linked_vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_maintenance_records: {
        Row: {
          company_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          fleet_item_id: string
          id: string
          odometer_km: number | null
          operating_hours: number | null
          performed_at: string
          performed_by: string | null
          record_type: string
        }
        Insert: {
          company_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fleet_item_id: string
          id?: string
          odometer_km?: number | null
          operating_hours?: number | null
          performed_at: string
          performed_by?: string | null
          record_type: string
        }
        Update: {
          company_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fleet_item_id?: string
          id?: string
          odometer_km?: number | null
          operating_hours?: number | null
          performed_at?: string
          performed_by?: string | null
          record_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_maintenance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_maintenance_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_maintenance_records_fleet_item_id_fkey"
            columns: ["fleet_item_id"]
            isOneToOne: false
            referencedRelation: "fleet_items"
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
      material_documents: {
        Row: {
          category: string
          company_id: string
          created_at: string
          file_name: string
          id: string
          material_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          file_name: string
          id?: string
          material_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          file_name?: string
          id?: string
          material_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_documents_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_locations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      material_movements: {
        Row: {
          company_id: string
          created_at: string
          from_location_id: string | null
          id: string
          material_id: string
          movement_type: string
          order_id: string | null
          performed_by: string | null
          quantity: number
          reason: string | null
          to_location_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          from_location_id?: string | null
          id?: string
          material_id: string
          movement_type: string
          order_id?: string | null
          performed_by?: string | null
          quantity: number
          reason?: string | null
          to_location_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          from_location_id?: string | null
          id?: string
          material_id?: string
          movement_type?: string
          order_id?: string | null
          performed_by?: string | null
          quantity?: number
          reason?: string | null
          to_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "material_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "material_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_number_counters: {
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
            foreignKeyName: "material_number_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      material_reservations: {
        Row: {
          company_id: string
          employee_id: string | null
          fleet_item_id: string | null
          id: string
          material_id: string
          note: string | null
          quantity: number
          released_at: string | null
          reserved_at: string
          reserved_by: string | null
          status: string
          target_type: string
        }
        Insert: {
          company_id: string
          employee_id?: string | null
          fleet_item_id?: string | null
          id?: string
          material_id: string
          note?: string | null
          quantity: number
          released_at?: string | null
          reserved_at?: string
          reserved_by?: string | null
          status?: string
          target_type: string
        }
        Update: {
          company_id?: string
          employee_id?: string | null
          fleet_item_id?: string | null
          id?: string
          material_id?: string
          note?: string | null
          quantity?: number
          released_at?: string | null
          reserved_at?: string
          reserved_by?: string | null
          status?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_fleet_item_id_fkey"
            columns: ["fleet_item_id"]
            isOneToOne: false
            referencedRelation: "fleet_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_reserved_by_fkey"
            columns: ["reserved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          id: string
          is_archived: boolean
          last_ordered_at: string | null
          location_id: string | null
          low_stock_reminder_sent_at: string | null
          material_number: string | null
          min_quantity: number | null
          name: string
          notes: string | null
          photo_path: string | null
          purchase_price: number | null
          qr_code: string | null
          quantity: number
          status: string
          supplier_contact_name: string | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_phone: string | null
          tax_rate: number | null
          unit: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          last_ordered_at?: string | null
          location_id?: string | null
          low_stock_reminder_sent_at?: string | null
          material_number?: string | null
          min_quantity?: number | null
          name: string
          notes?: string | null
          photo_path?: string | null
          purchase_price?: number | null
          qr_code?: string | null
          quantity?: number
          status?: string
          supplier_contact_name?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          tax_rate?: number | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          last_ordered_at?: string | null
          location_id?: string | null
          low_stock_reminder_sent_at?: string | null
          material_number?: string | null
          min_quantity?: number | null
          name?: string
          notes?: string | null
          photo_path?: string | null
          purchase_price?: number | null
          qr_code?: string | null
          quantity?: number
          status?: string
          supplier_contact_name?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          tax_rate?: number | null
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
          {
            foreignKeyName: "materials_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "material_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          company_id: string
          employee_id: string
          id: string
          order_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          company_id: string
          employee_id: string
          id?: string
          order_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string
          employee_id?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string
          id: string
          order_id: string | null
          order_label: string | null
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          order_label?: string | null
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          order_label?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_documents: {
        Row: {
          category: string
          company_id: string
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          order_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          company_id: string
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          order_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          company_id?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          order_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_materials: {
        Row: {
          added_by: string | null
          company_id: string
          consumed_at: string | null
          created_at: string
          id: string
          material_id: string
          order_id: string
          quantity: number
          reserved_at: string
          status: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          company_id: string
          consumed_at?: string | null
          created_at?: string
          id?: string
          material_id: string
          order_id: string
          quantity?: number
          reserved_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          company_id?: string
          consumed_at?: string | null
          created_at?: string
          id?: string
          material_id?: string
          order_id?: string
          quantity?: number
          reserved_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_materials_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_materials_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_number_counters: {
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
            foreignKeyName: "order_number_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_resources: {
        Row: {
          assigned_at: string
          company_id: string
          fleet_item_id: string
          id: string
          order_id: string
        }
        Insert: {
          assigned_at?: string
          company_id: string
          fleet_item_id: string
          id?: string
          order_id: string
        }
        Update: {
          assigned_at?: string
          company_id?: string
          fleet_item_id?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_resources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_resources_fleet_item_id_fkey"
            columns: ["fleet_item_id"]
            isOneToOne: false
            referencedRelation: "fleet_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_resources_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_info: string | null
          all_day: boolean
          arrival_info: string | null
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          dispatcher_id: string | null
          documentation_completed_at: string | null
          id: string
          internal_notes: string | null
          is_archived: boolean
          is_favorite: boolean
          is_recurring: boolean
          onsite_contact: string | null
          order_kind: string
          order_number: string | null
          order_value: number | null
          planned_duration_minutes: number | null
          priority: string
          property_id: string | null
          recurrence_rule: string | null
          resources_assigned_at: string | null
          safety_notes: string | null
          scheduled_date: string | null
          service_type: string | null
          start_time: string | null
          started_at: string | null
          status: string
          time_window_end: string | null
          time_window_start: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_info?: string | null
          all_day?: boolean
          arrival_info?: string | null
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          dispatcher_id?: string | null
          documentation_completed_at?: string | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean
          is_favorite?: boolean
          is_recurring?: boolean
          onsite_contact?: string | null
          order_kind?: string
          order_number?: string | null
          order_value?: number | null
          planned_duration_minutes?: number | null
          priority?: string
          property_id?: string | null
          recurrence_rule?: string | null
          resources_assigned_at?: string | null
          safety_notes?: string | null
          scheduled_date?: string | null
          service_type?: string | null
          start_time?: string | null
          started_at?: string | null
          status?: string
          time_window_end?: string | null
          time_window_start?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_info?: string | null
          all_day?: boolean
          arrival_info?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          dispatcher_id?: string | null
          documentation_completed_at?: string | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean
          is_favorite?: boolean
          is_recurring?: boolean
          onsite_contact?: string | null
          order_kind?: string
          order_number?: string | null
          order_value?: number | null
          planned_duration_minutes?: number | null
          priority?: string
          property_id?: string | null
          recurrence_rule?: string | null
          resources_assigned_at?: string | null
          safety_notes?: string | null
          scheduled_date?: string | null
          service_type?: string | null
          start_time?: string | null
          started_at?: string | null
          status?: string
          time_window_end?: string | null
          time_window_start?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
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
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_dispatcher_id_fkey"
            columns: ["dispatcher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "customer_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          city: string | null
          company_id: string
          created_at: string
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          is_archived: boolean
          location: string | null
          main_vehicle_id: string | null
          notes: string | null
          overtime_hours: number
          personnel_number: string | null
          phone: string | null
          photo_path: string | null
          postal_code: string | null
          role: string
          sick_days_current_year: number
          status: string
          street: string | null
          updated_at: string
          vacation_days_total: number
          vacation_days_used: number
          weekly_hours: number | null
          work_time_model: string
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          hire_date?: string | null
          id: string
          is_archived?: boolean
          location?: string | null
          main_vehicle_id?: string | null
          notes?: string | null
          overtime_hours?: number
          personnel_number?: string | null
          phone?: string | null
          photo_path?: string | null
          postal_code?: string | null
          role?: string
          sick_days_current_year?: number
          status?: string
          street?: string | null
          updated_at?: string
          vacation_days_total?: number
          vacation_days_used?: number
          weekly_hours?: number | null
          work_time_model?: string
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          is_archived?: boolean
          location?: string | null
          main_vehicle_id?: string | null
          notes?: string | null
          overtime_hours?: number
          personnel_number?: string | null
          phone?: string | null
          photo_path?: string | null
          postal_code?: string | null
          role?: string
          sick_days_current_year?: number
          status?: string
          street?: string | null
          updated_at?: string
          vacation_days_total?: number
          vacation_days_used?: number
          weekly_hours?: number | null
          work_time_model?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_main_vehicle_id_fkey"
            columns: ["main_vehicle_id"]
            isOneToOne: false
            referencedRelation: "fleet_items"
            referencedColumns: ["id"]
          },
        ]
      }
      report_employees: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          report_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          report_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_employees_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string
          id: string
          report_id: string | null
          report_label: string | null
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          report_id?: string | null
          report_label?: string | null
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          report_id?: string | null
          report_label?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_machines: {
        Row: {
          company_id: string
          created_at: string
          fleet_item_id: string
          id: string
          report_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          fleet_item_id: string
          id?: string
          report_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          fleet_item_id?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_machines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_machines_fleet_item_id_fkey"
            columns: ["fleet_item_id"]
            isOneToOne: false
            referencedRelation: "fleet_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_machines_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_materials: {
        Row: {
          company_id: string
          consumed_at: string | null
          created_at: string
          id: string
          material_id: string
          quantity: number
          report_id: string
          unit_price: number | null
        }
        Insert: {
          company_id: string
          consumed_at?: string | null
          created_at?: string
          id?: string
          material_id: string
          quantity: number
          report_id: string
          unit_price?: number | null
        }
        Update: {
          company_id?: string
          consumed_at?: string | null
          created_at?: string
          id?: string
          material_id?: string
          quantity?: number
          report_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_materials_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_number_counters: {
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
            foreignKeyName: "report_number_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_photos: {
        Row: {
          category: string
          company_id: string
          created_at: string
          file_name: string
          id: string
          report_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          file_name: string
          id?: string
          report_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          file_name?: string
          id?: string
          report_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "service_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reports: {
        Row: {
          archived_at: string | null
          break_minutes: number | null
          client_submit_token: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_signature_name: string | null
          customer_signature_path: string | null
          customer_signature_role: string | null
          email_sent_at: string | null
          end_time: string | null
          gps_lat: number | null
          gps_lng: number | null
          hours_worked: number | null
          id: string
          internal_notes: string | null
          invoice_prepared_at: string | null
          is_archived: boolean
          materials_notes: string | null
          order_id: string
          pdf_generated_at: string | null
          report_date: string
          report_number: string | null
          signed_at: string | null
          start_time: string | null
          status: string
          updated_at: string
          weather: string | null
          work_performed: string
          work_types: string[] | null
        }
        Insert: {
          archived_at?: string | null
          break_minutes?: number | null
          client_submit_token?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_signature_name?: string | null
          customer_signature_path?: string | null
          customer_signature_role?: string | null
          email_sent_at?: string | null
          end_time?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          hours_worked?: number | null
          id?: string
          internal_notes?: string | null
          invoice_prepared_at?: string | null
          is_archived?: boolean
          materials_notes?: string | null
          order_id: string
          pdf_generated_at?: string | null
          report_date?: string
          report_number?: string | null
          signed_at?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
          weather?: string | null
          work_performed: string
          work_types?: string[] | null
        }
        Update: {
          archived_at?: string | null
          break_minutes?: number | null
          client_submit_token?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_signature_name?: string | null
          customer_signature_path?: string | null
          customer_signature_role?: string | null
          email_sent_at?: string | null
          end_time?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          hours_worked?: number | null
          id?: string
          internal_notes?: string | null
          invoice_prepared_at?: string | null
          is_archived?: boolean
          materials_notes?: string | null
          order_id?: string
          pdf_generated_at?: string | null
          report_date?: string
          report_number?: string | null
          signed_at?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
          weather?: string | null
          work_performed?: string
          work_types?: string[] | null
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
            foreignKeyName: "service_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
          birth_date: string | null
          city: string | null
          company_id: string
          created_at: string
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          is_archived: boolean
          location: string | null
          main_vehicle_id: string | null
          notes: string | null
          overtime_hours: number
          personnel_number: string | null
          phone: string | null
          photo_path: string | null
          postal_code: string | null
          role: string
          sick_days_current_year: number
          status: string
          street: string | null
          updated_at: string
          vacation_days_total: number
          vacation_days_used: number
          weekly_hours: number | null
          work_time_model: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bootstrap_company_and_profile: {
        Args: { p_company_name: string; p_full_name: string }
        Returns: {
          birth_date: string | null
          city: string | null
          company_id: string
          created_at: string
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          is_archived: boolean
          location: string | null
          main_vehicle_id: string | null
          notes: string | null
          overtime_hours: number
          personnel_number: string | null
          phone: string | null
          photo_path: string | null
          postal_code: string | null
          role: string
          sick_days_current_year: number
          status: string
          street: string | null
          updated_at: string
          vacation_days_total: number
          vacation_days_used: number
          weekly_hours: number | null
          work_time_model: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_edit_order: { Args: { p_order_id: string }; Returns: boolean }
      can_view_order: { Args: { p_order_id: string }; Returns: boolean }
      current_company_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      next_customer_number: { Args: { p_company_id: string }; Returns: string }
      next_material_number: { Args: { p_company_id: string }; Returns: string }
      next_order_number: { Args: { p_company_id: string }; Returns: string }
      next_report_number: { Args: { p_company_id: string }; Returns: string }
      sync_expiry_reminders: { Args: { p_company_id: string }; Returns: number }
      sync_fleet_reminders: { Args: { p_company_id: string }; Returns: number }
      sync_low_stock_reminders: {
        Args: { p_company_id: string }
        Returns: number
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
