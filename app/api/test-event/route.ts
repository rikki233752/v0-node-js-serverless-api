import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"

export async function POST(request: Request) {
  try {
    // Connect to the database
    const { success, prisma, error: dbError } = await connectToDatabase()

    if (!success || !prisma) {
      console.error("Database connection failed:", dbError)
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed. Please try again later.",
        },
        { status: 500 },
      )
    }

    // Parse the request body
    const body = await request.json()

    // Extract data
    const { pixelId, eventName = "TestEvent", status = "success", response = null, error = null } = body

    // Validate required fields
    if (!pixelId) {
      return NextResponse.json({ success: false, error: "Pixel ID is required" }, { status: 400 })
    }

    // Check if the pixel exists
    const pixelExists = await prisma.pixelConfig.findUnique({
      where: { pixelId },
    })

    if (!pixelExists) {
      return NextResponse.json(
        {
          success: false,
          error: "Pixel ID not found in database",
        },
        { status: 404 },
      )
    }

    // Create a test event log
    const eventLog = await prisma.eventLog.create({
      data: {
        id: crypto.randomUUID(),
        pixelId,
        eventName,
        status,
        response: response ? JSON.stringify(response) : null,
        error: error ? JSON.stringify(error) : null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Test event created successfully",
      eventId: eventLog.id,
    })
  } catch (error) {
    console.error("Error creating test event:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
