"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/admin/dashboard"

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const authHeader = sessionStorage.getItem("authHeader")
      if (authHeader) {
        try {
          const response = await fetch("/api/admin/pixels", {
            headers: {
              Authorization: authHeader,
            },
          })

          if (response.ok) {
            router.push(redirect)
          } else {
            // Clear invalid auth
            sessionStorage.removeItem("authHeader")
          }
        } catch (err) {
          console.error("Auth check failed:", err)
        }
      }
    }

    checkAuth()
  }, [redirect, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Create basic auth header
      const authHeader = "Basic " + btoa(`${username}:${password}`)

      // Test the credentials with a request to the pixels API
      const response = await fetch("/api/admin/pixels", {
        headers: {
          Authorization: authHeader,
        },
      })

      if (response.ok) {
        // Store auth header in session storage
        sessionStorage.setItem("authHeader", authHeader)

        // Redirect to the requested page or dashboard
        console.log("Login successful, redirecting to:", redirect)
        router.push(redirect)
      } else {
        setError("Invalid credentials. Please try again.")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
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
        </CardContent>
      </Card>
    </div>
  )
}
