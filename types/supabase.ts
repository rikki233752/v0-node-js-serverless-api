export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          company: string | null
          phone_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          company?: string | null
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          company?: string | null
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pathways: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          nodes: Json | null
          edges: Json | null
          created_at: string
          updated_at: string
          bland_pathway_id: string | null
          is_published: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          nodes?: Json | null
          edges?: Json | null
          created_at?: string
          updated_at?: string
          bland_pathway_id?: string | null
          is_published?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          nodes?: Json | null
          edges?: Json | null
          created_at?: string
          updated_at?: string
          bland_pathway_id?: string | null
          is_published?: boolean
        }
      }
      phone_numbers: {
        Row: {
          id: string
          user_id: string
          number: string
          location: string | null
          type: string | null
          status: string
          purchased_at: string
          monthly_fee: number
          pathway_id: string | null
          bland_number_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          number: string
          location?: string | null
          type?: string | null
          status?: string
          purchased_at?: string
          monthly_fee?: number
          pathway_id?: string | null
          bland_number_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          number?: string
          location?: string | null
          type?: string | null
          status?: string
          purchased_at?: string
          monthly_fee?: number
          pathway_id?: string | null
          bland_number_id?: string | null
        }
      }
      calls: {
        Row: {
          id: string
          user_id: string
          pathway_id: string | null
          phone_number_id: string | null
          to_number: string | null
          from_number: string | null
          duration: number
          status: string | null
          start_time: string
          bland_call_id: string | null
          transcript: string | null
          summary: string | null
          sentiment: string | null
        }
        Insert: {
          id?: string
          user_id: string
          pathway_id?: string | null
          phone_number_id?: string | null
          to_number?: string | null
          from_number?: string | null
          duration?: number
          status?: string | null
          start_time?: string
          bland_call_id?: string | null
          transcript?: string | null
          summary?: string | null
          sentiment?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          pathway_id?: string | null
          phone_number_id?: string | null
          to_number?: string | null
          from_number?: string | null
          duration?: number
          status?: string | null
          start_time?: string
          bland_call_id?: string | null
          transcript?: string | null
          summary?: string | null
          sentiment?: string | null
        }
      }
    }
  }
}
