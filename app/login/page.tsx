"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { login, isLoading } = useAuth()
  const router = useRouter()
  const [isUnconfirmedEmail, setIsUnconfirmedEmail] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsUnconfirmedEmail(false)

    if (!email) {
      setError("Email is required")
      return
    }

    if (!password) {
      setError("Password is required")
      return
    }

    const result = await login(email, password)

    if (result.success) {
      router.push("/dashboard")
    } else {
      // Check if the error is about unconfirmed email
      if (result.message.includes("Email not confirmed") || result.message.includes("Email confirmation required")) {
        setIsUnconfirmedEmail(true)
      }
      setError(result.message)
    }
  }

  const handleForgotPassword = () => {
    router.push("/reset-password")
  }

  const resendConfirmationEmail = async () => {
    try {
      setError("")

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      })

      if (error) {
        setError(`Failed to resend confirmation email: ${error.message}`)
        return
      }

      setError("")
      setIsUnconfirmedEmail(false)
      alert("Confirmation email has been resent. Please check your inbox.")
    } catch (error) {
      console.error("Error resending confirmation:", error)
      setError("An unexpected error occurred. Please try again.")
    }
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
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isUnconfirmedEmail && (
              <Button type="button" variant="outline" className="w-full mt-2" onClick={resendConfirmationEmail}>
                Resend Confirmation Email
              </Button>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                >
                  Forgot password?
                </Button>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
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
