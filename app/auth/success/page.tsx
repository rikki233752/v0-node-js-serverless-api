"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const shop = searchParams.get("shop")

  useEffect(() => {
    if (shop) {
      // Store the shop in localStorage
      localStorage.setItem("shop", shop)
    }
  }, [shop])

  useEffect(() => {
    // Redirect to the app after a short delay
    const redirectTimeout = setTimeout(() => {
      window.location.href = `/app?shop=${shop}`
    }, 2000)

    return () => clearTimeout(redirectTimeout)
  }, [shop])

  useEffect(() => {
    // Check pixel detection status after 10 seconds
    const checkPixelStatus = setTimeout(async () => {
      try {
        const response = await fetch(`/api/detect-pixel?shop=${shop}`)
        const data = await response.json()

        if (data.success && data.pixelId) {
          // Update UI to show pixel detected
          console.log("Pixel detected:", data.pixelId)
        }
      } catch (error) {
        console.error("Failed to check pixel status:", error)
      }
    }, 10000)

    return () => clearTimeout(checkPixelStatus)
  }, [shop])

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h1 className="text-2xl font-semibold text-center mb-4">Installation Successful!</h1>
        <p className="text-gray-700 text-center mb-6">
          Your app has been successfully installed. You will be redirected to the app shortly.
        </p>

        {/* Web Pixel Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Web Pixel</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium">Not Connected</span>
            </div>

            <p className="text-sm text-gray-500">Connect your web pixel to track events on your store.</p>

            <div className="mt-4">
              <a
                href={`/web-pixel-config?shop=${shop}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Configure Web Pixel →
              </a>
            </div>
          </div>
        </div>

        {/* Pixel Detection Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Facebook Pixel Detection</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Detection Status:</span>
              <span className="font-medium">Pending</span>
            </div>

            <p className="text-sm text-gray-500">
              We're checking your store for Facebook Pixel configuration. This may take a few moments.
            </p>

            <div className="mt-4">
              <a
                href={`/manual-pixel-config?shop=${shop}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Configure Pixel Manually →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
