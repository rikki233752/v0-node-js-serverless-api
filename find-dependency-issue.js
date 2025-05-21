const fs = require("fs")
const path = require("path")

// Read package.json
const packageJson = require("./package.json")

console.log("Analyzing dependencies...")

// Check for potential circular dependencies
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
}

// Look for packages that might cause the 'matches' error
const problematicPatterns = ["react-day-picker", "date-fns", "react-datepicker", "moment", "dayjs"]

const potentialIssues = []

for (const [pkg, version] of Object.entries(dependencies)) {
  for (const pattern of problematicPatterns) {
    if (pkg.includes(pattern)) {
      potentialIssues.push({ package: pkg, version })
    }
  }
}

console.log("Potential problematic packages:")
console.log(potentialIssues)

// Check for version conflicts
const versionMap = {}
for (const [pkg, version] of Object.entries(dependencies)) {
  const baseName = pkg.split("/")[0]
  if (!versionMap[baseName]) {
    versionMap[baseName] = []
  }
  versionMap[baseName].push({ fullName: pkg, version })
}

const conflicts = Object.entries(versionMap)
  .filter(([_, versions]) => versions.length > 1)
  .filter(([_, versions]) => {
    const uniqueVersions = new Set(versions.map((v) => v.version))
    return uniqueVersions.size > 1
  })

console.log("\nPotential version conflicts:")
console.log(conflicts)
