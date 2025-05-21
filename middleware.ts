import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

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
}

// Specify which routes this middleware should run on
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/reset-password"],
}
