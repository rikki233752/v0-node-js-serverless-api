"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart, PieChart, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Define types for our data
interface Call {
  id: string
  to?: string
  from_number?: string
  to_number?: string
  duration: number
  status: string
  start_time: string
  pathway_name?: string
}

interface CallAnalysis {
  transcript: string
  summary: string
  sentiment: string
  keywords: string[]
  intent: string
  duration: string
  callerId: string
  date: string
}

export default function AnalyticsPage() {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [selectedTimeframe, setSelectedTimeframe] = useState("week")
  const [selectedCall, setSelectedCall] = useState<string | null>(null)
  const [callAnalytics, setCallAnalytics] = useState<CallAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [calls, setCalls] = useState<Call[]>([])
  const [phoneNumber, setPhoneNumber] = useState("+19787836427") // Default to the purchased number
  const [isLoadingCalls, setIsLoadingCalls] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch calls for the selected phone number
  useEffect(() => {
    async function fetchCalls() {
      setIsLoadingCalls(true)
      setError(null)

      try {
        const response = await fetch(`/api/bland-ai/calls?phoneNumber=${encodeURIComponent(phoneNumber)}`)

        if (!response.ok) {
          throw new Error("Failed to fetch calls")
        }

        const data = await response.json()
        setCalls(data)
      } catch (err) {
        console.error("Error fetching calls:", err)
        setError("Failed to load calls. Please try again.")
      } finally {
        setIsLoadingCalls(false)
      }
    }

    fetchCalls()
  }, [phoneNumber])

  // Fetch call analytics when a call is selected
  useEffect(() => {
    if (selectedCall) {
      setIsLoading(true)
      setCallAnalytics(null)

      async function fetchCallAnalytics() {
        try {
          const response = await fetch(`/api/bland-ai/calls/${selectedCall}/analyze`, {
            method: "POST",
          })

          if (!response.ok) {
            throw new Error("Failed to analyze call")
          }

          const data = await response.json()
          setCallAnalytics(data)
        } catch (err) {
          console.error("Error analyzing call:", err)
          setError("Failed to analyze call. Please try again.")
        } finally {
          setIsLoading(false)
        }
      }

      fetchCallAnalytics()
    }
  }, [selectedCall])

  // Calculate metrics for the overview tab
  const totalCalls = calls.length
  const successfulCalls = calls.filter((call) => call.status === "completed").length
  const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

  // Calculate average call duration
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0)
  const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Group calls by pathway
  const pathwayCalls = calls.reduce((acc: Record<string, number>, call) => {
    const pathwayName = call.pathway_name || "Unknown"
    acc[pathwayName] = (acc[pathwayName] || 0) + 1
    return acc
  }, {})

  // Calculate pathway success rates
  const pathwaySuccessRates = Object.entries(
    calls.reduce((acc: Record<string, { total: number; success: number }>, call) => {
      const pathwayName = call.pathway_name || "Unknown"
      if (!acc[pathwayName]) {
        acc[pathwayName] = { total: 0, success: 0 }
      }
      acc[pathwayName].total += 1
      if (call.status === "completed") {
        acc[pathwayName].success += 1
      }
      return acc
    }, {}),
  ).map(([name, data]) => ({
    name,
    total: data.total,
    success: data.success,
    rate: data.total > 0 ? (data.success / data.total) * 100 : 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
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
          <Button>Export Data</Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">
            <BarChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="calls">
            <LineChart className="h-4 w-4 mr-2" />
            Call Analytics
          </TabsTrigger>
          <TabsTrigger value="pathways">
            <PieChart className="h-4 w-4 mr-2" />
            Pathway Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalCalls}</div>
                <p className="text-xs text-muted-foreground">For {phoneNumber}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{successRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Completed calls</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Call Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatDuration(avgDuration)}</div>
                <p className="text-xs text-muted-foreground">Minutes:Seconds</p>
              </CardContent>
            </Card>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">{error}</div>}

          {isLoadingCalls ? (
            <Card>
              <CardContent className="flex items-center justify-center h-[300px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </CardContent>
            </Card>
          ) : calls.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-[300px] text-center">
                <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No call data available</h3>
                <p className="text-muted-foreground mt-2">There are no calls recorded for this phone number yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Call Volume</CardTitle>
                <CardDescription>Number of calls over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      Call volume chart will be displayed here based on real data.
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                      Connect to a charting library to visualize the {calls.length} calls.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>Select a call to view detailed analytics</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">{error}</div>}

              {isLoadingCalls ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : calls.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                  <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No call data available</h3>
                  <p className="text-muted-foreground mt-2">There are no calls recorded for this phone number yet.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="py-2 px-4 text-left font-medium">Call ID</th>
                        <th className="py-2 px-4 text-left font-medium">From</th>
                        <th className="py-2 px-4 text-left font-medium">To</th>
                        <th className="py-2 px-4 text-left font-medium">Duration</th>
                        <th className="py-2 px-4 text-left font-medium">Status</th>
                        <th className="py-2 px-4 text-left font-medium">Date</th>
                        <th className="py-2 px-4 text-left font-medium">Pathway</th>
                        <th className="py-2 px-4 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calls.map((call) => (
                        <tr
                          key={call.id}
                          className={`border-b hover:bg-muted/50 cursor-pointer ${selectedCall === call.id ? "bg-muted/50" : ""}`}
                          onClick={() => setSelectedCall(call.id)}
                        >
                          <td className="py-2 px-4">{call.id}</td>
                          <td className="py-2 px-4">{call.from_number || "-"}</td>
                          <td className="py-2 px-4">{call.to || call.to_number || "-"}</td>
                          <td className="py-2 px-4">{formatDuration(call.duration || 0)}</td>
                          <td className="py-2 px-4">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                call.status === "completed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {call.status ? call.status.charAt(0).toUpperCase() + call.status.slice(1) : "Unknown"}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            {call.start_time ? new Date(call.start_time).toLocaleDateString() : "-"}
                          </td>
                          <td className="py-2 px-4">{call.pathway_name || "Unknown"}</td>
                          <td className="py-2 px-4">
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedCall && (
            <Card>
              <CardHeader>
                <CardTitle>Call Analysis</CardTitle>
                <CardDescription>Detailed analysis for call {selectedCall}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : callAnalytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-md p-4">
                        <h3 className="font-medium mb-2">Call Details</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span>{callAnalytics.duration || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Caller:</span>
                            <span>{callAnalytics.callerId || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{callAnalytics.date || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Intent:</span>
                            <span>{callAnalytics.intent || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sentiment:</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                callAnalytics.sentiment === "Positive"
                                  ? "bg-green-100 text-green-800"
                                  : callAnalytics.sentiment === "Negative"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {callAnalytics.sentiment || "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-md p-4 md:col-span-2">
                        <h3 className="font-medium mb-2">Summary</h3>
                        <p className="text-sm">{callAnalytics.summary || "No summary available"}</p>
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {callAnalytics.keywords && callAnalytics.keywords.length > 0 ? (
                          callAnalytics.keywords.map((keyword, i) => (
                            <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs">
                              {keyword}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No keywords available</p>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Transcript</h3>
                      <pre className="text-sm whitespace-pre-wrap bg-muted/20 p-4 rounded-md">
                        {callAnalytics.transcript || "No transcript available"}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[100px]">
                    <p className="text-muted-foreground">Select a call to view analytics</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pathways" className="space-y-6">
          {isLoadingCalls ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : calls.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-[300px] text-center">
                <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No pathway data available</h3>
                <p className="text-muted-foreground mt-2">There are no calls recorded for this phone number yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pathway Performance</CardTitle>
                    <CardDescription>Success rate by pathway</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
                      <div className="space-y-4 w-full px-8">
                        {pathwaySuccessRates.map((pathway, index) => (
                          <div key={index}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">{pathway.name}</span>
                              <span className="text-sm font-medium">{pathway.rate.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2.5">
                              <div
                                className="bg-primary h-2.5 rounded-full"
                                style={{ width: `${pathway.rate}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                        {pathwaySuccessRates.length === 0 && (
                          <p className="text-center text-muted-foreground">No pathway data available</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Call Distribution</CardTitle>
                    <CardDescription>Calls by pathway</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
                      <div className="text-center">
                        <p className="text-muted-foreground">
                          Call distribution chart will be displayed here based on real data.
                        </p>
                        <p className="text-muted-foreground text-sm mt-2">
                          Connect to a charting library to visualize the pathway distribution.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 justify-center mt-4">
                      {Object.entries(pathwayCalls).map(([name, count], index) => {
                        const percentage = (count / totalCalls) * 100
                        return (
                          <div key={index} className="flex items-center">
                            <div
                              className={`w-3 h-3 bg-primary rounded-full mr-2`}
                              style={{ opacity: 0.5 + index * 0.1 }}
                            ></div>
                            <span className="text-sm">
                              {name} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Pathway Metrics</CardTitle>
                  <CardDescription>Detailed metrics for each pathway</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2 px-4 text-left font-medium">Pathway</th>
                          <th className="py-2 px-4 text-left font-medium">Total Calls</th>
                          <th className="py-2 px-4 text-left font-medium">Success Rate</th>
                          <th className="py-2 px-4 text-left font-medium">Avg. Duration</th>
                          <th className="py-2 px-4 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pathwaySuccessRates.map((pathway, index) => {
                          // Calculate average duration for this pathway
                          const pathwayCalls = calls.filter((call) => (call.pathway_name || "Unknown") === pathway.name)
                          const totalDuration = pathwayCalls.reduce((sum, call) => sum + (call.duration || 0), 0)
                          const avgDuration = pathwayCalls.length > 0 ? totalDuration / pathwayCalls.length : 0

                          return (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-4">{pathway.name}</td>
                              <td className="py-2 px-4">{pathway.total}</td>
                              <td className="py-2 px-4">{pathway.rate.toFixed(1)}%</td>
                              <td className="py-2 px-4">{formatDuration(avgDuration)}</td>
                              <td className="py-2 px-4">
                                <Button variant="ghost" size="sm">
                                  Details
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                        {pathwaySuccessRates.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                              No pathway data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
