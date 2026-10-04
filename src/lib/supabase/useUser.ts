"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./client";

export interface UserState {
  user: User | null;
  /** The chosen username from `profiles`, or null if the account has none yet. */
  username: string | null;
  /** The profile photo as a small data URL, or null if none is set. */
  avatarUrl: string | null;
  /** True until the initial session (and, if signed in, profile) check resolves. */
  loading: boolean;
  /** False if no Supabase project has been configured yet. */
  configured: boolean;
}

const profileChangeListeners = new Set<() => void>();

/**
 * Call after creating/changing the signed-in user's profile (username or photo) somewhere other than a
 * fresh sign-in — every `useUser()` instance fetches independently, so without this, other places showing
 * the profile (like the header) wouldn't notice until the next auth event.
 */
export function notifyProfileChanged() {
  profileChangeListeners.forEach((fn) => fn());
}

export function useUser(): UserState {
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    let currentUserId: string | null = null;

    const loadProfile = async (userId: string) => {
      const full = await supabase.from("profiles").select("username, avatar_url").eq("id", userId).maybeSingle();
      // Before the avatar column exists (schema.sql not re-run yet) that select fails; fall back to the
      // username alone so a missing column can't make a signed-in user look like they have no username.
      const row: { username?: string; avatar_url?: string | null } | null = full.error
        ? (await supabase.from("profiles").select("username").eq("id", userId).maybeSingle()).data
        : full.data;
      if (cancelled) return;
      setUsername(row?.username ?? null);
      setAvatarUrl(row?.avatar_url ?? null);
    };

    const applyUser = async (nextUser: User | null) => {
      if (cancelled) return;
      setUser(nextUser);
      currentUserId = nextUser?.id ?? null;
      if (nextUser) {
        await loadProfile(nextUser.id);
      } else {
        setUsername(null);
        setAvatarUrl(null);
      }
      if (!cancelled) setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => applyUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => applyUser(session?.user ?? null));

    const onProfileChanged = () => {
      if (currentUserId) loadProfile(currentUserId);
    };
    profileChangeListeners.add(onProfileChanged);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      profileChangeListeners.delete(onProfileChanged);
    };
  }, [supabase]);

  return { user, username, avatarUrl, loading, configured: !!supabase };
}
