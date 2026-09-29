import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from "./config";

/** The server Supabase client, or null if no project is configured yet. */
export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, where cookies can't be written.
          // Harmless as long as proxy.ts is refreshing the session on every request.
        }
      },
    },
  });
}
