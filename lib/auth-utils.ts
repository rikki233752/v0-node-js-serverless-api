import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import type { NextRequest } from "next/server"
import * as bcrypt from "bcryptjs"

// Secret key for JWT verification
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface User {
  id: string
  email?: string | null
  name?: string | null
}

// Get user from request (server-side)
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  try {
    // Try to get the token from the Authorization header
    const authHeader = req.headers.get("authorization")
    let token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    // If no token in header, try to get from cookies
    if (!token) {
      const cookieStore = cookies()
      token = cookieStore.get("authToken")?.value
    }

    if (!token) {
      // No token found
      return null
    }

    // Verify the token
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET))

    // Return the user data from the token
    return payload.user as User
  } catch (error) {
    console.error("Error verifying token:", error)
    return null
  }
}

// Get user from cookies (client-side)
export function getUserFromLocalStorage(): User | null {
  if (typeof window === "undefined") {
    return null
  }

  const userJson = localStorage.getItem("user")
  if (!userJson) {
    return null
  }

  try {
    return JSON.parse(userJson)
  } catch (error) {
    console.error("Error parsing user from localStorage:", error)
    return null
  }
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return bcrypt.hash(password, saltRounds)
}

// Compare a password with a hash
export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
