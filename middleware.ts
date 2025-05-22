import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isShopInstalled } from "./lib/db-auth"
import { isValidShop } from "./lib/shopify"

// Define which paths should be protected
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api/auth routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. All files in /public (e.g. favicon.ico)
     * 6. The root path (/)
     * 7. /debug routes
     */
    "/((?!api/auth|_next|_static|_vercel|debug|[\\w-]+\\.\\w+|$).*)",
  ],
}

export async function middleware(request: NextRequest) {
  // Get query parameters
  const url = new URL(request.url)
  const shop = url.searchParams.get("shop")

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
