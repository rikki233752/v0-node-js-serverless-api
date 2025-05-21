import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get("phoneNumber")

    // Get the API key from environment variables
    const apiKey = process.env.BLAND_AI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Call the Bland.ai API to get calls
    const response = await fetch("https://api.bland.ai/v1/calls", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch calls from Bland.ai" }, { status: response.status })
    }

    const data = await response.json()

    // Access the calls array from the response object
    const calls = Array.isArray(data.calls) ? data.calls : []

    // If a phone number is provided, filter the calls
    let filteredCalls = calls
    if (phoneNumber) {
      // Safer normalize function with null/undefined checks
      const normalize = (num: string | null | undefined) => {
        if (!num || typeof num !== "string") return ""
        return num.replace(/\D/g, "")
      }

      const normalizedTargetNumber = normalize(phoneNumber)

      // Filter calls with defensive checks
      filteredCalls = calls.filter((call: any) => {
        // Skip calls with missing 'to' field
        if (!call || !call.to) return false
        return normalize(call.to) === normalizedTargetNumber
      })
    }

    return NextResponse.json(filteredCalls)
  } catch (error) {
    console.error("Error fetching calls:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
