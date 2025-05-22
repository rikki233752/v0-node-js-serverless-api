import { cookies } from "next/headers"
import type { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// User type definition
export type User = {
  id: string | number
  name: string
  email: string
  role?: string
}

// Function to hash a password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10)
}

// Function to compare a password with a hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

// Function to generate a JWT token
export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

// Function to verify a JWT token
export function verifyToken(token: string): User | null {
  try {
    return jwt.verify(token, JWT_SECRET) as User
  } catch (error) {
    return null
  }
}

// Function to get the current user from cookies
export function getCurrentUser(req?: NextRequest): User | null {
  try {
    // For API routes
    if (req) {
      const token = req.cookies.get("token")?.value
      if (!token) return null
      return verifyToken(token)
    }

    // For server components
    const cookieStore = cookies()
    const token = cookieStore.get("token")?.value
    if (!token) return null
    return verifyToken(token)
  } catch (error) {
    return null
  }
}

// Function to set auth cookies
export function setAuthCookies(res: NextResponse, user: User): NextResponse {
  const token = generateToken(user)

  // Set the token as a cookie
  res.cookies.set({
    name: "token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  return res
}

// Function to clear auth cookies
export function clearAuthCookies(res: NextResponse): NextResponse {
  res.cookies.set({
    name: "token",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return res
}
