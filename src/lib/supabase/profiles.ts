"use client";

import { getSupabaseBrowserClient } from "./client";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export type UsernameCheck = "available" | "taken" | "error";

/** "error" means the check itself failed (e.g. the profiles table isn't reachable) — distinct from a
 * genuine collision, so callers can show "something went wrong" instead of the misleading "taken". */
export async function checkUsername(username: string): Promise<UsernameCheck> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return "error";
  const { data, error } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (error) return "error";
  return data ? "taken" : "available";
}

/** Sets a username for an account that doesn't have one yet (e.g. created before profiles existed). */
export async function claimUsername(userId: string, username: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "not configured" };
  const { error } = await supabase.from("profiles").insert({ id: userId, username });
  return { error: error ? error.message : null };
}
