import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This middleware checks if the DATABASE_URL environment variable is set
// before allowing access to database-related routes
export function databaseMiddleware(request: NextRequest) {
  // Check if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    // For API routes, return a JSON error
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection not configured. Please set the DATABASE_URL environment variable.",
        },
        { status: 500 },
      )
    }

    // For admin routes, redirect to an error page
    if (request.nextUrl.pathname.startsWith("/admin/")) {
      return NextResponse.redirect(new URL("/database-error", request.url))
    }
  }

  // Continue with the request if DATABASE_URL is available
  return NextResponse.next()
}
