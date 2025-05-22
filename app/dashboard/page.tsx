"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Phone, PhoneCall, Plus, Users } from "lucide-react"
import Link from "next/link"
import { fetchCallSummary, fetchRecentCallFlows, type CallSummary } from "@/services/call-data-service"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { redirect } from "next/navigation"
import { getUserSession } from "@/lib/auth-utils"
import { supabase } from "@/lib/supabase"

interface RecentCallFlow {
  id: string
  name: string
  daysAgo: number
}

export default async function DashboardPage() {
  // Get the current user session
  const session = await getUserSession()

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/login")
  }

  // Get user data
  const { data: userData } = await supabase.from("users").select("*").eq("id", session.user.id).single()

  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [callSummary, setCallSummary] = useState<CallSummary>({
    totalCalls: 0,
    activeFlows: 0,
    conversionRate: 0,
    callsThisMonth: 0,
    callsLastMonth: 0,
    conversionRateChange: 0,
    activeFlowsChange: 0,
  })
  const [recentFlows, setRecentFlows] = useState<RecentCallFlow[]>([])
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("")
  const [dateRange, setDateRange] = useState<string>("month")

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch call summary data
        const summary = await fetchCallSummary(selectedPhoneNumber, dateRange)
        setCallSummary(summary)

        // Fetch recent call flows
        const flows = await fetchRecentCallFlows()
        setRecentFlows(flows)
      } catch (err) {
        console.error("Error loading dashboard data:", err)
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [selectedPhoneNumber, dateRange])

  // Format percentage with + sign for positive values
  const formatPercentageChange = (value: number) => {
    const sign = value > 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {userData?.name || session.user.email}!</h2>
          <p className="text-muted-foreground">Here's an overview of your AI call automation performance</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/dashboard/call-flows/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Call Flow
            </Button>
          </Link>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">{error}</div>}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{callSummary.totalCalls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {callSummary.callsThisMonth > callSummary.callsLastMonth
                  ? `+${callSummary.callsThisMonth - callSummary.callsLastMonth} from last month`
                  : callSummary.callsLastMonth > callSummary.callsThisMonth
                    ? `-${callSummary.callsLastMonth - callSummary.callsThisMonth} from last month`
                    : "No change from last month"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Flows</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{callSummary.activeFlows}</div>
              <p className="text-xs text-muted-foreground">
                {formatPercentageChange(callSummary.activeFlowsChange)} from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{callSummary.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {formatPercentageChange(callSummary.conversionRateChange)} from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">+1 seat available</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Call Performance</CardTitle>
            <CardDescription>Call volume and success rate over time</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
              <div className="h-[300px] w-full bg-gray-100 rounded-md flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : callSummary.totalCalls === 0 ? (
              <div className="h-[300px] w-full bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground">No call data available</p>
                  <p className="text-muted-foreground text-sm mt-2">Start making calls to see performance metrics</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px] w-full bg-gray-100 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Call performance chart will appear here based on {callSummary.totalCalls} calls
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Connect to a charting library to visualize the data
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Call Flows</CardTitle>
            <CardDescription>Your recently created or modified call flows</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentFlows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="font-medium">No call flows yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first call flow to get started</p>
                <Link href="/dashboard/call-flows/new" className="mt-4">
                  <Button size="sm">Create Call Flow</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentFlows.map((flow, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{flow.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Modified {flow.daysAgo} day{flow.daysAgo !== 1 ? "s" : ""} ago
                      </p>
                    </div>
                    <Link href={`/dashboard/call-flows/${flow.id}`}>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
