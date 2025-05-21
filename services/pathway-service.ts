import { getSupabaseBrowserClient } from "@/lib/supabase"
import { getSupabaseServerClient } from "@/lib/supabase"

export interface PathwayData {
  id?: string
  name: string
  description?: string
  nodes?: any
  edges?: any
  bland_pathway_id?: string
  is_published?: boolean
}

export async function getUserPathways() {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("pathways").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching pathways:", error)
    throw error
  }

  return data || []
}

export async function getPathwayById(id: string) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("pathways").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching pathway ${id}:`, error)
    throw error
  }

  return data
}

export async function createPathway(pathwayData: PathwayData) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("pathways").insert(pathwayData).select().single()

  if (error) {
    console.error("Error creating pathway:", error)
    throw error
  }

  return data
}

export async function updatePathway(id: string, pathwayData: Partial<PathwayData>) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from("pathways")
    .update({
      ...pathwayData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error(`Error updating pathway ${id}:`, error)
    throw error
  }

  return data
}

export async function deletePathway(id: string) {
  const supabase = getSupabaseBrowserClient()

  const { error } = await supabase.from("pathways").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting pathway ${id}:`, error)
    throw error
  }

  return true
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
