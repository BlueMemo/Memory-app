"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./client";

export interface UserState {
  user: User | null;
  /** The chosen username from `profiles`, or null if the account has none yet. */
  username: string | null;
  /** True until the initial session (and, if signed in, profile) check resolves. */
  loading: boolean;
  /** False if no Supabase project has been configured yet. */
  configured: boolean;
}

const usernameChangeListeners = new Set<() => void>();

/**
 * Call after creating/changing the signed-in user's username somewhere other than a fresh sign-in
 * (e.g. the "choose a username" form) — every `useUser()` instance fetches independently, so without
 * this, other places showing the username (like the header) wouldn't notice until the next auth event.
 */
export function notifyUsernameChanged() {
  usernameChangeListeners.forEach((fn) => fn());
}

export function useUser(): UserState {
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    let currentUserId: string | null = null;

    const loadUsername = async (userId: string) => {
      const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
      if (!cancelled) setUsername(data?.username ?? null);
    };

    const applyUser = async (nextUser: User | null) => {
      if (cancelled) return;
      setUser(nextUser);
      currentUserId = nextUser?.id ?? null;
      if (nextUser) await loadUsername(nextUser.id);
      else setUsername(null);
      if (!cancelled) setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => applyUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => applyUser(session?.user ?? null));

    const onUsernameChanged = () => {
      if (currentUserId) loadUsername(currentUserId);
    };
    usernameChangeListeners.add(onUsernameChanged);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      usernameChangeListeners.delete(onUsernameChanged);
    };
  }, [supabase]);

  return { user, username, loading, configured: !!supabase };
}
