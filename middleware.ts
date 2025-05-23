import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Update the matcher to exclude more paths
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. All files in /public (e.g. favicon.ico)
     * 6. The root path (/)
     * 7. The login page (/login)
     */
    "/((?!api|login|_next|_static|_vercel|[\\w-]+\\.\\w+|$).*)",
  ],
}

// Update the middleware function to check for authentication before redirecting
export async function middleware(request: NextRequest) {
  const url = new URL(request.url)

  // Check if this is an admin or test-pixel route
  if (request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/test-pixel")) {
    // Check for auth cookie or header
    const authHeader = request.cookies.get("authToken")?.value
    const sessionAuth = request.headers.get("x-auth-token")

    // If authenticated, allow access
    if (authHeader || sessionAuth) {
      return NextResponse.next()
    }

    // Otherwise redirect to login
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`, request.url),
    )
  }

  // Continue with the request for other routes
  return NextResponse.next()
}
