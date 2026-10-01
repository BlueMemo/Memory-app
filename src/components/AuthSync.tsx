"use client";

import { useEffect } from "react";
import { setActiveUserForLibrary } from "@/lib/library";
import { setActiveUserForDeckOverrides } from "@/lib/deckOverrides";
import { setActiveUserForPracticeResults } from "@/lib/practiceResults";
import { setActiveUserForSrs } from "@/lib/srs/store";
import { useUser } from "@/lib/supabase/useUser";
import { setActiveUserForDecks } from "@/lib/userDecks";

/** Mounted once in SiteHeader: the single place that tells the data layer who's signed in. */
export function AuthSync() {
  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) return;
    const id = user?.id ?? null;
    setActiveUserForDecks(id);
    setActiveUserForLibrary(id);
    setActiveUserForPracticeResults(id);
    setActiveUserForSrs(id);
    setActiveUserForDeckOverrides(id);
  }, [user, loading]);

  return null;
}
