import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("sb-access-token")?.value 
    || request.cookies.get("supabase-auth-token")?.value;
  
  const authRoutes = ["/auth", "/forgot-password", "/reset-password"];
  const protectedRoutes = ["/dashboard", "/onboarding", "/settings", "/admin"];
  
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r));
  const isAuth = authRoutes.some(r => pathname.startsWith(r));
  
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/settings/:path*", "/admin/:path*"],
};
