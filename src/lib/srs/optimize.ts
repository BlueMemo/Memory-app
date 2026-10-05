"use client";

import { getSupabaseBrowserClient } from "../supabase/client";
import { cardKey, DAY_ROLLOVER_HOUR, parseSteps, type SrsSettings } from "./core";
import { getActiveSrsUserId, updateSrsSettings } from "./store";

// Personal FSRS optimisation: fetches the signed-in learner's whole review history, reduces it to what the
// optimizer needs (per card: ratings and day numbers), and asks /api/fsrs/optimize for parameters, which are
// saved in the SRS settings and used by every scheduler from then on. Guests keep only 30 days of reviews in
// the browser, which isn't enough to learn from, so this is for accounts only.

/** Below this many reviews the standard parameters are usually better than anything fitted. */
export const MIN_REVIEWS_TO_OPTIMIZE = 200;
/** Automatic optimisation reruns after this many new reviews (at most once a day). */
export const AUTO_OPTIMIZE_EVERY = 200;

const PAGE = 1000;
const AUTO_CHECK_KEY = "fsrs.autoCheckedAt";

export type OptimizeResult =
  | { status: "ok"; reviewCount: number }
  | { status: "not_enough"; reviewCount: number }
  | { status: "signed_out" }
  | { status: "error" };

/** How many reviews the signed-in learner has in total, or null for guests or on failure. */
export async function countReviews(): Promise<number | null> {
  const userId = getActiveSrsUserId();
  const supabase = getSupabaseBrowserClient();
  if (!userId || !supabase) return null;
  const { count, error } = await supabase
    .from("srs_review_logs")
    .select("review", { count: "exact", head: true })
    .eq("user_id", userId);
  return error ? null : (count ?? 0);
}

/** Day number in the learner's own time zone, starting each day at the same rollover hour as the scheduler. */
const dayNumber = (iso: string) => {
  const d = new Date(iso);
  const local = d.getTime() - d.getTimezoneOffset() * 60_000 - DAY_ROLLOVER_HOUR * 3600_000;
  return Math.floor(local / 86_400_000);
};

export async function optimizeParameters(settings: SrsSettings): Promise<OptimizeResult> {
  const userId = getActiveSrsUserId();
  const supabase = getSupabaseBrowserClient();
  if (!userId || !supabase) return { status: "signed_out" };

  const byCard = new Map<string, [number, number][]>();
  let reviewCount = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("srs_review_logs")
      .select("deck_id, card_id, rating, review")
      .eq("user_id", userId)
      .order("review", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return { status: "error" };
    for (const row of data) {
      const key = cardKey(row.deck_id as string, row.card_id as string);
      const list = byCard.get(key) ?? [];
      list.push([row.rating as number, dayNumber(row.review as string)]);
      byCard.set(key, list);
    }
    reviewCount += data.length;
    if (data.length < PAGE) break;
  }
  if (reviewCount < MIN_REVIEWS_TO_OPTIMIZE) return { status: "not_enough", reviewCount };

  try {
    const response = await fetch("/api/fsrs/optimize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cards: [...byCard.values()],
        relearningSteps: (parseSteps(settings.relearningSteps) ?? []).length,
      }),
    });
    if (response.status === 422) return { status: "not_enough", reviewCount };
    if (!response.ok) return { status: "error" };
    const { parameters } = (await response.json()) as { parameters: number[] };
    await updateSrsSettings({ parameters, optimizedAt: new Date().toISOString(), optimizedReviewCount: reviewCount });
    return { status: "ok", reviewCount };
  } catch {
    return { status: "error" };
  }
}

/**
 * Background re-optimisation (mounted once via AuthSync): at most once a day per browser, and only when
 * there are enough reviews in total and enough new ones since the last run.
 */
export async function maybeAutoOptimize(settings: SrsSettings) {
  if (!settings.autoOptimize || !getActiveSrsUserId()) return;
  try {
    const last = Number(localStorage.getItem(AUTO_CHECK_KEY) ?? 0);
    if (Date.now() - last < 24 * 3600_000) return;
    localStorage.setItem(AUTO_CHECK_KEY, String(Date.now()));
  } catch {
    return; // no storage: skip rather than re-checking on every page
  }
  const total = await countReviews();
  if (total === null || total < MIN_REVIEWS_TO_OPTIMIZE) return;
  if (total - settings.optimizedReviewCount < AUTO_OPTIMIZE_EVERY) return;
  await optimizeParameters(settings);
}
