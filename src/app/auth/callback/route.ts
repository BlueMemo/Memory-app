import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where Supabase sends the user after they click an email confirmation or password-reset link (the PKCE
 * flow: the link carries a `code` that only the browser which asked for it can exchange, because that
 * browser holds the matching verifier cookie).
 *
 * Opened on another device (e.g. the email read on a phone, the account made on a computer), the exchange
 * fails, but Supabase has already confirmed the email before redirecting here. So a failed sign-up link
 * still means "confirmed: sign in", and only a failed password-reset link needs a new one. Email templates
 * that link to /auth/confirm (token_hash) avoid the problem altogether; see supabase/email-templates.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";
  const resetting = next.startsWith("/account/reset-password");

  if (code) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/account?notice=${resetting ? "reset-link" : "confirmed"}`);
  }

  return NextResponse.redirect(`${origin}/account?notice=link-error`);
}
