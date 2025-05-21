const { execSync } = require("child_process")
const fs = require("fs")

console.log("Starting custom build script...")

// Create .npmrc file
console.log("Creating .npmrc file...")
fs.writeFileSync(".npmrc", "legacy-peer-deps=true\nstrict-ssl=false\n")

// Install dependencies with specific flags
try {
  console.log("Installing dependencies...")
  execSync("npm ci --prefer-offline --no-audit --legacy-peer-deps", { stdio: "inherit" })
} catch (error) {
  console.log("Falling back to npm install...")
  execSync("npm install --no-audit --legacy-peer-deps", { stdio: "inherit" })
}

// Generate Prisma client
console.log("Generating Prisma client...")
execSync("npx prisma generate", { stdio: "inherit" })

// Build Next.js app
console.log("Building Next.js app...")
execSync("next build", { stdio: "inherit" })

console.log("Build completed successfully!")
