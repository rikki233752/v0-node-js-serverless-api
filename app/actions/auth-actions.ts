"use server"

import { z } from "zod"
import { getUserByEmail, createUser, updateUser, updateLastLogin } from "@/lib/db"
import { hashPassword, comparePassword, createToken, setAuthCookie, clearAuthCookie } from "@/lib/auth-utils"
import { redirect } from "next/navigation"

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  company: z.string().optional(),
  phoneNumber: z.string().optional(),
})

const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  company: z.string().optional(),
  phoneNumber: z.string().optional(),
})

// Login action
export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    // Validate input
    const validatedFields = loginSchema.safeParse({ email, password })

    if (!validatedFields.success) {
      return {
        success: false,
        message: validatedFields.error.errors[0].message,
      }
    }

    // Check if user exists
    const user = await getUserByEmail(email)

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password",
      }
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash)

    if (!isPasswordValid) {
      return {
        success: false,
        message: "Invalid email or password",
      }
    }

    // Update last login
    await updateLastLogin(user.id)

    // Create and set JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
    })

    setAuthCookie(token)

    return {
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role,
        phoneNumber: user.phone_number,
        preferences: user.preferences,
        lastLogin: user.last_login,
      },
    }
  } catch (error) {
    console.error("Login error:", error)
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    }
  }
}

// Signup action
export async function signup(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const company = formData.get("company") as string
  const phoneNumber = formData.get("phoneNumber") as string

  try {
    // Validate input
    const validatedFields = signupSchema.safeParse({
      name,
      email,
      password,
      company,
      phoneNumber,
    })

    if (!validatedFields.success) {
      return {
        success: false,
        message: validatedFields.error.errors[0].message,
      }
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)

    if (existingUser) {
      return {
        success: false,
        message: "Email already in use",
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const newUser = await createUser({
      name,
      email,
      password_hash: passwordHash,
      company,
      phone_number: phoneNumber,
    })

    if (!newUser) {
      return {
        success: false,
        message: "Failed to create user account",
      }
    }

    // Create and set JWT token
    const token = await createToken({
      userId: newUser.id,
      email: newUser.email,
    })

    setAuthCookie(token)

    return {
      success: true,
      message: "Account created successfully!",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        company: newUser.company,
        role: newUser.role,
        phoneNumber: newUser.phone_number,
        preferences: newUser.preferences,
        lastLogin: newUser.last_login,
      },
    }
  } catch (error) {
    console.error("Signup error:", error)
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    }
  }
}

// Logout action
export async function logout() {
  clearAuthCookie()
  redirect("/login")
}

// Update profile action
export async function updateProfile(userId: number, formData: FormData) {
  const name = formData.get("name") as string
  const company = formData.get("company") as string
  const phoneNumber = formData.get("phoneNumber") as string

  try {
    // Validate input
    const validatedFields = profileUpdateSchema.safeParse({
      name,
      company,
      phoneNumber,
    })

    if (!validatedFields.success) {
      return {
        success: false,
        message: validatedFields.error.errors[0].message,
      }
    }

    // Update user
    const updatedUser = await updateUser(userId, {
      name,
      company,
      phone_number: phoneNumber,
    })

    if (!updatedUser) {
      return {
        success: false,
        message: "Failed to update profile",
      }
    }

    return {
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        company: updatedUser.company,
        role: updatedUser.role,
        phoneNumber: updatedUser.phone_number,
        preferences: updatedUser.preferences,
        lastLogin: updatedUser.last_login,
      },
    }
  } catch (error) {
    console.error("Update profile error:", error)
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    }
  }
}
