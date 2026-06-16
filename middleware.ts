import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase v2 stores the session in a cookie named sb-<project-ref>-auth-token.
  // The old names (sb-access-token, supabase-auth-token) are never set by the client.
  const authCookie = request.cookies
    .getAll()
    .find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
  const token = authCookie?.value;

  const protectedRoutes = ["/dashboard", "/onboarding", "/settings", "/admin"];
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/settings/:path*", "/admin/:path*"],
};
