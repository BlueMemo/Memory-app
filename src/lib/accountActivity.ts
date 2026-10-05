"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { ACTIVITY_WINDOW_DAYS, type TestResult } from "./activity";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { ReviewEntry } from "./studyStats";

export interface AccountActivity {
  /** "error" means at least one query failed (e.g. a table the SQL file adds hasn't been created yet). */
  status: "loading" | "ready" | "error";
  /** Timestamps of every answered review in the window. */
  reviewTimes: string[];
  /** Completed tests in the window, newest first. */
  tests: TestResult[];
  /** All tests ever taken, not just the window. */
  testCount: number;
}

const LOADING: AccountActivity = { status: "loading", reviewTimes: [], tests: [], testCount: 0 };
const PAGE = 1000;
const MAX_ROWS = 20_000;

/** Supabase returns at most 1000 rows per request, so a heavy reviewer needs several. */
async function fetchReviewTimes(supabase: SupabaseClient, userId: string, since: string): Promise<string[]> {
  const times: string[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from("srs_review_logs")
      .select("review")
      .eq("user_id", userId)
      .gte("review", since)
      .order("review", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    times.push(...data.map((r) => r.review as string));
    if (data.length < PAGE) break;
  }
  return times;
}

async function fetchTests(supabase: SupabaseClient, userId: string, since: string): Promise<TestResult[]> {
  const { data, error } = await supabase
    .from("practice_results")
    .select("deck_id, score, total, completed_at")
    .eq("user_id", userId)
    .gte("completed_at", since)
    .order("completed_at", { ascending: false })
    .limit(PAGE);
  if (error) throw error;
  return data.map((r) => ({ deckId: r.deck_id as string, score: r.score as number, total: r.total as number, at: r.completed_at as string }));
}

async function fetchTestCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase.from("practice_results").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

/** The signed-in learner's recent study history, for the account page's stats, streak and heatmap. */
export function useAccountActivity(userId: string): AccountActivity {
  const [activity, setActivity] = useState<AccountActivity>(LOADING);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 86_400_000).toISOString();

    // Each query is independent, so one failing doesn't hide what the others found.
    Promise.allSettled([fetchReviewTimes(supabase, userId, since), fetchTests(supabase, userId, since), fetchTestCount(supabase, userId)]).then(
      ([reviews, tests, count]) => {
        if (cancelled) return;
        setActivity({
          status: reviews.status === "fulfilled" && tests.status === "fulfilled" && count.status === "fulfilled" ? "ready" : "error",
          reviewTimes: reviews.status === "fulfilled" ? reviews.value : [],
          tests: tests.status === "fulfilled" ? tests.value : [],
          testCount: count.status === "fulfilled" ? count.value : 0,
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return activity;
}

/** The learner's whole review history (up to MAX_ROWS answers), for the statistics and achievements. */
export function useStudyHistory(userId: string): { status: "loading" | "ready" | "error"; reviews: ReviewEntry[] } {
  const [history, setHistory] = useState<{ status: "loading" | "ready" | "error"; reviews: ReviewEntry[] }>({ status: "loading", reviews: [] });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const reviews: ReviewEntry[] = [];
      for (let from = 0; from < MAX_ROWS; from += PAGE) {
        const { data, error } = await supabase
          .from("srs_review_logs")
          .select("deck_id, card_id, rating, state, review")
          .eq("user_id", userId)
          .order("review", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) return { status: "error" as const, reviews };
        reviews.push(
          ...data.map((r) => ({ deckId: r.deck_id as string, cardId: r.card_id as string, rating: r.rating as number, state: r.state as number, review: r.review as string })),
        );
        if (data.length < PAGE) break;
      }
      return { status: "ready" as const, reviews };
    })().then((result) => {
      if (!cancelled) setHistory(result);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return history;
}
