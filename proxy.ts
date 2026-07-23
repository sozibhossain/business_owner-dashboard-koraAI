import { auth } from "@/lib/auth";
import { isBusinessDashboardRole } from "@/lib/roles";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const loginUrl = (req: NextRequest, error: string) => {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", error);
  return url;
};

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthPage = pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/verify-otp") ||
    pathname.startsWith("/reset-password");

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(loginUrl(req, "session_required"));
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (isLoggedIn && !isAuthPage) {
    const role = req.auth?.user?.role;
    if (!isBusinessDashboardRole(role)) {
      return NextResponse.redirect(loginUrl(req, "role_not_allowed"));
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
