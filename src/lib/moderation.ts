"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase/client";

// Reporting published decks and, for moderators, acting on reports (see "Moderation of shared decks" in
// supabase/schema.sql). Who may do what is enforced by row-level security, not by this code: the checks here
// only decide what to show.

export const REPORT_REASONS = ["illegal", "copyright", "abusive", "adult", "spam", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const MAX_NOTE_LENGTH = 1000;
export const MAX_HIDE_REASON_LENGTH = 500;

/** Trims a note to what the database accepts. */
export const cleanNote = (note: string) => note.trim().slice(0, MAX_NOTE_LENGTH);

export type ReportResult = "ok" | "duplicate" | "signin" | "error";

/** Reports one published deck version. The same learner can report a version only once. */
export async function reportDeck(publishedId: string, reason: ReportReason, note: string): Promise<ReportResult> {
  const supabase = getSupabaseBrowserClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) return "signin";
  const { error } = await supabase
    .from("deck_reports")
    .insert({ published_id: publishedId, reporter_id: user.id, reason, note: cleanNote(note) });
  if (!error) return "ok";
  return error.code === "23505" ? "duplicate" : "error";
}

/** Whether the signed-in user is a moderator (false while loading, signed out, or before schema.sql has the function). */
export function useIsAdmin(userId: string | null): boolean {
  const [admin, setAdmin] = useState<{ userId: string; value: boolean } | null>(null);
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userId) return;
    let live = true;
    void Promise.resolve(supabase.rpc("is_admin")).then(({ data, error }) => {
      if (live) setAdmin({ userId, value: !error && data === true });
    });
    return () => {
      live = false;
    };
  }, [userId]);
  return !!userId && admin?.userId === userId && admin.value;
}

export interface Report {
  id: string;
  publishedId: string | null;
  deckTitle: string;
  authorId: string | null;
  author: string | null;
  reporter: string | null;
  reason: ReportReason;
  note: string;
  status: "open" | "actioned" | "dismissed";
  createdAt: string;
}

export interface HiddenDeck {
  /** The latest hidden version, which is what a moderator opens. */
  id: string;
  authorId: string;
  author: string | null;
  sourceDeckId: string;
  title: string;
  reason: string | null;
  hiddenAt: string | null;
}

async function usernames(ids: (string | null)[]): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (!supabase || unique.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, username").in("id", unique);
  return Object.fromEntries((data ?? []).map((p) => [p.id as string, p.username as string]));
}

