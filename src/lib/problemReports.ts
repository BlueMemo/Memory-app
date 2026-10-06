"use client";

import { getSupabaseBrowserClient } from "./supabase/client";

// Problem reports (table `problem_reports` in supabase/schema.sql): errors caught in the browser, and
// messages learners send with "Report a problem". Read by the team in Supabase's table editor. Only the
// page's path is sent (no query string, which can hold search terms), plus the browser and site version.

export type ProblemKind = "error" | "feedback";

/** At most this many automatic error reports per page load, so a crash loop can't flood the table. */
const MAX_ERRORS_PER_LOAD = 5;
const sent = new Set<string>();

/** Noise that isn't ours to fix: browser extensions, cross-origin scripts, a harmless browser warning. */
export function isIgnoredError(message: string, source?: string): boolean {
  if (/^(chrome|moz|safari|safari-web)-extension:/.test(source ?? "")) return true;
  return message === "Script error." || message.startsWith("ResizeObserver loop");
}

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) : text);

export async function sendProblemReport(kind: ProblemKind, message: string, detail?: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !message.trim()) return false;
  const { data } = await supabase.auth.getSession();
  const { error } = await supabase.from("problem_reports").insert({
    kind,
    message: clip(message.trim(), 4000),
    detail: detail ? clip(detail, 8000) : null,
    path: clip(location.pathname, 300),
    user_agent: clip(navigator.userAgent, 400),
    version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    user_id: data.session?.user.id ?? null,
  });
  if (error) console.warn("Problem report not sent:", error.code, error.message);
  return !error;
}

/** Reports an error once per page load (same message), in production only. Never throws. */
export function reportError(error: unknown, source?: string) {
  if (process.env.NODE_ENV !== "production") return;
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (isIgnoredError(message, source) || sent.has(message) || sent.size >= MAX_ERRORS_PER_LOAD) return;
  sent.add(message);
  const detail = error instanceof Error ? error.stack : undefined;
  void sendProblemReport("error", message, detail).catch(() => {});
}
