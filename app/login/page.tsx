"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Clock } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { login, isLoading } = useAuth()
  const router = useRouter()
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [cooldownTime, setCooldownTime] = useState(0)

  // Handle rate limit cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isRateLimited && cooldownTime > 0) {
      timer = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            setIsRateLimited(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isRateLimited, cooldownTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent submission if rate limited
    if (isRateLimited) {
      return
    }

    setError("")

    if (!email) {
      setError("Email is required")
      return
    }

    if (!password) {
      setError("Password is required")
      return
    }

    try {
      const result = await login(email, password)

      if (result.success) {
        router.push("/dashboard")
      } else {
        // Check if the error is about rate limiting
        if (result.message.includes("rate limit") || result.message.includes("too many requests")) {
          setIsRateLimited(true)
          setCooldownTime(30) // 30 second cooldown
          setError("Too many login attempts. Please wait before trying again.")
        } else {
          setError(result.message)
        }
      }
    } catch (err: any) {
      // Handle network errors or other exceptions
      if (err.message?.includes("rate limit") || err.message?.includes("too many requests")) {
        setIsRateLimited(true)
        setCooldownTime(30) // 30 second cooldown
        setError("Too many login attempts. Please wait before trying again.")
      } else {
        setError("An unexpected error occurred. Please try again later.")
        console.error("Login error:", err)
      }
    }
  }

  const handleForgotPassword = () => {
    router.push("/reset-password")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Log in</CardTitle>
          <CardDescription>Enter your email and password to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant={isRateLimited ? "warning" : "destructive"}>
                {isRateLimited ? <Clock className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  {error}
                  {isRateLimited && cooldownTime > 0 && (
                    <span className="block font-medium mt-1">
                      Please wait {cooldownTime} seconds before trying again.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isRateLimited}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-blue-600 hover:text-blue-800"
                  onClick={handleForgotPassword}
                  type="button"
                  disabled={isRateLimited}
                >
                  Forgot password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isRateLimited}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || isRateLimited}>
              {isLoading ? "Signing in..." : isRateLimited ? `Wait ${cooldownTime}s` : "Log in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-600 hover:text-blue-800">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
