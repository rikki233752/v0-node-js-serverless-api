import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

// Create a SQL client
const sql = neon(process.env.DATABASE_URL!)

// Create a Drizzle client
export const db = drizzle(sql)

// Helper function to execute raw SQL queries
export async function executeQuery(query: string, params: any[] = []) {
  try {
    return await sql(query, params)
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

// User-related database functions
export async function getUserByEmail(email: string) {
  const query = `
    SELECT * FROM users 
    WHERE email = $1
    LIMIT 1
  `

  const result = await executeQuery(query, [email])
  return result.length > 0 ? result[0] : null
}

export async function getUserById(id: number) {
  const query = `
    SELECT * FROM users 
    WHERE id = $1
    LIMIT 1
  `

  const result = await executeQuery(query, [id])
  return result.length > 0 ? result[0] : null
}

export async function createUser(userData: {
  name: string
  email: string
  password_hash: string
  company?: string
  phone_number?: string
}) {
  const { name, email, password_hash, company, phone_number } = userData

  const query = `
    INSERT INTO users (name, email, password_hash, company, phone_number, role, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, 'User', NOW(), NOW())
    RETURNING id, name, email, company, role, phone_number, created_at
  `

  const result = await executeQuery(query, [name, email, password_hash, company || null, phone_number || null])

  return result[0]
}

export async function updateUser(
  id: number,
  userData: {
    name?: string
    company?: string
    phone_number?: string
    preferences?: Record<string, any>
  },
) {
  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  // Build dynamic update query
  Object.entries(userData).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }
  })

  if (updates.length === 0) return null

  // Add updated_at timestamp
  updates.push(`updated_at = NOW()`)

  // Add user id as the last parameter
  values.push(id)

  const query = `
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING id, name, email, company, role, phone_number, preferences, created_at, updated_at
  `

  const result = await executeQuery(query, values)
  return result[0]
}

export async function updateLastLogin(id: number) {
  const query = `
    UPDATE users
    SET last_login = NOW()
    WHERE id = $1
    RETURNING last_login
  `

  const result = await executeQuery(query, [id])
  return result[0]
}
