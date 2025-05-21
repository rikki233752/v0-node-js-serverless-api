"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, CreditCard, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Mock subscription data - in a real app, this would come from your database
const mockSubscriptions = [
  {
    id: "sub_1234567890",
    phoneNumber: "+1 (978) 783-6427",
    status: "active",
    createdAt: "2025-04-10",
    nextBillingDate: "2025-05-10",
    amount: "$5.00",
    plan: "Standard",
  },
]

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // In a real app, you would fetch the subscriptions from your API
    // For now, we'll just use the mock data
    const fetchSubscriptions = async () => {
      try {
        setLoading(true)
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setSubscriptions(mockSubscriptions)
      } catch (err) {
        console.error("Error fetching subscriptions:", err)
        setError("Failed to load subscription data")
      } finally {
        setLoading(false)
      }
    }

    fetchSubscriptions()
  }, [])

  const handleCancelSubscription = async (subscriptionId: string) => {
    // In a real app, you would call your API to cancel the subscription
    // For now, we'll just simulate it
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update the subscription status
      setSubscriptions((prev) =>
        prev.map((sub) => (sub.id === subscriptionId ? { ...sub, status: "cancelling" } : sub)),
      )

      // After a delay, update to cancelled
      setTimeout(() => {
        setSubscriptions((prev) =>
          prev.map((sub) => (sub.id === subscriptionId ? { ...sub, status: "cancelled" } : sub)),
        )
      }, 2000)
    } catch (err) {
      console.error("Error cancelling subscription:", err)
      setError("Failed to cancel subscription")
    }
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Subscriptions</h1>
          <p className="text-muted-foreground">Manage your phone number subscriptions and billing information</p>
        </div>
        <Button className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Update Payment Method
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>Your current phone number subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You don't have any active subscriptions</p>
              <Button className="mt-4" onClick={() => (window.location.href = "/dashboard/phone-numbers/purchase")}>
                Purchase a Phone Number
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Billing Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">{subscription.phoneNumber}</TableCell>
                    <TableCell>{subscription.plan}</TableCell>
                    <TableCell>{subscription.amount}/month</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          subscription.status === "active"
                            ? "default"
                            : subscription.status === "cancelling"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {subscription.status === "active"
                          ? "Active"
                          : subscription.status === "cancelling"
                            ? "Cancelling"
                            : "Cancelled"}
                      </Badge>
                    </TableCell>
                    <TableCell>{subscription.status === "active" ? subscription.nextBillingDate : "N/A"}</TableCell>
                    <TableCell>
                      {subscription.status === "active" ? (
                        <Button variant="outline" size="sm" onClick={() => handleCancelSubscription(subscription.id)}>
                          Cancel Subscription
                        </Button>
                      ) : subscription.status === "cancelled" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => (window.location.href = "/dashboard/phone-numbers/purchase")}
                        >
                          Resubscribe
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Processing
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">Subscriptions are billed monthly and will automatically renew</p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your recent billing transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2025-04-10</TableCell>
                <TableCell>Phone Number Subscription - Initial Payment</TableCell>
                <TableCell>$5.00</TableCell>
                <TableCell>
                  <Badge variant="default">Paid</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="link" size="sm">
                    View Receipt
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
