import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next()

    // Create a Supabase client for the middleware
    const supabase = createMiddlewareClient({ req, res })

    // Try to get the session
    let session = null
    try {
      const { data } = await supabase.auth.getSession()
      session = data.session
    } catch (error) {
      console.error("Error in middleware getting session:", error)
      // Continue without session if there's an error
    }

    // Check if the request is for a protected route
    const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard")
    const isAuthRoute = req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup"

    // If accessing a protected route without being logged in, redirect to login
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL("/login", req.url)
      redirectUrl.searchParams.set("redirect", req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If accessing login/signup while logged in, redirect to dashboard
    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    // Return the original response to avoid breaking the app
    return NextResponse.next()
  }
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Add paths that should be protected
    "/dashboard/:path*",
  ],
}
