export default function DatabaseErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Database Connection Error</h1>
        <p className="mb-4">
          The application cannot connect to the database. This is likely because the DATABASE_URL environment variable
          is not properly configured.
        </p>
        <h2 className="text-lg font-semibold mt-6 mb-2">How to fix this:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Go to your Vercel project settings</li>
          <li>Navigate to the Environment Variables section</li>
          <li>
            Add or update the <code className="bg-gray-100 px-1 py-0.5 rounded">DATABASE_URL</code> variable with your
            database connection string
          </li>
          <li>Redeploy your application</li>
        </ol>
        <p className="mt-6 text-sm text-gray-600">
          If you continue to experience issues, please check your database connection or contact support.
        </p>
      </div>
    </div>
  )
}
