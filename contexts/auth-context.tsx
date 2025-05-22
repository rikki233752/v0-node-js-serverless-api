"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

export interface User {
  id: string
  email?: string | null
  name?: string | null
  company?: string | null
  phoneNumber?: string | null
  role?: string
  twoFactorEnabled?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  signup: (data: SignupData) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message: string }>
  enableTwoFactor: () => Promise<{ success: boolean; message: string; setupData?: any }>
  verifyTwoFactor: (code: string) => Promise<{ success: boolean; message: string }>
}

interface SignupData {
  email: string
  password: string
  name: string
  company?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error checking session:", error)
          setUser(null)
          setLoading(false)
          return
        }

        if (data.session) {
          // Get user profile from database
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", data.session.user.id)
            .single()

          if (userError) {
            console.error("Error fetching user profile:", userError)
            // Use basic user info from auth
            setUser({
              id: data.session.user.id,
              email: data.session.user.email,
              name: data.session.user.user_metadata?.name,
            })
          } else {
            setUser(userData)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Error in checkSession:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Get user profile from database
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (userError) {
          console.error("Error fetching user profile:", userError)
          // Use basic user info from auth
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name,
          })
        } else {
          setUser(userData)
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, message: error.message }
      }

      // Log login activity
      await supabase.from("user_login_activity").insert({
        user_id: data.user.id,
        login_timestamp: new Date().toISOString(),
        success: true,
        ip_address: "client-side", // We can't get IP on client side
        user_agent: navigator.userAgent,
      })

      // Update last login time
      await supabase.from("users").update({ last_login: new Date().toISOString() }).eq("id", data.user.id)

      return { success: true, message: "Login successful" }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, message: "An unexpected error occurred" }
    }
  }

  const signup = async (data: SignupData) => {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            company: data.company,
          },
        },
      })

      if (authError) {
        return { success: false, message: authError.message }
      }

      if (!authData.user) {
        return { success: false, message: "Failed to create user" }
      }

      // Create user profile
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: data.email,
        name: data.name,
        company: data.company,
        role: "user", // Default role
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        console.error("Error creating user profile:", profileError)
        // Continue anyway since the auth user was created
      }

      // Create default user settings
      const { error: settingsError } = await supabase.from("user_settings").insert({
        id: authData.user.id,
        plan_type: "free",
        max_pathways: 3,
        max_phone_numbers: 1,
        can_access_advanced_nodes: false,
        can_access_analytics: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (settingsError) {
        console.error("Error creating user settings:", settingsError)
        // Continue anyway since the auth user was created
      }

      return { success: true, message: "Account created successfully" }
    } catch (error) {
      console.error("Signup error:", error)
      return { success: false, message: "An unexpected error occurred" }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const updateProfile = async (data: Partial<User>) => {
    try {
      if (!user) {
        return { success: false, message: "Not logged in" }
      }

      // Update user profile
      const { error } = await supabase
        .from("users")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      // Update user in state
      setUser((prev) => (prev ? { ...prev, ...data } : null))

      return { success: true, message: "Profile updated successfully" }
    } catch (error) {
      console.error("Update profile error:", error)
      return { success: false, message: "An unexpected error occurred" }
    }
  }

  const enableTwoFactor = async () => {
    try {
      if (!user) {
        return { success: false, message: "Not logged in" }
      }

      // In a real app, you would generate a TOTP secret and QR code
      // For this example, we'll just simulate it
      const setupData = {
        qrCodeUrl: "https://placeholder.svg?height=200&width=200&query=QR%20Code%20Placeholder",
        secret: "EXAMPLESECRET123456",
      }

      return { success: true, message: "Two-factor authentication setup ready", setupData }
    } catch (error) {
      console.error("Enable 2FA error:", error)
      return { success: false, message: "An unexpected error occurred" }
    }
  }

  const verifyTwoFactor = async (code: string) => {
    try {
      if (!user) {
        return { success: false, message: "Not logged in" }
      }

      // In a real app, you would verify the TOTP code
      // For this example, we'll just check if it's "123456"
      if (code !== "123456") {
        return { success: false, message: "Invalid verification code" }
      }

      // Update user profile to enable 2FA
      const { error } = await supabase
        .from("users")
        .update({
          twoFactorEnabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        return { success: false, message: error.message }
      }

      // Update user in state
      setUser((prev) => (prev ? { ...prev, twoFactorEnabled: true } : null))

      return { success: true, message: "Two-factor authentication enabled successfully" }
    } catch (error) {
      console.error("Verify 2FA error:", error)
      return { success: false, message: "An unexpected error occurred" }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateProfile,
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
