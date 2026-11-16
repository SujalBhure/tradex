import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          side: 'long' | 'short';
          lots: number;
          quantity: number;
          entry_price: number;
          exit_price: number | null;
          leverage: number;
          capital_used: number;
          margin: number;
          fees: number;
          gross_pnl: number | null;
          net_pnl: number | null;
          roi: number | null;
          stop_loss: number | null;
          target: number | null;
          status: 'open' | 'closed';
          notes: string | null;
          tags: string[] | null;
          opened_at: string;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          side: 'long' | 'short';
          lots: number;
          quantity: number;
          entry_price: number;
          exit_price?: number | null;
          leverage: number;
          capital_used: number;
          margin: number;
          fees?: number;
          gross_pnl?: number | null;
          net_pnl?: number | null;
          roi?: number | null;
          stop_loss?: number | null;
          target?: number | null;
          status?: 'open' | 'closed';
          notes?: string | null;
          tags?: string[] | null;
          opened_at?: string;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          side?: 'long' | 'short';
          lots?: number;
          quantity?: number;
          entry_price?: number;
          exit_price?: number | null;
          leverage?: number;
          capital_used?: number;
          margin?: number;
          fees?: number;
          gross_pnl?: number | null;
          net_pnl?: number | null;
          roi?: number | null;
          stop_loss?: number | null;
          target?: number | null;
          status?: 'open' | 'closed';
          notes?: string | null;
          tags?: string[] | null;
          opened_at?: string;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trading_capital: {
        Row: {
          id: string;
          user_id: string;
          total: number;
          available: number;
          used: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total?: number;
          available?: number;
          used?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total?: number;
          available?: number;
          used?: number;
          updated_at?: string;
        };
      };
      trading_notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string;
          content: string;
          symbol: string | null;
          tags: string[] | null;
          is_pinned: boolean;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category: string;
          content: string;
          symbol?: string | null;
          tags?: string[] | null;
          is_pinned?: boolean;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          category?: string;
          content?: string;
          symbol?: string | null;
          tags?: string[] | null;
          is_pinned?: boolean;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      knowledge_items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string;
          content: string | null;
          description: string | null;
          key_rules: string[] | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category: string;
          content?: string | null;
          description?: string | null;
          key_rules?: string[] | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          category?: string;
          content?: string | null;
          description?: string | null;
          key_rules?: string[] | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          suggestions: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          suggestions?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          suggestions?: string[] | null;
          created_at?: string;
        };
      };
    };
  };
};

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://jmzeyenglyynkwxjdrow.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xrcWX0nO_sW6i9JbjUVafA_7qwcSVLn';

let supabaseInstance: SupabaseClient<Database> | null = null;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('YOUR_')) {
    try {
        new URL(supabaseUrl); 
        // Reverting the previous fix. Let supabase-js handle the fetch implementation.
        supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
    } catch (e) {
        console.error(
            'Invalid Supabase URL. Please check your VITE_SUPABASE_URL in the .env file. It should be a full URL starting with https://'
        );
    }
} else {
    console.error(
        'Supabase environment variables are not set correctly. Please make sure your .env file has the correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
}

export const supabase = supabaseInstance;
