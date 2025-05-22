import { NextResponse } from "next/server"

export async function GET(request: Request) {
  // Get the host from the request
  const host = request.headers.get("host") || "unknown"

  // Calculate the expected redirect URI based on HOST env var
  const hostEnvVar = process.env.HOST || ""
  const expectedRedirectUri = `${hostEnvVar}/api/auth/callback`

  // Return environment information
  return NextResponse.json({
    host_from_request: host,
    HOST_env_var: hostEnvVar,
    expected_redirect_uri: expectedRedirectUri,
    whitelisted_redirect_uri: "https://v0-node-js-serverless-api-lake.vercel.app/api/auth/callback",
    match: expectedRedirectUri === "https://v0-node-js-serverless-api-lake.vercel.app/api/auth/callback",
  })
}
