"use client";

import { getSupabaseBrowserClient } from "./supabase/client";

let activeUserId: string | null = null;

/** Called centrally when the signed-in user changes — see components/AuthSync.tsx. */
export function setActiveUserForPracticeResults(userId: string | null) {
  activeUserId = userId;
}

/** Records a completed test's score. A no-op in guest mode — there's nowhere to keep history without an account. */
export async function recordPracticeResult(deckId: string, score: number, total: number) {
  if (!activeUserId) return;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.from("practice_results").insert({ user_id: activeUserId, deck_id: deckId, score, total });
}
