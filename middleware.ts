import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// List of paths that require authentication
const protectedPaths = [
  "/dashboard",
  "/dashboard/call-flows",
  "/dashboard/pathway",
  "/dashboard/analytics",
  "/dashboard/phone-numbers",
  "/dashboard/call-history",
  "/dashboard/billing",
  "/dashboard/settings",
  "/dashboard/profile",
]

// List of paths that should redirect to dashboard if already authenticated
const authPaths = ["/login", "/signup", "/reset-password"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("auth-token")?.value

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))
  const isAuthPath = authPaths.some((path) => pathname === path)

  // If the path requires authentication and there's no token, redirect to login
  if (isProtectedPath && !token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", encodeURI(pathname))
    return NextResponse.redirect(url)
  }

  // If the user is already authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't require authentication
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/public).*)",
  ],
}
