"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./client";

export interface UserState {
  user: User | null;
  /** True until the initial session check resolves. */
  loading: boolean;
  /** False if no Supabase project has been configured yet. */
  configured: boolean;
}

export function useUser(): UserState {
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, loading, configured: !!supabase };
}
