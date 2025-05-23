"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { storeAuthToken } from "@/lib/auth-utils"

export default function DirectAccess() {
  const [message, setMessage] = useState("Preparing direct access...")

  const handleDirectAccess = () => {
    try {
      // Create and store auth token
      const authHeader = "Basic " + btoa("admin:password")
      storeAuthToken(authHeader)

      // Redirect to dashboard
      setMessage("Auth token set, redirecting...")
      setTimeout(() => {
        window.location.href = "/admin/dashboard"
      }, 500)
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Direct Dashboard Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>This page will help you bypass the login flow and access the dashboard directly.</p>
          <p className="text-sm text-gray-500">Status: {message}</p>
          <Button onClick={handleDirectAccess} className="w-full">
            Access Dashboard
          </Button>
          <div className="pt-4 text-sm text-gray-500">
            <p>If you continue to have issues, please check:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your database connection is working</li>
              <li>The admin credentials are set correctly</li>
              <li>There are no JavaScript errors in the console</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
