import { NextResponse } from "next/server"
import { getAccessToken } from "@/lib/pixel-tokens"

export async function POST(request: Request) {
  try {
    const { pixelId } = await request.json()

    if (!pixelId) {
      return NextResponse.json({ error: "Pixel ID required" }, { status: 400 })
    }

    const accessToken = await getAccessToken(pixelId)

    if (!accessToken) {
      return NextResponse.json({ error: "No access token found for this pixel" }, { status: 400 })
    }

    // Check pixel info and permissions
    const pixelInfoResponse = await fetch(
      `https://graph.facebook.com/v17.0/${pixelId}?fields=name,creation_time,last_fired_time&access_token=${accessToken}`,
    )

    const pixelInfo = await pixelInfoResponse.json()

    // Check if we can access the events endpoint
    const eventsResponse = await fetch(`https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${accessToken}`)

    const eventsCheck = await eventsResponse.json()

    // Check token info
    const tokenResponse = await fetch(`https://graph.facebook.com/v17.0/me?access_token=${accessToken}`)

    const tokenInfo = await tokenResponse.json()

    return NextResponse.json({
      pixelInfo,
      eventsCheck: {
        status: eventsResponse.status,
        canAccess: eventsResponse.ok,
        response: eventsCheck,
      },
      tokenInfo,
      accessToken: accessToken.substring(0, 10) + "...", // Masked
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message,
        details: "Failed to check permissions",
      },
      { status: 500 },
    )
  }
}
