import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function extractAccessToken(cookieValue: string): string | undefined {
  try {
    let src = cookieValue;
    try { src = decodeURIComponent(src); } catch { /* keep as-is */ }
    const parsed = JSON.parse(src);
    return Array.isArray(parsed) ? parsed[0] : parsed.access_token;
  } catch {
    return cookieValue;
  }
}

function isJwtValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authCookie = request.cookies
    .getAll()
    .find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  const token = authCookie?.value ? extractAccessToken(authCookie.value) : undefined;

  const protectedRoutes = ["/dashboard", "/onboarding", "/settings", "/admin"];
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));

  if (isProtected && (!token || !isJwtValid(token))) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/settings/:path*", "/admin/:path*"],
};
