import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next()

    // Check if Supabase environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If Supabase environment variables are missing, skip Supabase authentication
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Supabase environment variables are missing. Skipping authentication check.")
      return res
    }

    // Only try to use Supabase if environment variables are available
    try {
      // Dynamically import createMiddlewareClient to avoid errors when env vars are missing
      const { createMiddlewareClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createMiddlewareClient({ req, res })

      // Try to get the session
      const { data } = await supabase.auth.getSession()
      const session = data.session

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
    } catch (supabaseError) {
      console.error("Error using Supabase in middleware:", supabaseError)
      // Continue without Supabase authentication if there's an error
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
    "/login",
    "/signup",
    "/reset-password",
  ],
}
