import { hashPassword } from "./auth"

// In-memory user store for testing
export type MockUser = {
  id: string
  name: string
  email: string
  password_hash: string
  role: string
}

// Mock users database
const users: MockUser[] = []

// Function to find a user by email
export async function findUserByEmail(email: string): Promise<MockUser | null> {
  return users.find((user) => user.email === email) || null
}

// Function to find a user by ID
export async function findUserById(id: string): Promise<MockUser | null> {
  return users.find((user) => user.id === id) || null
}

// Function to create a new user
export async function createUser(userData: {
  name: string
  email: string
  password: string
  role?: string
}): Promise<MockUser> {
  const { name, email, password, role = "user" } = userData

  // Check if user already exists
  const existingUser = await findUserByEmail(email)
  if (existingUser) {
    throw new Error("User already exists")
  }

  // Hash the password
  const password_hash = await hashPassword(password)

  // Create a new user
  const newUser: MockUser = {
    id: Date.now().toString(),
    name,
    email,
    password_hash,
    role,
  }

  // Add the user to the store
  users.push(newUser)

  return newUser
}

// Function to seed initial admin user
export async function seedAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_USERNAME || "admin@example.com"
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123"

    // Check if admin already exists
    const existingAdmin = await findUserByEmail(adminEmail)
    if (!existingAdmin) {
      await createUser({
        name: "Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
      })
      console.log("Admin user seeded successfully")
    }
  } catch (error) {
    console.error("Error seeding admin user:", error)
  }
}

// Seed the admin user on module load
seedAdminUser()
