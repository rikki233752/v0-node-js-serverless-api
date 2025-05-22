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

// Simplified middleware function
export async function middleware(request: NextRequest) {
  const url = new URL(request.url)

  // Check for auth header in session storage (client-side only)
  // For admin routes, redirect to login page
  if (request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/test-pixel")) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`, request.url),
    )
  }

  // Continue with the request for other routes
  return NextResponse.next()
}
