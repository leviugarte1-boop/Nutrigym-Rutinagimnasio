// Since supabase is loaded via script tag, we need to access it from the window object
// and tell TypeScript about it.

// Minimal Supabase Client interface to satisfy TypeScript
interface SupabaseClient {
  auth: {
    getSession(): Promise<{ data: { session: any | null }, error: any | null }>;
    onAuthStateChange(callback: (event: string, session: any | null) => void): { data: { subscription: { unsubscribe: () => void } } };
    signInWithPassword(credentials: object): Promise<{ error: any | null }>;
    signOut(): Promise<{ error: any | null }>;
  };
  from(table: string): any;
}

declare global {
  interface Window {
    supabase: {
      createClient: (url: string, key: string) => SupabaseClient;
    };
  }
}

const supabaseUrl = 'https://quwgheldlxnihkbpefjg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1d2doZWxkbHhuaWhrYnBlZmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjg1NjMsImV4cCI6MjA2ODk0NDU2M30.aAR7LN6Aj0-IlKyeiDAuLzpzG_83EZJ7WP8DO6BDnz0';

export const supabase = typeof window !== 'undefined' && window.supabase
  ? window.supabase.createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
    console.error("Supabase client could not be initialized. Make sure the Supabase script is loaded in index.html.");
}
