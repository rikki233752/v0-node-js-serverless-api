import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { shop_domain, customer } = body

    console.log("Received data erasure request for customer:", customer.email)

    // Log the request
    await prisma.eventLog.create({
      data: {
        id: crypto.randomUUID(),
        pixelId: "GDPR_REQUEST",
        eventName: "customer_data_erasure",
        status: "success",
        payload: JSON.stringify({ shop_domain, customer_email: customer.email }),
      },
    })

    // In a real implementation, you would delete customer data here
    // For now, we just acknowledge the request

    return NextResponse.json({
      success: true,
      message: "Data erasure request received and will be processed",
    })
  } catch (error) {
    console.error("Error processing data erasure request:", error)
    return NextResponse.json({ success: false, error: "Failed to process data erasure request" }, { status: 500 })
  }
}
