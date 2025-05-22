const { execSync } = require("child_process")
const fs = require("fs")

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL environment variable is not set.")
  console.warn("Some database features may not work correctly.")
}

// Run Prisma generate
console.log("Running Prisma generate...")
try {
  execSync("npx prisma generate", { stdio: "inherit" })
  console.log("Prisma client generated successfully.")
} catch (error) {
  console.error("Error generating Prisma client:", error.message)
  process.exit(1)
}

// Run Next.js build
console.log("Running Next.js build...")
try {
  execSync("next build", { stdio: "inherit" })
  console.log("Next.js build completed successfully.")
} catch (error) {
  console.error("Error building Next.js application:", error.message)
  process.exit(1)
}
