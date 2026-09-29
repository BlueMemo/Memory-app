import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from "./config";

/** Refreshes the Supabase auth cookie on every request, so server components see a valid session. */
export async function updateSupabaseSession(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Touching the session (not just reading the cookie) is what actually refreshes an expired token.
  await supabase.auth.getUser();

  return response;
}
