import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { getUserById } from "./db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret_for_development_only")
const TOKEN_EXPIRY = "7d"

export type JWTPayload = {
  userId: number
  email: string
}

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Compare a password with a hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Create a JWT token
export async function createToken(payload: JWTPayload): Promise<string> {
  try {
    const token = await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(JWT_SECRET)

    return token
  } catch (error) {
    console.error("Error creating token:", error)
    throw new Error("Failed to create authentication token")
  }
}

// Verify a JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as JWTPayload
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

// Set auth cookie
export function setAuthCookie(token: string): void {
  cookies().set({
    name: "auth-token",
    value: token,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
  })
}

// Clear auth cookie
export function clearAuthCookie(): void {
  cookies().delete("auth-token")
}

// Get current user from cookie
export async function getCurrentUser() {
  try {
    const token = cookies().get("auth-token")?.value

    if (!token) {
      return null
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) return null

    const user = await getUserById(payload.userId)
    if (!user) return null

    // Remove sensitive data
    delete user.password_hash

    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}
