import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const targetNumber = searchParams.get("number") // e.g., "+19787836427"

  if (!targetNumber) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
  }

  try {
    const apiKey = process.env.BLAND_AI_API_KEY

    const blandRes = await fetch("https://api.bland.ai/v1/calls", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const data = await blandRes.json()
    const calls = Array.isArray(data.calls) ? data.calls : []

    const normalize = (n: string | null | undefined) => {
      if (!n || typeof n !== "string") return ""
      return n.replace(/\D/g, "")
    }

    const normalizedTarget = normalize(targetNumber)
    const filteredCalls = calls.filter((call) => normalize(call.to) === normalizedTarget)

    return NextResponse.json(filteredCalls)
  } catch (error) {
    console.error("Error fetching call history:", error)
    return NextResponse.json({ error: "Failed to fetch call history" }, { status: 500 })
  }
}
