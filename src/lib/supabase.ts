import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // SECURITY: disable browser persistence to avoid storing auth tokens in localStorage/sessionStorage.
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // FLAGGED: full httpOnly cookie auth requires a server-side auth callback/session exchange (not yet implemented here).
  },
});

// Security checklist for this code:
// - Disabled token persistence in local/session storage.
// - Kept anon key only on client (public key, not service-role secret).
// - FLAGGED: full httpOnly cookie session model requires server auth callback/session exchange.
