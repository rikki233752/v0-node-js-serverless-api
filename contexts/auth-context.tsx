"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  login as loginAction,
  signup as signupAction,
  logout as logoutAction,
  updateProfile as updateProfileAction,
} from "@/app/actions/auth-actions"

export type User = {
  id: string | number
  name: string
  email: string
  company?: string
  role: string
  phoneNumber?: string
  preferences?: Record<string, any>
  lastLogin?: string
  twoFactorEnabled?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signup: (userData: SignupData) => Promise<{ success: boolean; message: string }>
  logout: () => void
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message: string }>
  isAuthenticated: boolean
  enableTwoFactor: () => Promise<{ success: boolean; message: string; setupData?: any }>
  verifyTwoFactor: (code: string) => Promise<{ success: boolean; message: string }>
}

export interface SignupData {
  name: string
  email: string
  password: string
  company?: string
  phoneNumber?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const isAuthenticated = !!user

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Try to get user from localStorage first (for backward compatibility)
        const storedUser = localStorage.getItem("bland-user")
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser))
            setIsLoading(false)
            return
          } catch (error) {
            console.error("Failed to parse stored user:", error)
            localStorage.removeItem("bland-user")
          }
        }

        // If no stored user, check for server session
        const response = await fetch("/api/auth/session")
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setUser(data.user)
          }
        }
      } catch (error) {
        console.error("Failed to check session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("email", email)
      formData.append("password", password)

      const result = await loginAction(formData)

      if (result.success && result.user) {
        setUser(result.user)
        // Store in localStorage for backward compatibility
        localStorage.setItem("bland-user", JSON.stringify(result.user))
      }

      return { success: result.success, message: result.message }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (userData: SignupData): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("name", userData.name)
      formData.append("email", userData.email)
      formData.append("password", userData.password)
      if (userData.company) formData.append("company", userData.company)
      if (userData.phoneNumber) formData.append("phoneNumber", userData.phoneNumber)

      const result = await signupAction(formData)

      if (result.success && result.user) {
        setUser(result.user)
        // Store in localStorage for backward compatibility
        localStorage.setItem("bland-user", JSON.stringify(result.user))
      }

      return { success: result.success, message: result.message }
    } catch (error) {
      console.error("Signup error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("bland-user")
    localStorage.removeItem("bland-api-key") // Also clear API key on logout
    logoutAction() // This will clear the server-side cookie and redirect
  }

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      // This would be implemented with a real password reset flow
      // For now, return a generic message
      return {
        success: true,
        message: "If your email is registered, you will receive password reset instructions.",
      }
    } catch (error) {
      console.error("Reset password error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
    }
  }

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if (!user || !user.id) {
      return { success: false, message: "You must be logged in to update your profile" }
    }

    try {
      const formData = new FormData()
      if (data.name) formData.append("name", data.name)
      if (data.company) formData.append("company", data.company)
      if (data.phoneNumber) formData.append("phoneNumber", data.phoneNumber)

      const result = await updateProfileAction(Number(user.id), formData)

      if (result.success && result.user) {
        setUser(result.user)
        // Update localStorage for backward compatibility
        localStorage.setItem("bland-user", JSON.stringify(result.user))
      }

      return { success: result.success, message: result.message }
    } catch (error) {
      console.error("Update profile error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
    }
  }

  // Placeholder for two-factor authentication
  const enableTwoFactor = async (): Promise<{ success: boolean; message: string; setupData?: any }> => {
    // This would be implemented with a real 2FA setup
    return {
      success: false,
      message: "Two-factor authentication is not yet implemented",
    }
  }

  const verifyTwoFactor = async (code: string): Promise<{ success: boolean; message: string }> => {
    // This would be implemented with a real 2FA verification
    return {
      success: false,
      message: "Two-factor authentication is not yet implemented",
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        resetPassword,
        updateProfile,
        isAuthenticated,
        enableTwoFactor,
        verifyTwoFactor,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
