import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Where Supabase sends the user after they click an email confirmation or password-reset link. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/account?error=auth`);
}
