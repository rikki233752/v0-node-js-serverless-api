"use client"

import type React from "react"

import { useState } from "react"

export default function RecreatePixelPage() {
  const [shop, setShop] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/shopify/find-and-update-web-pixel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop,
          extensionId: "web-pixel-v2",
          forceCreate: true,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Failed to recreate web pixel")
      }
    } catch (err) {
      setError("An error occurred while recreating the web pixel")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Recreate Web Pixel Extension</h1>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-700">
          This page allows you to recreate the Web Pixel extension for a Shopify store. Use this to force an update of
          the extension configuration.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
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
          {loading ? "Processing..." : "Recreate Web Pixel"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <p className="text-green-700 font-medium">Web Pixel extension updated successfully!</p>
          <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
