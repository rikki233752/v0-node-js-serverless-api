"use client"

import { useSearchParams } from "next/navigation"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "unknown"

  const errorMessages: Record<string, { title: string; description: string }> = {
    missing_params: {
      title: "Missing Parameters",
      description: "Required parameters are missing from the OAuth callback. Please try installing the app again.",
    },
    token_exchange: {
      title: "Token Exchange Failed",
      description: "Failed to exchange the authorization code for an access token. Please try again.",
    },
    database: {
      title: "Database Error",
      description: "There was an error storing your shop data. Please check your database connection and try again.",
    },
    invalid_hmac: {
      title: "Invalid HMAC",
      description: "The request signature could not be verified. Please try installing the app again.",
    },
    unknown: {
      title: "Unknown Error",
      description: "An unexpected error occurred during the authentication process. Please try again.",
    },
  }

  const errorInfo = errorMessages[error] || errorMessages.unknown

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">{errorInfo.title}</h1>

          <p className="text-gray-600 text-center mb-8">{errorInfo.description}</p>

          <div className="space-y-3">
            <Link
              href="/setup/shopify"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Link>

            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </div>

          {error !== "unknown" && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-mono">Error Code: {error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
