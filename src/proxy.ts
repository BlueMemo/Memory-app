import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/proxySession";

// Renamed from "middleware" in Next.js 16 — see node_modules/next/dist/docs/.../proxy.md.
export function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
