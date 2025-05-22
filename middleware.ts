import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isShopInstalled } from "./lib/db-auth"
import { isValidShop } from "./lib/shopify"

// Update the matcher to exclude the login page
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api/auth routes
     * 2. /api/debug-redirect route
     * 3. /_next (Next.js internals)
     * 4. /_static (inside /public)
     * 5. /_vercel (Vercel internals)
     * 6. All files in /public (e.g. favicon.ico)
     * 7. The root path (/)
     * 8. The login page (/login)
     */
    "/((?!api/auth|api/debug-redirect|login|_next|_static|_vercel|[\\w-]+\\.\\w+|$).*)",
  ],
}

// Update the middleware function to handle admin routes
export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const shop = url.searchParams.get("shop")

  // Special handling for admin routes
  if (request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/test-pixel")) {
    // For admin routes, redirect to login page if not authenticated
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`, request.url),
    )
  }

  // If no shop parameter, allow access to the landing page
  if (!shop) {
    // If trying to access a protected route without a shop parameter, redirect to the landing page
    if (request.nextUrl.pathname !== "/") {
      return NextResponse.redirect(new URL("/", request.url))
    }

    // Otherwise, allow access to the landing page
    return NextResponse.next()
  }

  // Check if the shop is valid
  if (!isValidShop(shop)) {
    return NextResponse.redirect(new URL(`/api/auth/error?error=Invalid shop domain: ${shop}`, request.url))
  }

  try {
    // Check if the shop is installed
    const isInstalled = await isShopInstalled(shop)

    // If not installed, redirect to auth
    if (!isInstalled) {
      return NextResponse.redirect(new URL(`/api/auth?shop=${shop}`, request.url))
    }

    // Continue with the request if shop is installed
    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)
    return NextResponse.redirect(new URL(`/api/auth/error?error=Server error`, request.url))
  }
}
