"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Add import for auth utilities at the top
import { storeAuthToken, isAuthenticated, clearAuth } from "@/lib/auth-utils"

export default function LoginPage() {
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("password")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/admin/dashboard"

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      // Replace the sessionStorage.getItem check in useEffect with:
      if (isAuthenticated()) {
        setDebugInfo("Found existing auth, testing...")
        try {
          const response = await fetch("/api/admin/pixels", {
            headers: {
              Authorization: sessionStorage.getItem("authHeader") || "",
            },
          })

          if (response.ok) {
            setDebugInfo("Auth valid, redirecting...")
            router.push(redirect)
          } else {
            setDebugInfo("Auth invalid, clearing...")
            // Replace the sessionStorage.removeItem line with:
            clearAuth()
          }
        } catch (err) {
          setDebugInfo("Auth check failed: " + (err instanceof Error ? err.message : "Unknown error"))
        }
      }
    }

    checkAuth()
  }, [redirect, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setDebugInfo("Starting login process...")

    try {
      // Create basic auth header
      const authHeader = "Basic " + btoa(`${username}:${password}`)
      setDebugInfo("Created auth header, testing API...")

      // Test the credentials with a request to the pixels API
      const response = await fetch("/api/admin/pixels", {
        headers: {
          Authorization: authHeader,
        },
      })

      setDebugInfo(`API response status: ${response.status}`)

      if (response.ok) {
        setDebugInfo("Login successful, storing auth and redirecting...")
        // Replace the sessionStorage.setItem line in handleLogin with:
        storeAuthToken(authHeader)

        // Force a small delay to ensure storage is complete
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Redirect to the requested page or dashboard
        console.log("About to redirect to:", redirect)
        window.location.href = redirect // Use window.location.href instead of router.push
      } else {
        const errorData = await response.text()
        setDebugInfo(`Login failed: ${response.status} - ${errorData}`)
        setError("Invalid credentials. Please try again.")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setDebugInfo(`Login error: ${errorMessage}`)
      setError("An error occurred. Please try again.")
      console.error("Login error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the admin dashboard and tools</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {debugInfo && (
            <Alert className="mb-4">
              <AlertDescription>Debug: {debugInfo}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </div>
            <div className="text-sm text-gray-500 mt-4">
              <p>Default credentials:</p>
              <p>
                Username: <strong>admin</strong>
              </p>
              <p>
                Password: <strong>password</strong>
              </p>
              <p className="mt-2 text-xs">
                These credentials can be changed by setting the ADMIN_USERNAME and ADMIN_PASSWORD environment variables.
              </p>
            </div>
          </form>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold mb-2">Quick Links for Testing:</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => (window.location.href = "/api/admin/pixels")}
              >
                Test API Endpoint
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => (window.location.href = "/db-status")}
              >
                Check Database Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => (window.location.href = "/admin/dashboard")}
              >
                Go to Dashboard (Direct)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
