"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function AuthSuccess() {
  const searchParams = useSearchParams()
  const shop = searchParams.get("shop") || ""
  const [loading, setLoading] = useState(true)
  const [configStatus, setConfigStatus] = useState<{
    exists: boolean
    configured: boolean
    pixelId: string | null
  }>({
    exists: false,
    configured: false,
    pixelId: null,
  })

  useEffect(() => {
    async function checkConfig() {
      try {
        if (!shop) return

        const response = await fetch(`/api/connection-status?shop=${encodeURIComponent(shop)}`)
        if (response.ok) {
          const data = await response.json()
          setConfigStatus({
            exists: data.success && data.shop_exists,
            configured: data.success && data.configured,
            pixelId: data.pixelId,
          })
        }
      } catch (error) {
        console.error("Error checking configuration:", error)
      } finally {
        setLoading(false)
      }
    }

    checkConfig()
  }, [shop])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-green-100 p-3 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Installation Successful!</h1>
        <p className="text-gray-600 text-center mb-6">
          Your app has been successfully installed on <span className="font-semibold">{shop}</span>.
        </p>

        {loading ? (
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-md bg-gray-50">
            <h2 className="text-lg font-medium text-gray-800 mb-2">Configuration Status</h2>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span
                  className={`inline-block w-4 h-4 rounded-full mr-2 ${
                    configStatus.exists ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span>
                <span>Shop Configuration: {configStatus.exists ? "Created" : "Missing"}</span>
              </li>
              <li className="flex items-center">
                <span
                  className={`inline-block w-4 h-4 rounded-full mr-2 ${
                    configStatus.configured ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></span>
                <span>
                  Facebook Pixel:{" "}
                  {configStatus.configured
                    ? `Configured (${configStatus.pixelId})`
                    : "Not configured - please add your pixel ID"}
                </span>
              </li>
            </ul>
          </div>
        )}

        <div className="flex flex-col space-y-3">
          {!configStatus.configured && (
            <Link
              href="/customer/setup"
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-center transition-colors"
            >
              Configure Facebook Pixel
            </Link>
          )}
          <Link
            href="/"
            className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md text-center transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
