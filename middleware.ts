import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/sign-in"];
const SESSION_COOKIE = "hot_tracks_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((publicPath) => pathname.startsWith(publicPath));
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionCookie && !isPublicPath) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (sessionCookie && pathname === "/sign-in") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
