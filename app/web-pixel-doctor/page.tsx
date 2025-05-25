"use client"

import type React from "react"

import { useState } from "react"

export default function WebPixelDoctorPage() {
  const [shop, setShop] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/debug/web-pixel-fixed?shop=${encodeURIComponent(shop)}`)
      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Failed to check Web Pixel status")
      }
    } catch (err) {
      setError("An error occurred")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Web Pixel Doctor</h1>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <p className="text-blue-700">This tool helps diagnose and fix issues with your Web Pixel extension.</p>
      </div>

      <form onSubmit={handleCheck} className="mb-6">
        <div className="mb-4">
          <label htmlFor="shop" className="block text-sm font-medium text-gray-700 mb-1">
            Shop Domain (e.g., your-store.myshopify.com)
          </label>
          <input
            type="text"
            id="shop"
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="your-store.myshopify.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check Web Pixel Status"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Results for {result.shop}</h2>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Web Pixels ({result.webPixels.length})</h3>
            {result.webPixels.length > 0 ? (
              <div className="bg-gray-50 p-4 rounded overflow-x-auto">
                <pre className="text-sm">{JSON.stringify(result.webPixels, null, 2)}</pre>
              </div>
            ) : (
              <p className="text-yellow-600">No Web Pixels found.</p>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Script Tags ({result.scriptTags.length})</h3>
            {result.scriptTags.length > 0 ? (
              <div className="bg-gray-50 p-4 rounded overflow-x-auto">
                <pre className="text-sm">{JSON.stringify(result.scriptTags, null, 2)}</pre>
              </div>
            ) : (
              <p className="text-yellow-600">No Script Tags found.</p>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium">Recommendations</h3>

            {result.webPixels.length === 0 && (
              <div className="bg-yellow-50 p-4 rounded">
                <p className="font-medium text-yellow-800">No Web Pixels found in your store.</p>
                <p className="mt-2 text-yellow-700">
                  Visit the{" "}
                  <a href="/recreate-pixel" className="underline">
                    Recreate Pixel
                  </a>{" "}
                  page to create a new Web Pixel extension.
                </p>
              </div>
            )}

            {result.webPixels.length > 0 && (
              <div className="bg-green-50 p-4 rounded">
                <p className="font-medium text-green-800">Web Pixel extension is installed.</p>
                <p className="mt-2 text-green-700">
                  If it's not working correctly, try the{" "}
                  <a href="/register-standalone" className="underline">
                    standalone script
                  </a>{" "}
                  as a fallback.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
