import type { Instrumentation } from "next";

// Server errors (a page or API route failing on Vercel) go to `problem_reports` like browser errors do.
// An anonymous Supabase client: the table accepts reports from anyone and nothing here is the visitor's.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NODE_ENV !== "production") return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : null;
    await supabase.from("problem_reports").insert({
      kind: "server-error",
      message: message.slice(0, 4000),
      detail: [`route: ${context.routePath} (${context.routeType})`, digest && `digest: ${digest}`, err instanceof Error ? err.stack : null]
        .filter(Boolean)
        .join("\n")
        .slice(0, 8000),
      path: request.path.split("?")[0].slice(0, 300),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    });
  } catch {
    // Reporting must never cause a second failure.
  }
};