/** Reports waiting for a decision, oldest first, and the decks currently hidden. Moderators only. */
export async function loadModeration(): Promise<{ reports: Report[]; hidden: HiddenDeck[] } | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const [reportRows, hiddenRows] = await Promise.all([
    supabase
      .from("deck_reports")
      .select("id, published_id, reporter_id, reason, note, status, deck_title, author_id, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("published_decks")
      .select("id, author_id, source_deck_id, version, title, hidden_reason, hidden_at")
      .eq("hidden", true)
      .order("version", { ascending: false })
      .limit(500),
  ]);
  if (reportRows.error || hiddenRows.error) return null;
  const people = await usernames([
    ...reportRows.data.flatMap((r) => [r.reporter_id as string, r.author_id as string | null]),
    ...hiddenRows.data.map((d) => d.author_id as string),
  ]);
  const reports: Report[] = reportRows.data.map((r) => ({
    id: r.id as string,
    publishedId: (r.published_id as string | null) ?? null,
    deckTitle: r.deck_title as string,
    authorId: (r.author_id as string | null) ?? null,
    author: people[r.author_id as string] ?? null,
    reporter: people[r.reporter_id as string] ?? null,
    reason: r.reason as ReportReason,
    note: r.note as string,
    status: r.status as Report["status"],
    createdAt: r.created_at as string,
  }));
  // One entry per hidden deck: rows come newest version first, so the first one seen is the latest.
  const seen = new Set<string>();
  const hidden: HiddenDeck[] = [];
  for (const d of hiddenRows.data) {
    const key = `${d.author_id}/${d.source_deck_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hidden.push({
      id: d.id as string,
      authorId: d.author_id as string,
      author: people[d.author_id as string] ?? null,
      sourceDeckId: d.source_deck_id as string,
      title: d.title as string,
      reason: (d.hidden_reason as string | null) ?? null,
      hiddenAt: (d.hidden_at as string | null) ?? null,
    });
  }
  return { reports, hidden };
}

/** Number of things waiting for a moderator: deck reports plus problems users reported (null if neither can be read). */
export async function countOpenReports(): Promise<number | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const [decks, problems] = await Promise.all([
    supabase.from("deck_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("problem_reports").select("id", { count: "exact", head: true }).eq("kind", "feedback").is("handled_at", null),
  ]);
  if (decks.error && problems.error) return null;
  return (decks.error ? 0 : (decks.count ?? 0)) + (problems.error ? 0 : (problems.count ?? 0));
}

/** A message a learner sent with "Report a problem", or an error the site caught in someone's browser. */
export interface ProblemReport {
  id: string;
  kind: "error" | "server-error" | "feedback";
  message: string;
  detail: string | null;
  path: string | null;
  userAgent: string | null;
  version: string | null;
  user: string | null;
  createdAt: string;
  handled: boolean;
}

/** Problem reports, newest first. `only` narrows to messages from people ("feedback") or to caught errors. */
export async function loadProblemReports(options: { showHandled: boolean; only: "all" | "feedback" | "errors" }): Promise<ProblemReport[] | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  let request = supabase
    .from("problem_reports")
    .select("id, kind, message, detail, path, user_agent, version, user_id, created_at, handled_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!options.showHandled) request = request.is("handled_at", null);
  if (options.only === "feedback") request = request.eq("kind", "feedback");
  if (options.only === "errors") request = request.in("kind", ["error", "server-error"]);
  const { data, error } = await request;
  if (error) return null;
  const people = await usernames(data.map((r) => (r.user_id as string | null) ?? null));
  return data.map((r) => ({
    id: r.id as string,
    kind: r.kind as ProblemReport["kind"],
    message: r.message as string,
    detail: (r.detail as string | null) ?? null,
    path: (r.path as string | null) ?? null,
    userAgent: (r.user_agent as string | null) ?? null,
    version: (r.version as string | null) ?? null,
    user: r.user_id ? (people[r.user_id as string] ?? null) : null,
    createdAt: r.created_at as string,
    handled: !!r.handled_at,
  }));
}

/** Marks a problem report handled (or open again). */
export async function setProblemHandled(id: string, handled: boolean): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { error } = await supabase.from("problem_reports").update({ handled_at: handled ? new Date().toISOString() : null }).eq("id", id);
  return !error;
}

export async function deleteProblemReport(id: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { error } = await supabase.from("problem_reports").delete().eq("id", id);
  return !error;
}

/** Hides every version of the reported deck, tells its author why, and closes the open reports about it. */
export async function hideDeck(report: Report, reason: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !report.publishedId) return false;
  const { data: version } = await supabase.from("published_decks").select("author_id, source_deck_id").eq("id", report.publishedId).maybeSingle();
  if (!version) return false;
  const { data: versions, error } = await supabase
    .from("published_decks")
    .update({ hidden: true, hidden_reason: reason.trim().slice(0, MAX_HIDE_REASON_LENGTH), hidden_at: new Date().toISOString() })
    .eq("author_id", version.author_id)
    .eq("source_deck_id", version.source_deck_id)
    .select("id");
  if (error || !versions?.length) return false;
  const { error: closeError } = await supabase
    .from("deck_reports")
    .update({ status: "actioned", resolved_at: new Date().toISOString() })
    .in("published_id", versions.map((v) => v.id as string))
    .eq("status", "open");
  return !closeError;
}

/** Closes a report without hiding anything. */
export async function dismissReport(reportId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { error } = await supabase.from("deck_reports").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", reportId);
  return !error;
}

/** Makes a hidden deck (all versions) visible again. */
export async function restoreDeck(deck: HiddenDeck): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("published_decks")
    .update({ hidden: false, hidden_reason: null, hidden_at: null })
    .eq("author_id", deck.authorId)
    .eq("source_deck_id", deck.sourceDeckId);
  return !error;
}
