"use client";

import { useEffect } from "react";
import { useI18n } from "@/i18n";
import { setActiveUserForLibrary } from "@/lib/library";
import { setActiveUserForOnboarding } from "@/lib/onboarding";
import { setActiveUserForDeckOverrides } from "@/lib/deckOverrides";
import { setActiveUserForPracticeResults } from "@/lib/practiceResults";
import { maybeAutoOptimize } from "@/lib/srs/optimize";
import { setActiveUserForSrs, useSrsData, useSrsStatus } from "@/lib/srs/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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
    void setActiveUserForOnboarding(id);
  }, [user, loading]);

  // Background FSRS re-optimisation once the signed-in user's SRS data has loaded (it rate-limits itself).
  const srs = useSrsData();
  const srsStatus = useSrsStatus();
  const signedInId = user?.id ?? null;
  useEffect(() => {
    if (signedInId && srsStatus === "ready") void maybeAutoOptimize(srs.settings);
    // Only re-check when who's signed in or the load status changes, not on every settings edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedInId, srsStatus]);

  // Account emails (supabase/email-templates) are in the language stored on the account, so keep it in
  // step with the site's: set on sign-up, updated when a signed-in learner switches language.
  const { lang } = useI18n();
  const storedLang = user?.user_metadata?.lang as string | undefined;
  useEffect(() => {
    if (signedInId && storedLang !== lang) void getSupabaseBrowserClient()?.auth.updateUser({ data: { lang } });
  }, [signedInId, storedLang, lang]);

  return null;
}
