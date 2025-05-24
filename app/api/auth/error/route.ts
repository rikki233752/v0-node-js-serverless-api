import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const error = url.searchParams.get("error") || "Unknown error"
  const debug = url.searchParams.get("debug")
  const stack = url.searchParams.get("stack")

  let debugInfo = ""
  if (debug) {
    try {
      const debugData = JSON.parse(debug)
      debugInfo = JSON.stringify(debugData, null, 2)
    } catch (e) {
      debugInfo = debug
    }
  }

  // Return a detailed error page
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Error</title>
      <style>
        body { 
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          padding: 2rem; 
          max-width: 800px; 
          margin: 0 auto;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .error { color: #e00; background: #fff3f3; padding: 1rem; border-left: 4px solid #e00; margin: 1rem 0; }
        .debug { background: #f5f5f5; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
        .debug pre { margin: 0; white-space: pre-wrap; font-size: 12px; }
        .actions { margin: 2rem 0; }
        .btn { 
          display: inline-block; 
          padding: 0.5rem 1rem; 
          background: #007cba; 
          color: white; 
          text-decoration: none; 
          border-radius: 4px; 
          margin-right: 1rem;
        }
        .btn:hover { background: #005a87; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Authentication Error</h1>
        <div class="error">
          <p><strong>Error:</strong> ${error}</p>
        </div>
        
        ${
          debugInfo
            ? `
        <div class="debug">
          <h3>Debug Information:</h3>
          <pre>${debugInfo}</pre>
        </div>
        `
            : ""
        }
        
        ${
          stack
            ? `
        <details>
          <summary>Technical Details (Click to expand)</summary>
          <div class="debug">
            <pre>${stack}</pre>
          </div>
        </details>
        `
            : ""
        }
        
        <h2>Troubleshooting Steps:</h2>
        <ol>
          <li><strong>Check your Shopify Partner Dashboard:</strong> Ensure the redirect URI is correctly set to: <code>${process.env.HOST}/api/auth/callback</code></li>
          <li><strong>Verify environment variables:</strong> Make sure SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and HOST are properly set</li>
          <li><strong>Check the installation URL:</strong> Make sure you're using the correct installation URL format</li>
          <li><strong>Clear cookies:</strong> Clear your browser cookies and try again</li>
        </ol>
        
        <div class="actions">
          <a href="/api/debug/env?debug=true" class="btn">Check Environment Variables</a>
          <a href="/debug" class="btn">Debug Dashboard</a>
          <a href="/" class="btn">Return to Home</a>
        </div>
        
        <p><small>If the problem persists, please contact support with the debug information above.</small></p>
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
