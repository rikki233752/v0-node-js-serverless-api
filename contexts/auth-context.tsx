"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export type User = {
  id: string
  name: string | null
  email: string
  company: string | null
  role: string
  phoneNumber?: string | null
  preferences?: Record<string, any>
  lastLogin?: string
}

export interface SignupData {
  name: string
  email: string
  password: string
  company?: string
  phoneNumber?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signup: (userData: SignupData) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message: string }>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// For demo purposes - would be replaced with actual API calls
const MOCK_USERS_KEY = "bland-mock-users"

const getMockUsers = (): Record<string, User & { password: string }> => {
  if (typeof window === "undefined") return {}
  const users = localStorage.getItem(MOCK_USERS_KEY)
  return users ? JSON.parse(users) : {}
}

const saveMockUsers = (users: Record<string, User & { password: string }>) => {
  if (typeof window === "undefined") return
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const isAuthenticated = !!user

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true)

      try {
        // Try to get session from Supabase
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.warn("Error getting Supabase session, falling back to local storage:", error.message)
          // Fall back to localStorage
          const storedUser = localStorage.getItem("bland-user")
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser))
            } catch (error) {
              console.error("Failed to parse stored user:", error)
              localStorage.removeItem("bland-user")
            }
          }
        } else if (data.session) {
          // We have a Supabase session
          try {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.session.user.id)
              .single()

            if (profileError) {
              console.warn("Error fetching profile, using basic user data:", profileError.message)
              setUser({
                id: data.session.user.id,
                name: data.session.user.user_metadata?.name || null,
                email: data.session.user.email || "",
                company: data.session.user.user_metadata?.company || null,
                role: "User",
                lastLogin: data.session.user.last_sign_in_at,
              })
            } else {
              setUser({
                id: data.session.user.id,
                name: profile.name,
                email: data.session.user.email || "",
                company: profile.company,
                role: "User",
                phoneNumber: profile.phone_number,
                lastLogin: data.session.user.last_sign_in_at,
              })
            }
          } catch (error) {
            console.error("Error processing user profile:", error)
          }
        } else {
          // No session, check localStorage for mock auth
          const storedUser = localStorage.getItem("bland-user")
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser))
            } catch (error) {
              console.error("Failed to parse stored user:", error)
              localStorage.removeItem("bland-user")
            }
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        // Fall back to localStorage
        const storedUser = localStorage.getItem("bland-user")
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser))
          } catch (error) {
            console.error("Failed to parse stored user:", error)
            localStorage.removeItem("bland-user")
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  // Set up auth state change listener
  useEffect(() => {
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          try {
            const { data: profile, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single()

            if (error) {
              console.warn("Error fetching profile on auth change:", error.message)
              setUser({
                id: session.user.id,
                name: session.user.user_metadata?.name || null,
                email: session.user.email || "",
                company: session.user.user_metadata?.company || null,
                role: "User",
                lastLogin: session.user.last_sign_in_at,
              })
            } else {
              setUser({
                id: session.user.id,
                name: profile.name,
                email: session.user.email || "",
                company: profile.company,
                role: "User",
                phoneNumber: profile.phone_number,
                lastLogin: session.user.last_sign_in_at,
              })
            }
          } catch (error) {
            console.error("Error processing user profile on auth change:", error)
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null)
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error("Error setting up auth state change listener:", error)
    }
  }, [])

  const signup = async (userData: SignupData): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      // Try Supabase signup
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            company: userData.company,
            phone_number: userData.phoneNumber,
          },
        },
      })

      if (error) {
        console.warn("Supabase signup error, falling back to mock:", error.message)
        // Fall back to mock signup
        return mockSignup(userData)
      }

      if (data.user) {
        return {
          success: true,
          message: "Account created successfully! Redirecting to dashboard...",
        }
      } else {
        return {
          success: true,
          message: "Please check your email to confirm your account.",
        }
      }
    } catch (error) {
      console.error("Signup error:", error)
      // Fall back to mock signup
      return mockSignup(userData)
    } finally {
      setIsLoading(false)
    }
  }

  const mockSignup = async (userData: SignupData): Promise<{ success: boolean; message: string }> => {
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
      console.error("Mock signup error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      // Try Supabase login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.warn("Supabase login error, falling back to mock:", error.message)
        // Fall back to mock login
        return mockLogin(email, password)
      }

      if (data.user) {
        return { success: true, message: "Login successful" }
      } else {
        return { success: false, message: "Something went wrong. Please try again." }
      }
    } catch (error) {
      console.error("Login error:", error)
      // Fall back to mock login
      return mockLogin(email, password)
    } finally {
      setIsLoading(false)
    }
  }

  const mockLogin = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
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
      console.error("Mock login error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
    }
  }

  const logout = async () => {
    try {
      // Try Supabase logout
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      // Always clear local storage and state
      setUser(null)
      localStorage.removeItem("bland-user")
      localStorage.removeItem("bland-api-key")
      router.push("/login")
    }
  }

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Try Supabase password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        console.warn("Supabase password reset error, falling back to mock:", error.message)
        // Fall back to mock password reset
        return mockResetPassword(email)
      }

      return {
        success: true,
        message: "If your email is registered, you will receive password reset instructions.",
      }
    } catch (error) {
      console.error("Reset password error:", error)
      // Fall back to mock password reset
      return mockResetPassword(email)
    }
  }

  const mockResetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800))

      // In a real app, we would send a password reset email here
      // For demo, we'll simulate it was sent

      return {
        success: true,
        message: "If your email is registered, you will receive password reset instructions.",
      }
    } catch (error) {
      console.error("Mock reset password error:", error)
      return { success: false, message: "An unexpected error occurred. Please try again." }
    }
  }

  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "You must be logged in to update your profile" }
    }

    try {
      // Try Supabase profile update
      const { error } = await supabase
        .from("profiles")
        .update({
          name: data.name,
          company: data.company,
          phone_number: data.phoneNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        console.warn("Supabase profile update error, falling back to mock:", error.message)
        // Fall back to mock profile update
        return mockUpdateProfile(data)
      }

      // Update local user state
      setUser((prev) => (prev ? { ...prev, ...data } : null))

      return { success: true, message: "Profile updated successfully" }
    } catch (error) {
      console.error("Update profile error:", error)
      // Fall back to mock profile update
      return mockUpdateProfile(data)
    }
  }

  const mockUpdateProfile = async (data: Partial<User>): Promise<{ success: boolean; message: string }> => {
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
      console.error("Mock update profile error:", error)
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
