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

export type UsernameChange = "ok" | "taken" | "error";

/** Changes the username on an existing profile. "taken" means the unique constraint rejected it. */
export async function setUsername(userId: string, username: string): Promise<UsernameChange> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return "error";
  const { data, error } = await supabase.from("profiles").update({ username }).eq("id", userId).select("id");
  if (error) return error.code === "23505" ? "taken" : "error";
  // An update that matched no row (no profile yet) isn't an error to Supabase, but it isn't a success either.
  return data && data.length > 0 ? "ok" : "error";
}

/** Saves or clears (null) the profile photo. Returns false if it couldn't be saved, e.g. the column is missing. */
export async function saveAvatar(userId: string, avatarUrl: string | null): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { data, error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId).select("id");
  return !error && !!data && data.length > 0;
}

/** Sets a username for an account that doesn't have one yet (e.g. created before profiles existed). */
export async function claimUsername(userId: string, username: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { error: "not configured" };
  const { error } = await supabase.from("profiles").insert({ id: userId, username });
  return { error: error ? error.message : null };
}
