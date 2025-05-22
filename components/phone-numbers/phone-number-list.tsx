"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, ArrowRight, Plus, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import type { PhoneNumber } from "@/lib/db-utils"

export default function PhoneNumberList() {
  const router = useRouter()
  const { user } = useAuth()
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch if user is authenticated
    if (!user) {
      setIsLoading(false)
      return
    }

    // Fetch phone numbers from the API
    const fetchPhoneNumbers = async () => {
      try {
        setIsLoading(true)

        // Use the API endpoint that filters by user_id
        const response = await fetch("/api/phone-numbers")

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        const data = await response.json()

        // Check if we have valid data
        if (data && Array.isArray(data)) {
          setPhoneNumbers(data)
        } else {
          console.warn("Unexpected data format:", data)
          setPhoneNumbers([])
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching phone numbers:", err)
        setError("Failed to load phone numbers. Please try again later.")
        setIsLoading(false)
      }
    }

    fetchPhoneNumbers()
  }, [user])

  const handleManagePathway = (phoneNumber: string) => {
    // Normalize the phone number to use as a route parameter
    const normalizedNumber = phoneNumber.replace(/\D/g, "")
    router.push(`/dashboard/pathway/${normalizedNumber}`)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">My Phone Numbers</h1>
        <Button className="flex items-center gap-2" onClick={() => router.push("/dashboard/phone-numbers/purchase")}>
          <Plus size={16} />
          Purchase New Number
        </Button>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
            <p className="text-muted-foreground">Loading phone numbers...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : phoneNumbers.length === 0 ? (
          <div className="text-center py-12">
            <Phone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Phone Numbers Found</h3>
            <p className="text-muted-foreground mb-6">You need to purchase a phone number before creating a pathway.</p>
            <Button onClick={() => router.push("/dashboard/phone-numbers/purchase")}>Purchase a Number</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {phoneNumbers.map((number) => (
              <Card key={number.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{number.number}</CardTitle>
                      <CardDescription>
                        {number.location || "Unknown Location"} • {number.type || "Voice"}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        number.status?.toLowerCase() === "active" || number.status?.toLowerCase() === "purchased"
                          ? "default"
                          : "outline"
                      }
                    >
                      {number.status || "Available"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-2 h-4 w-4" />
                    <span>One pathway per phone number</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleManagePathway(number.number)}
                  >
                    Manage Pathway
                    <ArrowRight size={16} />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
