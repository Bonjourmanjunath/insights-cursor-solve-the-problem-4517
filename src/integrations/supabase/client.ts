import { createClient } from '@supabase/supabase-js';

// Hardcoded working credentials - no environment variables to avoid crashes
const SUPABASE_URL = "https://lgxqviomumjiqljpnvuh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHF2aW9tdW1qaXFsanBudnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjcyNDUsImV4cCI6MjA2NDM0MzI0NX0.uXOtmvQfYSpVFzbAP9kEym4Em8qtKO-y0y4J0fDEggw";

console.log('🔧 Supabase client initializing with:', {
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_ANON_KEY
});

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: false, // Disable session persistence to avoid crashes
    autoRefreshToken: false, // Disable auto refresh to avoid crashes
    detectSessionInUrl: false, // Disable URL detection to avoid crashes
  },
  realtime: {
    params: {
      eventsPerSecond: 1 // Reduce to minimum to avoid overload
    }
  },
  db: {
    schema: 'public'
  }
});

// Test connection safely
if (typeof window !== 'undefined') {
  console.log('✅ Supabase client created successfully');
}