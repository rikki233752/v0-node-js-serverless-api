import { getSupabaseBrowserClient } from "@/lib/supabase"

export interface PhoneNumberData {
  id?: string
  number: string
  location?: string
  type?: string
  status?: string
  monthly_fee?: number
  pathway_id?: string | null
  bland_number_id?: string
}

/**
 * Fetches all phone numbers for the current authenticated user
 */
export async function getUserPhoneNumbers() {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from("phone_numbers")
    .select("*, pathways(id, name)")
    .order("purchased_at", { ascending: false })

  if (error) {
    console.error("Error fetching phone numbers:", error)
    throw error
  }

  return data || []
}

/**
 * Fetches a specific phone number by ID
 */
export async function getPhoneNumberById(id: string) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("phone_numbers").select("*, pathways(id, name)").eq("id", id).single()

  if (error) {
    console.error(`Error fetching phone number ${id}:`, error)
    throw error
  }

  return data
}

/**
 * Creates a new phone number for the current user
 */
export async function createPhoneNumber(phoneNumberData: PhoneNumberData) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("phone_numbers").insert(phoneNumberData).select().single()

  if (error) {
    console.error("Error creating phone number:", error)
    throw error
  }

  return data
}

/**
 * Updates an existing phone number
 */
export async function updatePhoneNumber(id: string, phoneNumberData: Partial<PhoneNumberData>) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("phone_numbers").update(phoneNumberData).eq("id", id).select().single()

  if (error) {
    console.error(`Error updating phone number ${id}:`, error)
    throw error
  }

  return data
}

/**
 * Deletes a phone number
 */
export async function deletePhoneNumber(id: string) {
  const supabase = getSupabaseBrowserClient()

  const { error } = await supabase.from("phone_numbers").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting phone number ${id}:`, error)
    throw error
  }

  return true
}

/**
 * Assigns a pathway to a phone number
 */
export async function assignPathwayToPhoneNumber(phoneNumberId: string, pathwayId: string | null) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from("phone_numbers")
    .update({ pathway_id: pathwayId })
    .eq("id", phoneNumberId)
    .select()
    .single()

  if (error) {
    console.error(`Error assigning pathway to phone number ${phoneNumberId}:`, error)
    throw error
  }

  return data
}
