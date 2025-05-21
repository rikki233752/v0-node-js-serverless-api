import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define which paths require authentication
const protectedPaths = [
  "/dashboard",
  "/dashboard/call-flows",
  "/dashboard/pathway",
  "/dashboard/phone-numbers",
  "/dashboard/analytics",
  "/dashboard/call-history",
  "/dashboard/billing",
  "/dashboard/settings",
  "/dashboard/profile",
]

// Define which paths are public (no auth required)
const publicPaths = ["/login", "/signup", "/reset-password", "/", "/api/auth/session"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  // Check if the path is public
  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  // If it's a public path, allow access
  if (isPublicPath) {
    return NextResponse.next()
  }

  // If it's not a protected path, allow access
  if (!isProtectedPath) {
    return NextResponse.next()
  }

  // Check for auth token
  const authToken = request.cookies.get("auth-token")?.value

  // If no auth token and trying to access protected path, redirect to login
  if (!authToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Allow access to protected path with auth token
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
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
