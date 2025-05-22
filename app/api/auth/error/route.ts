import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const error = url.searchParams.get("error") || "Unknown error"

  // Return a simple error page
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Error</title>
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; }
        .container { max-width: 600px; margin: 0 auto; }
        .error { color: #e00; background: #fff3f3; padding: 1rem; border-left: 4px solid #e00; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Authentication Error</h1>
        <div class="error">
          <p>${error}</p>
        </div>
        <p>Please try again or contact support if the problem persists.</p>
        <p><a href="/api/auth">Return to authentication</a></p>
      </div>
    </body>
    </html>
    `,
    {
      headers: {
        "Content-Type": "text/html",
      },
    },
  )
}
