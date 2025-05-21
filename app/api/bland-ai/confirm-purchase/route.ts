import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, subscriptionId, country } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 })
    }

    console.log(`Processing purchase for ${phoneNumber} with subscription ${subscriptionId}`)

    // Get the API key from environment variables
    const apiKey = process.env.BLAND_AI_API_KEY

    if (!apiKey) {
      console.error("Missing Bland.ai API key")
      return NextResponse.json({ error: "Server configuration error. Please contact support." }, { status: 500 })
    }

    // Call Bland.ai API to purchase the number
    const blandResponse = await fetch("https://api.bland.ai/v1/phone-numbers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        country,
      }),
    })

    if (!blandResponse.ok) {
      let errorData
      try {
        errorData = await blandResponse.json()
      } catch (e) {
        errorData = { error: `Failed to parse error response: ${await blandResponse.text()}` }
      }

      console.error("Bland.ai API error:", errorData)

      // If this is a demo environment, simulate success
      if (process.env.NODE_ENV === "development" && !apiKey.startsWith("bland_live_")) {
        console.log("Development mode: Simulating successful purchase")
        return NextResponse.json({
          success: true,
          message: "Number purchased successfully (simulated)",
          subscriptionId,
          phoneNumber,
        })
      }

      return NextResponse.json(
        { error: errorData.error || "Failed to purchase number from provider" },
        { status: blandResponse.status },
      )
    }

    const blandData = await blandResponse.json()

    // In a production environment, we would store the subscription details in a database
    // This would include the user ID, phone number, subscription ID, and status
    /*
    await db.subscriptions.create({
      userId: session.user.id,
      phoneNumber,
      subscriptionId,
      status: 'active',
      createdAt: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    })
    */

    return NextResponse.json({
      success: true,
      message: "Number purchased successfully",
      data: blandData,
      subscriptionId,
    })
  } catch (error) {
    console.error("Error processing purchase:", error)
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}
