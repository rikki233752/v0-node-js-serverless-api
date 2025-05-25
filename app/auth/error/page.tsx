"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "unknown"

  const errorMessages = {
    missing_params: "Missing required parameters for authentication.",
    invalid_hmac: "Invalid HMAC signature. The request may have been tampered with.",
    token_exchange: "Failed to exchange authorization code for access token.",
    database: "Failed to store shop data in the database.",
    unknown: "An unknown error occurred during authentication.",
  }

  const message = errorMessages[error as keyof typeof errorMessages] || errorMessages.unknown

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-red-100 p-3 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Authentication Error</h1>
        <p className="text-gray-600 text-center mb-6">{message}</p>
        <div className="flex flex-col space-y-3">
          <Link
            href="/"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-center transition-colors"
          >
            Return to Home
          </Link>
          <Link
            href="/setup/shopify"
            className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md text-center transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  )
}
