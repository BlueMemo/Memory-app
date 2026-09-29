"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from "./config";

let client: SupabaseClient | null = null;

/** The browser Supabase client, or null if no project is configured yet (guest mode only). */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  client ??= createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  return client;
}
