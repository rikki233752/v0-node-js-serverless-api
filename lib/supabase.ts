import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the browser
const createBrowserClient = () => {
  // Try to get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  // Log for debugging
  console.log("Supabase URL available:", !!supabaseUrl)
  console.log("Supabase Anon Key available:", !!supabaseAnonKey)

  // If environment variables are missing, return a mock client
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase environment variables are missing. Using mock client.")

    // Return a mock client that won't throw errors
    return createMockClient()
  }

  // Create and return the real client
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Create a mock client that won't throw errors
const createMockClient = () => {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: {}, error: { message: "Supabase not configured" } }),
      signUp: () => Promise.resolve({ data: {}, error: { message: "Supabase not configured" } }),
      signOut: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: () => Promise.resolve({ error: { message: "Supabase not configured" } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: { message: "Supabase not configured" } }),
      }),
      insert: () => Promise.resolve({ error: { message: "Supabase not configured" } }),
    }),
  }
}

// For client components (singleton pattern)
let browserClient = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient()
  }
  return browserClient
}

// For server components and API routes
export function getSupabaseServerClient() {
  // Try to get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // If environment variables are missing, return a mock client
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("Supabase server environment variables are missing. Using mock client.")
    return createMockClient()
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
