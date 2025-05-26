"use client"

import type React from "react"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

export default function ManualPixelConfig() {
  const searchParams = useSearchParams()
  const shop = searchParams.get("shop") || ""

  const [pixelId, setPixelId] = useState("")
  const [storePassword, setStorePassword] = useState("")
  const [usePassword, setUsePassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      if (usePassword) {
        // Try to detect pixel with password
        const response = await fetch(
          `/api/auth/callback?shop=${encodeURIComponent(shop)}&storePassword=${encodeURIComponent(storePassword)}`,
        )
        const data = await response.json()

        if (data.success && data.pixelId) {
          setResult(data)
        } else {
          // If detection fails, manually configure
          await manuallyConfigurePixel()
        }
      } else {
        // Directly configure pixel manually
        await manuallyConfigurePixel()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setLoading(false)
    }
  }

  async function manuallyConfigurePixel() {
    try {
      const response = await fetch("/api/customer/setup-pixel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop,
          pixelId,
          accessToken: "MANUAL_CONFIGURATION",
        }),
      })

      const data = await response.json()
      setResult(data)

      if (!data.success) {
        setError(data.error || "Failed to configure pixel")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to configure pixel")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-6">Manual Pixel Configuration</h1>

      {shop ? (
        <>
          <p className="mb-4">
            Configure Facebook Pixel for: <strong>{shop}</strong>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pixelId" className="block text-sm font-medium text-gray-700 mb-1">
                Facebook Pixel ID
              </label>
              <input
                type="text"
                id="pixelId"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                placeholder="Enter your Facebook Pixel ID"
                pattern="\d{15,16}"
                title="Facebook Pixel ID should be 15-16 digits"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Your Facebook Pixel ID is a 15-16 digit number</p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="usePassword"
                checked={usePassword}
                onChange={(e) => setUsePassword(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="usePassword" className="ml-2 block text-sm text-gray-700">
                Try to detect pixel with store password
              </label>
            </div>

            {usePassword && (
              <div>
                <label htmlFor="storePassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Store Password
                </label>
                <input
                  type="password"
                  id="storePassword"
                  value={storePassword}
                  onChange={(e) => setStorePassword(e.target.value)}
                  placeholder="Enter store password"
                  required={usePassword}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Configuring..." : "Configure Pixel"}
            </button>
          </form>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

          {result && result.success && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
              <p className="font-medium">Pixel configured successfully!</p>
              <p className="text-sm mt-1">Pixel ID: {result.pixelId}</p>
              <p className="text-sm mt-1">Configuration Status: {result.configurationStatus}</p>
            </div>
          )}
        </>
      ) : (
        <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md">
          <p>No shop specified. Please provide a shop parameter in the URL.</p>
          <p className="text-sm mt-1">
            Example: <code>/manual-pixel-config?shop=your-store.myshopify.com</code>
          </p>
        </div>
      )}
    </div>
  )
}
