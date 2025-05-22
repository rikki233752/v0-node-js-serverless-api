"use client"

// Add this near the top of the file, after "use client"
import type React from "react"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface PixelConfig {
  id: string
  pixelId: string
  accessToken: string
  name?: string
  clientId?: string
  createdAt: string
  updatedAt: string
}

interface EventLog {
  id: string
  pixelId: string
  eventName: string
  status: string
  response?: string
  error?: string
  createdAt: string
}

export default function AdminDashboard() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)

  // Pixel configuration state
  const [pixels, setPixels] = useState<PixelConfig[]>([])
  const [pixelsLoading, setPixelsLoading] = useState(false)
  const [pixelsError, setPixelsError] = useState<string | null>(null)

  // New pixel form state
  const [newPixel, setNewPixel] = useState({
    name: "",
    pixelId: "",
    accessToken: "",
    clientId: "",
  })

  // Event logs state
  const [logs, setLogs] = useState<EventLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [selectedPixelId, setSelectedPixelId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Active tab state
  const [activeTab, setActiveTab] = useState("pixels")

  useEffect(() => {
    // Check if authenticated
    const authHeader = sessionStorage.getItem("authHeader")
    if (!authHeader) {
      // Redirect to login if not authenticated
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
    }
  }, [])

  // Check for existing authentication on load
  useEffect(() => {
    const authHeader = sessionStorage.getItem("authHeader")
    if (authHeader) {
      setIsAuthenticated(true)
      fetchPixels(authHeader)
    }
  }, [])

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)

    // Create basic auth header
    const authHeader = "Basic " + btoa(`${username}:${password}`)

    try {
      const response = await fetch("/api/admin/pixels", {
        headers: {
          Authorization: authHeader,
        },
      })

      if (response.ok) {
        setIsAuthenticated(true)
        sessionStorage.setItem("authHeader", authHeader)
        fetchPixels(authHeader)
      } else {
        setAuthError("Invalid credentials")
      }
    } catch (err) {
      setAuthError("Login failed. Please try again.")
    }
  }

  // Fetch pixel configurations
  const fetchPixels = async (authHeader?: string) => {
    try {
      setPixelsLoading(true)
      const auth = authHeader || sessionStorage.getItem("authHeader") || ""

      const response = await fetch("/api/admin/pixels", {
        headers: {
          Authorization: auth,
        },
      })

      if (response.status === 401) {
        setIsAuthenticated(false)
        sessionStorage.removeItem("authHeader")
        return
      }

      const data = await response.json()

      if (data.success) {
        setPixels(data.pixels)
        setPixelsError(null)
      } else {
        setPixelsError(data.error || "Failed to fetch pixel configurations")
      }
    } catch (err) {
      setPixelsError("An error occurred while fetching pixel configurations")
    } finally {
      setPixelsLoading(false)
    }
  }

  // Fetch event logs
  const fetchLogs = async (pixelId?: string, pageNum = 1) => {
    try {
      setLogsLoading(true)
      const auth = sessionStorage.getItem("authHeader") || ""

      let url = `/api/admin/logs?page=${pageNum}&limit=10`
      if (pixelId) {
        url += `&pixelId=${pixelId}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: auth,
        },
      })

      if (response.status === 401) {
        setIsAuthenticated(false)
        sessionStorage.removeItem("authHeader")
        return
      }

      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setTotalPages(data.pagination.pages)
        setPage(data.pagination.page)
        setLogsError(null)
      } else {
        setLogsError(data.error || "Failed to fetch event logs")
      }
    } catch (err) {
      setLogsError("An error occurred while fetching event logs")
    } finally {
      setLogsLoading(false)
    }
  }

  // Handle input change for new pixel form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewPixel((prev) => ({ ...prev, [name]: value }))
  }

  // Add new pixel configuration
  const handleAddPixel = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newPixel.pixelId || !newPixel.accessToken) {
      setPixelsError("Pixel ID and Access Token are required")
      return
    }

    try {
      const auth = sessionStorage.getItem("authHeader") || ""

      const response = await fetch("/api/admin/pixels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        body: JSON.stringify(newPixel),
      })

      if (response.status === 401) {
        setIsAuthenticated(false)
        sessionStorage.removeItem("authHeader")
        return
      }

      const data = await response.json()

      if (data.success) {
        // Reset form and refresh list
        setNewPixel({
          name: "",
          pixelId: "",
          accessToken: "",
          clientId: "",
        })
        fetchPixels()
      } else {
        setPixelsError(data.error || "Failed to add pixel configuration")
      }
    } catch (err) {
      setPixelsError("An error occurred while adding the pixel configuration")
    }
  }

  // Delete pixel configuration
  const handleDeletePixel = async (pixelId: string) => {
    if (!confirm("Are you sure you want to delete this pixel configuration?")) {
      return
    }

    try {
      const auth = sessionStorage.getItem("authHeader") || ""

      const response = await fetch(`/api/admin/pixels?pixelId=${pixelId}`, {
        method: "DELETE",
        headers: {
          Authorization: auth,
        },
      })

      if (response.status === 401) {
        setIsAuthenticated(false)
        sessionStorage.removeItem("authHeader")
        return
      }

      const data = await response.json()

      if (data.success) {
        fetchPixels()
      } else {
        setPixelsError(data.error || "Failed to delete pixel configuration")
      }
    } catch (err) {
      setPixelsError("An error occurred while deleting the pixel configuration")
    }
  }

  // Handle view logs for a specific pixel
  const handleViewLogs = (pixelId: string) => {
    setSelectedPixelId(pixelId)
    setActiveTab("logs") // Switch to logs tab
    fetchLogs(pixelId)
  }

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem("authHeader")
  }

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Facebook Pixel Gateway Admin</CardTitle>
            <CardDescription>Enter your credentials to access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main dashboard
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Facebook Pixel Gateway Admin</h1>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pixels">Pixel Configurations</TabsTrigger>
          <TabsTrigger
            value="logs"
            onClick={() => {
              // Fetch all logs when switching to logs tab
              fetchLogs(selectedPixelId || undefined)
            }}
          >
            Event Logs {selectedPixelId && `(Pixel: ${selectedPixelId})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pixels">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add New Pixel Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Pixel</CardTitle>
                <CardDescription>Configure a new Facebook Pixel</CardDescription>
              </CardHeader>
              <CardContent>
                {pixelsError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{pixelsError}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleAddPixel} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (Optional)</Label>
                    <Input
                      id="name"
                      name="name"
                      value={newPixel.name}
                      onChange={handleInputChange}
                      placeholder="Client A - Main Pixel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID (Optional)</Label>
                    <Input
                      id="clientId"
                      name="clientId"
                      value={newPixel.clientId}
                      onChange={handleInputChange}
                      placeholder="client-a"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pixelId">Pixel ID *</Label>
                    <Input
                      id="pixelId"
                      name="pixelId"
                      value={newPixel.pixelId}
                      onChange={handleInputChange}
                      placeholder="123456789012345"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Access Token *</Label>
                    <Input
                      id="accessToken"
                      name="accessToken"
                      value={newPixel.accessToken}
                      onChange={handleInputChange}
                      placeholder="EAABsbCc1234567890..."
                      type="password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Add Pixel
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Pixel Configurations List */}
            <Card>
              <CardHeader>
                <CardTitle>Configured Pixels</CardTitle>
                <CardDescription>Manage your Facebook Pixel configurations</CardDescription>
              </CardHeader>
              <CardContent>
                {pixelsLoading ? (
                  <div className="text-center py-4">Loading pixel configurations...</div>
                ) : pixels.length === 0 ? (
                  <div className="text-center py-4">No pixel configurations found. Add one to get started.</div>
                ) : (
                  <div className="space-y-4">
                    {pixels.map((pixel) => (
                      <div key={pixel.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{pixel.name || `Pixel ${pixel.pixelId}`}</h3>
                            <p className="text-sm text-gray-500">ID: {pixel.pixelId}</p>
                            {pixel.clientId && <p className="text-sm text-gray-500">Client: {pixel.clientId}</p>}
                            <p className="text-sm text-gray-500">Token: {pixel.accessToken}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Added: {new Date(pixel.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleViewLogs(pixel.pixelId)}
                            >
                              View Logs
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full"
                              onClick={() => handleDeletePixel(pixel.pixelId)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Event Logs
                  {selectedPixelId && ` for Pixel ${selectedPixelId}`}
                </CardTitle>
                <div className="flex gap-2">
                  {selectedPixelId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPixelId(null)
                        fetchLogs()
                      }}
                    >
                      Show All Pixels
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => fetchLogs(selectedPixelId || undefined)}>
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-4">Loading event logs...</div>
              ) : logsError ? (
                <Alert variant="destructive">
                  <AlertDescription>{logsError}</AlertDescription>
                </Alert>
              ) : logs.length === 0 ? (
                <div className="text-center py-4">
                  No event logs found.
                  {selectedPixelId ? (
                    <div className="mt-2">
                      <p>Try sending a test event to see logs for this pixel.</p>
                      <div className="mt-4">
                        <Button
                          onClick={() => (window.location.href = `/test-pixel?pixelId=${selectedPixelId}`)}
                          variant="outline"
                        >
                          Send Test Event
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p>Select a pixel to view its logs or send test events.</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Pixel ID</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                            <TableCell>{log.pixelId}</TableCell>
                            <TableCell>{log.eventName}</TableCell>
                            <TableCell>
                              <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {log.error ? (
                                <details>
                                  <summary className="cursor-pointer text-sm text-red-500">View Error</summary>
                                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-x-auto max-w-xs">
                                    {log.error}
                                  </pre>
                                </details>
                              ) : log.response ? (
                                <details>
                                  <summary className="cursor-pointer text-sm text-blue-500">View Response</summary>
                                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-x-auto max-w-xs">
                                    {log.response}
                                  </pre>
                                </details>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => fetchLogs(selectedPixelId || undefined, page - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => fetchLogs(selectedPixelId || undefined, page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
