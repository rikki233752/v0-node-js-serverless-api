import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"

// Format phone number to E.164 format
function formatToE164(input: string): string {
  // Remove all non-digit characters
  const digitsOnly = input.replace(/\D/g, "")

  // Ensure it has the country code
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}` // Add US country code if not present
  } else if (digitsOnly.length > 10 && !digitsOnly.startsWith("1")) {
    return `+1${digitsOnly}` // Add + if missing but has country code
  } else if (digitsOnly.length > 10 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}` // Add + if missing and has country code
  }

  // If already in E.164 format or close enough, just ensure it has +
  return input.startsWith("+") ? input : `+${input}`
}

export async function POST(request: Request) {
  try {
    // Get the authenticated user
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { phoneNumber: number, location, type, monthlyFee } = await request.json()

    // Validate required fields
    if (!number) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Check if the number is already purchased by any user
    const { data: existingNumber } = await supabase.from("phone_numbers").select("id").eq("number", number).single()

    if (existingNumber) {
      return NextResponse.json({ error: "This number is already purchased" }, { status: 400 })
    }

    // Insert the new phone number with the current user's ID
    const { data: phoneNumberData, error } = await supabase
      .from("phone_numbers")
      .insert({
        user_id: user.id,
        number,
        location: location || "",
        type: type || "voice",
        monthly_fee: monthlyFee || 0,
        status: "active",
        purchased_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error purchasing phone number:", error)
      return NextResponse.json({ error: "Failed to purchase phone number" }, { status: 500 })
    }

    // Get the API key from environment variables
    const apiKey = process.env.BLAND_AI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Format the phone number to E.164 format
    const formattedNumber = formatToE164(number)

    console.log(`Purchasing number: ${formattedNumber} for user: ${user.id}`)

    // Call the Bland.ai API to purchase the number
    const response = await fetch("https://api.bland.ai/v1/inbound/purchase", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: formattedNumber,
        country: location || "US",
      }),
    })

    // Log the response for debugging
    const responseText = await response.text()
    console.log(`Bland.ai API response: ${responseText}`)

    let data
    try {
      // Try to parse the response as JSON
      data = JSON.parse(responseText)
    } catch (e) {
      // If parsing fails, return the raw response text
      return NextResponse.json({ error: `Failed to parse API response: ${responseText}` }, { status: 500 })
    }

    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Failed to purchase number" }, { status: response.status })
    }

    return NextResponse.json({ success: true, phoneNumber: phoneNumberData })
  } catch (error) {
    console.error("Error in purchase-number API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
