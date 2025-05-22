import { sql } from "@vercel/postgres"

export type User = {
  id: string | number
  name: string
  email: string
  password_hash?: string
  company?: string
  role?: string
  phone_number?: string
  last_login?: Date | null
  created_at?: Date
  updated_at?: Date
}

/**
 * Tests the database connection
 * @returns A promise that resolves to a boolean indicating if the connection was successful
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Simple query to test the connection
    await sql`SELECT 1 as test`
    return true
  } catch (error) {
    console.error("Database connection test failed:", error)
    return false
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as User
  } catch (error) {
    console.error("Error getting user by email:", error)
    return null
  }
}

export async function getUserById(id: string | number): Promise<User | null> {
  try {
    const result = await sql`
      SELECT * FROM users WHERE id = ${id} LIMIT 1
    `

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as User
  } catch (error) {
    console.error("Error getting user by id:", error)
    return null
  }
}

export async function createUser(userData: {
  name: string
  email: string
  password_hash: string
  company?: string
  role?: string
  phone_number?: string
}): Promise<User | null> {
  try {
    const { name, email, password_hash, company, role = "user", phone_number } = userData

    const result = await sql`
      INSERT INTO users (name, email, password_hash, company, role, phone_number, created_at, updated_at)
      VALUES (
        ${name}, 
        ${email}, 
        ${password_hash}, 
        ${company || null}, 
        ${role}, 
        ${phone_number || null},
        NOW(),
        NOW()
      )
      RETURNING id, name, email, company, role, phone_number, created_at, updated_at
    `

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as User
  } catch (error) {
    console.error("Error creating user:", error)
    return null
  }
}

export async function updateLastLogin(userId: string | number): Promise<boolean> {
  try {
    await sql`
      UPDATE users 
      SET last_login = NOW() 
      WHERE id = ${userId}
    `
    return true
  } catch (error) {
    console.error("Error updating last login:", error)
    return false
  }
}
