// Set in .env.local (see .env.local.example). Until these exist, the app runs in guest-only mode.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
