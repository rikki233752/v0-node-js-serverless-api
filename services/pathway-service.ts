import { getSupabaseBrowserClient } from "@/lib/supabase"
import { getSupabaseServerClient } from "@/lib/supabase"

export interface PathwayData {
  id: string
  name: string
  description: string | null
  nodes: any
  edges: any
  created_at: string
  updated_at: string
  bland_pathway_id: string | null
  is_published: boolean
}

/**
 * Fetches all pathways for the current authenticated user
 */
export async function getUserPathways() {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("pathways").select("*").order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching pathways:", error)
    throw error
  }

  return data || []
}

/**
 * Fetches a specific pathway by ID
 */
export async function getPathwayById(id: string) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("pathways").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching pathway ${id}:`, error)
    throw error
  }

  return data
}

/**
 * Creates a new pathway for the current user
 */
export async function createPathway(pathwayData: Omit<PathwayData, "id" | "created_at" | "updated_at" | "user_id">) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("pathways").insert(pathwayData).select().single()

  if (error) {
    console.error("Error creating pathway:", error)
    throw error
  }

  return data
}

/**
 * Updates an existing pathway
 */
export async function updatePathway(
  id: string,
  pathwayData: Partial<Omit<PathwayData, "id" | "created_at" | "updated_at" | "user_id">>,
) {
  const supabase = getSupabaseBrowserClient()

  // Add updated_at timestamp
  const dataWithTimestamp = {
    ...pathwayData,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from("pathways").update(dataWithTimestamp).eq("id", id).select().single()

  if (error) {
    console.error(`Error updating pathway ${id}:`, error)
    throw error
  }

  return data
}

/**
 * Deletes a pathway
 */
export async function deletePathway(id: string) {
  const supabase = getSupabaseBrowserClient()

  const { error } = await supabase.from("pathways").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting pathway ${id}:`, error)
    throw error
  }

  return true
}

/**
 * Publishes a pathway by setting is_published to true
 */
export async function publishPathway(id: string, blandPathwayId: string) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from("pathways")
    .update({
      is_published: true,
      bland_pathway_id: blandPathwayId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error(`Error publishing pathway ${id}:`, error)
    throw error
  }

  return data
}

/**
 * Unpublishes a pathway by setting is_published to false
 */
export async function unpublishPathway(id: string) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from("pathways")
    .update({
      is_published: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error(`Error unpublishing pathway ${id}:`, error)
    throw error
  }

  return data
}

// Server-side functions
export async function getPathwayByIdServer(id: string, userId: string) {
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase.from("pathways").select("*").eq("id", id).eq("user_id", userId).single()

  if (error) {
    console.error(`Error fetching pathway ${id}:`, error)
    throw error
  }

  return data
}
