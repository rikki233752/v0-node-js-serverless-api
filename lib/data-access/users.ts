import { db, executeDbOperation } from "../db"
import { users } from "../schema"
import { eq } from "drizzle-orm"
import { hashPassword, comparePasswords } from "../auth-utils"

export async function getUserById(id: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(users).where(eq(users.id, id))
    return result[0] || null
  })
}

export async function getUserByEmail(email: string) {
  return executeDbOperation(async () => {
    const result = await db.select().from(users).where(eq(users.email, email))
    return result[0] || null
  })
}

export async function createUser(userData: {
  name: string
  email: string
  password: string
  company?: string
  phoneNumber?: string
}) {
  return executeDbOperation(async () => {
    const passwordHash = await hashPassword(userData.password)

    const result = await db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        passwordHash,
        company: userData.company,
        phoneNumber: userData.phoneNumber,
      })
      .returning()

    return result[0]
  })
}

export async function updateUser(
  id: string,
  userData: {
    name?: string
    email?: string
    password?: string
    company?: string
    phoneNumber?: string
  },
) {
  return executeDbOperation(async () => {
    const updateData: any = { ...userData }

    if (userData.password) {
      updateData.passwordHash = await hashPassword(userData.password)
      delete updateData.password
    }

    const result = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()

    return result[0]
  })
}

export async function updateLastLogin(id: string) {
  return executeDbOperation(async () => {
    const result = await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id)).returning()

    return result[0]
  })
}

export async function authenticateUser(email: string, password: string) {
  return executeDbOperation(async () => {
    const user = await getUserByEmail(email)

    if (!user.data) {
      return null
    }

    const isPasswordValid = await comparePasswords(password, user.data.passwordHash)

    if (!isPasswordValid) {
      return null
    }

    await updateLastLogin(user.data.id)

    // Don't return the password hash
    const { passwordHash, ...userWithoutPassword } = user.data
    return userWithoutPassword
  })
}
