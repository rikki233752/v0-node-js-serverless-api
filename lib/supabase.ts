import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the browser
let browserClient = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    try {
      // Check if environment variables are available
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase environment variables are missing, using mock client")
        browserClient = createMockClient()
      } else {
        browserClient = createClient(supabaseUrl, supabaseAnonKey)
      }
    } catch (error) {
      console.error("Error creating Supabase browser client:", error)
      browserClient = createMockClient()
    }
  }

  return browserClient
}

// Server-side client (for API routes)
export function getSupabaseServerClient() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase server environment variables are missing, using mock client")
      return createMockClient()
    }

    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  } catch (error) {
    console.error("Error creating Supabase server client:", error)
    return createMockClient()
  }
}

// Create a mock client that won't throw errors
function createMockClient() {
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () =>
        Promise.resolve({
          data: { user: null, session: null },
          error: { message: "Mock auth: Supabase not configured" },
        }),
      signUp: () =>
        Promise.resolve({
          data: { user: null, session: null },
          error: { message: "Mock auth: Supabase not configured" },
        }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      resetPasswordForEmail: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }
}
