import type { NextRequest } from "next/server";
import { updateSession } from "@/integrations/supabase/middleware";
import { applySecurityHeaders } from "@/lib/security-headers";

// /api/public/* is a bearer-token API consumed by scripts, not browsers, and
// carries its own CORS headers (see api-auth.server.ts) — document hardening
// would only get in its way there.
function isPublicApi(pathname: string): boolean {
  return pathname.startsWith("/api/public/");
}

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  if (!isPublicApi(request.nextUrl.pathname)) {
    applySecurityHeaders(response.headers, request);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
