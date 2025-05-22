import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "./lib/auth"

// Paths that require authentication
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

// Paths that are accessible only when not authenticated
const authPaths = ["/login", "/signup", "/reset-password"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get the token from cookies
  const token = request.cookies.get("token")?.value

  // Check if the user is authenticated
  const isAuthenticated = token && verifyToken(token)

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  // Check if the path is an auth path
  const isAuthPath = authPaths.some((path) => pathname === path)

  // Redirect to login if accessing a protected path without authentication
  if (isProtectedPath && !isAuthenticated) {
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if accessing an auth path while authenticated
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
