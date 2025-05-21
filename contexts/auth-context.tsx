"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

export type User = {
  id: string
  name: string
  email: string
  company: string
  role: string
  phoneNumber?: string
  preferences?: Record<string, any>
  lastLogin?: string
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
}

export interface SignupData {
  name: string
  email: string
  password: string
  company?: string
  phoneNumber?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// For demo purposes - would be replaced with actual API calls
const MOCK_USERS_KEY = "bland-mock-users"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const isAuthenticated = !!user

  // Load user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("bland-user")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error("Failed to parse stored user:", error)
        localStorage.removeItem("bland-user")
      }
    }
    setIsLoading(false)
  }, [])

  // Mock user storage - in a real app, this would be handled by a backend
  const getMockUsers = (): Record<string, User & { password: string }> => {
    const users = localStorage.getItem(MOCK_USERS_KEY)
    return users ? JSON.parse(users) : {}
  }

  const saveMockUsers = (users: Record<string, User & { password: string }>) => {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
  }

  const signup = async (userData: SignupData): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800))

      const users = getMockUsers()

      // Check if email already exists
      if (users[userData.email]) {
        return { success: false, message: "Email already in use" }
      }

      // Validate password strength
      if (userData.password.length < 8) {
        return { success: false, message: "Password must be at least 8 characters long" }
      }

      // Create new user
      const newUser: User & { password: string } = {
        id: `user_${Date.now()}`,
        name: userData.name,
        email: userData.email,
        company: userData.company || userData.email.split("@")[1].split(".")[0],
        role: "User",
        password: userData.password, // In a real app, this would be hashed
        phoneNumber: userData.phoneNumber,
        lastLogin: new Date().toISOString(),
      }

      // Save user
      users[userData.email] = newUser
      saveMockUsers(users)

      // Set the user as logged in immediately after signup
      const sessionUser = { ...newUser }
      delete sessionUser.password // Remove password from session data
      setUser(sessionUser)
      localStorage.setItem("bland-user", JSON.stringify(sessionUser))

      return {
        success: true,
        message: "Account created successfully! Redirecting to dashboard...",
      }
    } catch (error) {
      console.error("Signup error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800))

      const users = getMockUsers()
      const user = users[email]

      // Check if user exists and password matches
      if (!user || user.password !== password) {
        return { success: false, message: "Invalid email or password" }
      }

      // Update last login
      user.lastLogin = new Date().toISOString()
      users[email] = user
      saveMockUsers(users)

      // Create session
      const sessionUser = { ...user }
      delete sessionUser.password // Remove password from session data

      setUser(sessionUser)
      localStorage.setItem("bland-user", JSON.stringify(sessionUser))

      return { success: true, message: "Login successful" }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("bland-user")
    localStorage.removeItem("bland-api-key") // Also clear API key on logout
    router.push("/login")
  }

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800))

      const users = getMockUsers()

      // Check if user exists
      if (!users[email]) {
        // For security, don't reveal if email exists or not
        return {
          success: true,
          message: "If your email is registered, you will receive password reset instructions.",
        }
      }

      // In a real app, we would send a password reset email here
      // For demo, we'll simulate it was sent

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
    if (!user) {
      return { success: false, message: "You must be logged in to update your profile" }
    }

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800))

      const users = getMockUsers()
      const currentUser = users[user.email]

      if (!currentUser) {
        return { success: false, message: "User not found" }
      }

      // Update user data
      const updatedUser = { ...currentUser, ...data }
      users[user.email] = updatedUser
      saveMockUsers(users)

      // Update session
      const sessionUser = { ...updatedUser }
      delete sessionUser.password

      setUser(sessionUser)
      localStorage.setItem("bland-user", JSON.stringify(sessionUser))

      return { success: true, message: "Profile updated successfully" }
    } catch (error) {
      console.error("Update profile error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
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
