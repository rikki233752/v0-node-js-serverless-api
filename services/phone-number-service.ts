import { getSupabaseBrowserClient } from "@/lib/supabase"

export interface PhoneNumberData {
  id?: string
  number: string
  location?: string
  type?: string
  status?: string
  monthly_fee?: number
  pathway_id?: string
  bland_number_id?: string
}

export async function getUserPhoneNumbers() {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("phone_numbers").select("*").order("purchased_at", { ascending: false })

  if (error) {
    console.error("Error fetching phone numbers:", error)
    throw error
  }

  return data || []
}

export async function getPhoneNumberById(id: string) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("phone_numbers").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching phone number ${id}:`, error)
    throw error
  }

  return data
}

export async function createPhoneNumber(phoneNumberData: PhoneNumberData) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("phone_numbers").insert(phoneNumberData).select().single()

  if (error) {
    console.error("Error creating phone number:", error)
    throw error
  }

  return data
}

export async function updatePhoneNumber(id: string, phoneNumberData: Partial<PhoneNumberData>) {
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase.from("phone_numbers").update(phoneNumberData).eq("id", id).select().single()

  if (error) {
    console.error(`Error updating phone number ${id}:`, error)
    throw error
  }

  return data
}

export async function deletePhoneNumber(id: string) {
  const supabase = getSupabaseBrowserClient()

  const { error } = await supabase.from("phone_numbers").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting phone number ${id}:`, error)
    throw error
  }

  return true
}

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
