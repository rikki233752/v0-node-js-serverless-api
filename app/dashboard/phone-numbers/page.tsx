"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import PhoneNumberList from "@/components/phone-numbers/phone-number-list"

export default function PhoneNumbersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([])
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
        const response = await fetch("/api/bland-ai/user-phone-numbers")

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

  const filteredNumbers = phoneNumbers.filter(
    (phone) =>
      phone.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.type?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phone Numbers</h1>
          <p className="text-muted-foreground">Manage your purchased phone numbers and their assignments</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => router.push("/dashboard/phone-numbers/purchase")}>
          <Plus className="h-4 w-4" />
          Purchase New Number
        </Button>
      </div>

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
      ) : (
        <PhoneNumberList phoneNumbers={filteredNumbers} isLoading={isLoading} error={error} />
      )}

      {phoneNumbers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Number Usage</CardTitle>
            <CardDescription>Monthly call volume for your phone numbers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full rounded-md bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Call volume chart will appear here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
